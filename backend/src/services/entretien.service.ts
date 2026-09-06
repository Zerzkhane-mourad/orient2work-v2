/**
 * Entretiens (§10) et test de validation général (§5.3).
 *
 * Répartition des droits : l'entreprise propose et replanifie, le jeune accepte
 * ou refuse. Chaque partie ne voit que ses propres entretiens.
 */
import {
  CandidatureStatus,
  EntretienStatus,
  EntrepriseStatus,
  JeuneStatus,
  Role,
} from "@prisma/client";
import { doitAvancerVers } from "../domain/candidatures.js";
import { QUIZ_PASS_SCORE } from "../domain/enums.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { scoreQuiz } from "../domain/quiz.js";
import { buildMeta, toSkipTake } from "../lib/pagination.js";
import { stripTags } from "../lib/sanitize.js";
import { isAdmin, type Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/entretien.repository.js";
import * as jeuneRepository from "../repositories/jeune.repository.js";
import * as entrepriseRepository from "../repositories/entreprise.repository.js";
import * as candidatureRepository from "../repositories/candidature.repository.js";
import { toEntretienDto, type EntretienDto } from "../mappers/entretien.mapper.js";
import { notify } from "./notification.service.js";
import type { ApiMeta } from "../lib/http.js";
import type {
  CreateEntretienInput,
  ListEntretiensInput,
  RespondEntretienInput,
  SubmitQuizInput,
  UpdateEntretienInput,
} from "../validators/entretien.validator.js";

/**
 * Périmètre déduit du RÔLE, jamais d'un paramètre client : un jeune ne peut pas
 * demander les entretiens d'un autre en passant un `jeuneId`.
 */
function scopeFor(actor: Actor): { jeuneId?: string; entrepriseId?: string } {
  if (actor.role === Role.JEUNE) return { jeuneId: actor.profileId ?? "" };
  if (actor.role === Role.ENTREPRISE) return { entrepriseId: actor.profileId ?? "" };
  return {};
}

export async function list(
  actor: Actor,
  input: ListEntretiensInput,
): Promise<{ items: EntretienDto[]; meta: ApiMeta }> {
  const where = repository.buildEntretienWhere({
    ...scopeFor(actor),
    status: input.status,
    from: input.from,
    to: input.to,
    ...(input.spontanee !== undefined ? { spontanee: input.spontanee } : {}),
  });

  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listEntretiens(where, skip, take, input.ordre);
  return { items: rows.map(toEntretienDto), meta: buildMeta(input, total) };
}

/**
 * Répartition par statut sur le périmètre de l'appelant.
 *
 * Les écrans d'entretiens listent chaque statut dans sa propre section paginée ;
 * les compteurs d'en-tête portent, eux, sur la totalité.
 */
export function countByStatus(actor: Actor): Promise<Record<string, number>> {
  return repository.countEntretiensByStatus(repository.buildEntretienWhere(scopeFor(actor)));
}

export async function create(
  actor: Actor,
  entrepriseId: string,
  input: CreateEntretienInput,
): Promise<EntretienDto> {
  if (!isAdmin(actor) && actor.profileId !== entrepriseId) {
    throw new ForbiddenError("Vous ne pouvez planifier des entretiens qu'en votre nom.");
  }

  const entreprise = await entrepriseRepository.findEntrepriseById(entrepriseId);
  if (!entreprise) throw new NotFoundError("Entreprise introuvable.");
  if (!isAdmin(actor) && entreprise.status !== EntrepriseStatus.valide) {
    throw new ForbiddenError("Votre compte entreprise doit être validé par OMB.");
  }

  const jeune = await jeuneRepository.findJeuneById(input.jeuneId);
  if (!jeune || jeune.status !== JeuneStatus.valide) {
    throw new NotFoundError("Candidat introuvable.");
  }

  const entretien = await repository.createEntretien({
    jeuneId: input.jeuneId,
    entrepriseId,
    offreId: input.offreId ?? null,
    candidatureId: input.candidatureId ?? null,
    offreTitre: input.offreTitre,
    date: input.date,
    heure: input.heure,
    lienReunion: input.lienReunion ?? null,
    commentaire: input.commentaire ? stripTags(input.commentaire) : null,
    status: EntretienStatus.en_attente,
  });

  /*
   * La candidature suit l'entretien.
   *
   * Proposer un entretien EST la décision de passer à l'étape « entretien ».
   * Sans cette synchronisation, le recruteur planifiait un rendez-vous depuis
   * l'écran des candidatures sans jamais appeler `updateStatus` : la
   * candidature restait sur « envoyée », et le candidat lisait « En attente »
   * alors que son entretien était confirmé.
   *
   * `doitAvancerVers` interdit tout retour en arrière : une candidature déjà
   * acceptée, refusée ou retirée n'est pas touchée.
   */
  if (input.candidatureId) {
    const candidature = await candidatureRepository.findCandidatureById(input.candidatureId);
    if (candidature && doitAvancerVers(candidature.status, CandidatureStatus.entretien)) {
      await candidatureRepository.updateCandidature(candidature.id, {
        status: CandidatureStatus.entretien,
        // Un recruteur qui planifie a forcément consulté le dossier.
        ...(candidature.vueLe ? {} : { vueLe: new Date() }),
      });
    }
  }

  await notify({
    userId: jeune.userId,
    icon: "event",
    title: `Demande d'entretien — ${entreprise.nom}`,
    detail: `${input.offreTitre} · ${input.date.toISOString().split("T")[0]} à ${input.heure}.`,
    href: "/espace-jeune/entretiens",
    accent: true,
  });

  return toEntretienDto(entretien);
}

/** Réponse du jeune : c'est la seule transition qu'il contrôle. */
export async function respond(
  actor: Actor,
  id: string,
  input: RespondEntretienInput,
): Promise<EntretienDto> {
  const entretien = await repository.findEntretienById(id);
  if (!entretien) throw new NotFoundError("Entretien introuvable.");

  /*
   * Répond celui qui n'a PAS pris l'initiative.
   *
   *  • entretien proposé par l'entreprise → le candidat accepte ou refuse ;
   *  • candidature spontanée (`spontanee`) → c'est le jeune qui a réservé un
   *    créneau, l'entreprise répond.
   *
   * Sans cette distinction, l'entreprise ne pouvait pas traiter les demandes
   * spontanées — la route exigeait un compte jeune — et le candidat pouvait
   * « accepter » sa propre demande, ce qui la faisait passer pour confirmée
   * alors que l'entreprise n'avait rien vu.
   */
  const repondeur = entretien.spontanee ? entretien.entrepriseId : entretien.jeuneId;
  if (!isAdmin(actor) && actor.profileId !== repondeur) {
    throw new ForbiddenError(
      entretien.spontanee
        ? "Seule l'entreprise sollicitée peut répondre à une candidature spontanée."
        : "Seul le candidat concerné peut répondre à cette demande.",
    );
  }
  if (entretien.status !== EntretienStatus.en_attente) {
    throw new ForbiddenError("Cet entretien a déjà été traité.");
  }

  /*
   * Le lien de réunion est fourni par l'ORGANISATEUR, jamais par l'invité.
   *
   * Ici, le répondeur n'est l'entreprise que sur une candidature spontanée.
   * Sur un entretien proposé par l'entreprise, c'est le candidat qui répond :
   * le laisser poser un lien ferait basculer le rendez-vous dans une salle
   * qu'il contrôle, et le recruteur recevrait cette adresse dans son rappel
   * sans l'avoir choisie.
   */
  if (input.lienReunion && !entretien.spontanee) {
    throw new ForbiddenError("Seule l'entreprise organisatrice fournit le lien de réunion.");
  }

  const updated = await repository.updateEntretien(id, {
    status: input.status,
    ...(input.lienReunion ? { lienReunion: input.lienReunion } : {}),
    ...(input.commentaire ? { commentaire: stripTags(input.commentaire) } : {}),
  });

  const accepte = input.status === EntretienStatus.accepte;

  /* La notification part vers l'AUTRE partie : celle qui attendait la réponse. */
  if (entretien.spontanee) {
    await notify({
      userId: entretien.jeune.userId,
      icon: accepte ? "event_available" : "event_busy",
      title: accepte
        ? `${entretien.entreprise.nom} a accepté votre demande`
        : `${entretien.entreprise.nom} a décliné votre demande`,
      // Le lien est annoncé dès la notification : le candidat sait tout de
      // suite si l'échange est en visio ou s'il doit attendre des précisions.
      detail: `${entretien.date.toISOString().split("T")[0]} à ${entretien.heure}.${
        accepte && input.lienReunion ? " Lien de visio disponible." : ""
      }`,
      href: "/espace-jeune/entretiens",
      accent: accepte,
    });
  } else {
    const entreprise = await entrepriseRepository.findEntrepriseById(entretien.entrepriseId);
    if (entreprise) {
      await notify({
        userId: entreprise.userId,
        icon: accepte ? "event_available" : "event_busy",
        title: `Entretien ${accepte ? "accepté" : "refusé"} par ${entretien.jeune.prenom} ${entretien.jeune.nom}`,
        detail: entretien.offreTitre,
        href: "/espace-entreprise/entretiens",
        accent: accepte,
      });
    }
  }

  return toEntretienDto(updated);
}

/** Replanification ou annulation — réservée à l'entreprise organisatrice. */
export async function update(
  actor: Actor,
  id: string,
  input: UpdateEntretienInput,
): Promise<EntretienDto> {
  const entretien = await repository.findEntretienById(id);
  if (!entretien) throw new NotFoundError("Entretien introuvable.");

  if (!isAdmin(actor) && actor.profileId !== entretien.entrepriseId) {
    throw new ForbiddenError("Seule l'entreprise organisatrice peut modifier cet entretien.");
  }

  // Changer la date remet l'accord du candidat en jeu : le statut repasse en attente.
  const reschedules = input.date !== undefined || input.heure !== undefined;

  const updated = await repository.updateEntretien(id, {
    ...input,
    ...(input.commentaire ? { commentaire: stripTags(input.commentaire) } : {}),
    ...(reschedules && !input.status ? { status: EntretienStatus.en_attente } : {}),
  });

  /*
   * Le titre dit ce qui a VRAIMENT changé.
   *
   * Poser un lien de visio après coup — le cas courant sur une candidature
   * spontanée acceptée — annonçait « Entretien replanifié » : le candidat
   * croyait son créneau déplacé et revenait vérifier une date inchangée.
   */
  const jeune = await jeuneRepository.findJeuneById(entretien.jeuneId);
  if (jeune) {
    const annule = input.status === EntretienStatus.annule;
    const lienSeul = !annule && !reschedules && input.lienReunion !== undefined;

    await notify({
      userId: jeune.userId,
      icon: annule ? "event_busy" : lienSeul ? "video_call" : "edit_calendar",
      title: annule
        ? "Entretien annulé"
        : lienSeul
          ? `Lien de connexion ajouté — ${entretien.entreprise.nom}`
          : "Entretien replanifié",
      detail: entretien.offreTitre,
      href: "/espace-jeune/entretiens",
    });
  }

  return toEntretienDto(updated);
}

// ── Test de validation général (§5.3) ────────────────────────────────────────

export interface QuizPayload {
  /** Le test servi : le candidat sait ce qu'il passe, et sur quelle filière. */
  test: { id: string; titre: string; description: string; filiere: string | null };
  questions: Array<{ id: string; enonce: string; type: string; options: string[] }>;
}

/** Questions SANS les bonnes réponses : la correction reste côté serveur. */
export async function getQuiz(actor: Actor, filiereId?: string): Promise<QuizPayload> {
  if (actor.role !== Role.JEUNE || !actor.profileId) {
    throw new ForbiddenError("Test réservé aux comptes jeunes.");
  }

  const jeune = await jeuneRepository.findJeuneById(actor.profileId);
  if (!jeune) throw new NotFoundError("Profil introuvable.");

  // À défaut de filière demandée, celle du profil. Le dépôt retombe sur le test
  // commun quand la filière n'a pas le sien.
  const test = await repository.findTestPourFiliere(filiereId ?? jeune.filiereId);
  if (!test || test.questions.length === 0) {
    throw new NotFoundError("Aucun test disponible pour votre filière.");
  }

  return {
    test: {
      id: test.id,
      titre: test.titre,
      description: test.description,
      filiere: test.filiere?.nom ?? null,
    },
    questions: test.questions.map((question) => ({
      id: question.id,
      enonce: question.enonce,
      type: question.type,
      options: question.options,
    })),
  };
}

export interface QuizSubmission {
  score: number;
  scoreMinimum: number;
  reussi: boolean;
  status: JeuneStatus;
}

export async function submitQuiz(actor: Actor, input: SubmitQuizInput): Promise<QuizSubmission> {
  if (actor.role !== Role.JEUNE || !actor.profileId) {
    throw new ForbiddenError("Test réservé aux comptes jeunes.");
  }
  const jeuneId = actor.profileId;

  const jeune = await jeuneRepository.findJeuneById(jeuneId);
  if (!jeune) throw new NotFoundError("Profil introuvable.");

  /*
   * Le barème porte sur le test COMPLET, jamais sur ce que le client a envoyé.
   *
   * En divisant par le nombre de réponses reçues, il suffisait de ne renvoyer
   * que les questions dont on était sûr : deux bonnes réponses sur vingt
   * questions donnaient 100 %, donc un compte `valide` et l'accès aux
   * candidatures. Le test est rechargé ici exactement comme `getQuiz` le sert,
   * et une question laissée de côté compte pour fausse.
   */
  const test = await repository.findTestPourFiliere(jeune.filiereId);
  if (!test || test.questions.length === 0) {
    throw new NotFoundError("Aucun test disponible pour votre filière.");
  }

  const answers = new Map(input.reponses.map((r) => [r.questionId, r.reponses]));
  const score = scoreQuiz(test.questions, answers);
  const reussi = score >= QUIZ_PASS_SCORE;

  await repository.createQuizAttempt({
    jeuneId,
    score,
    reussi,
    reponses: Object.fromEntries(answers),
  });

  // Le meilleur score fait foi, et le statut suit le résultat.
  const meilleurScore = Math.max(jeune.scoreQuiz ?? 0, score);
  const status = reussi
    ? JeuneStatus.valide
    : jeune.status === JeuneStatus.valide
      ? JeuneStatus.valide
      : JeuneStatus.test_echoue;

  await jeuneRepository.updateJeune(jeuneId, { scoreQuiz: meilleurScore, status });

  await notify({
    userId: jeune.userId,
    icon: reussi ? "verified" : "fact_check",
    title: reussi ? "Test réussi — profil validé" : "Test non validé",
    detail: `Score : ${score}% (minimum requis : ${QUIZ_PASS_SCORE}%).`,
    href: "/espace-jeune/test",
    accent: reussi,
  });

  return { score, scoreMinimum: QUIZ_PASS_SCORE, reussi, status };
}

export async function listAttempts(actor: Actor) {
  if (actor.role !== Role.JEUNE || !actor.profileId) {
    throw new ForbiddenError("Action réservée aux comptes jeunes.");
  }
  const attempts = await repository.listQuizAttempts(actor.profileId);
  return attempts.map((attempt) => ({
    id: attempt.id,
    score: attempt.score,
    reussi: attempt.reussi,
    createdAt: attempt.createdAt.toISOString(),
  }));
}
