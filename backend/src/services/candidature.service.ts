/**
 * Candidatures.
 *
 * Le contrôle de propriété est asymétrique et c'est volontaire :
 *  • le jeune accède à SES candidatures (`candidature.jeuneId`) ;
 *  • l'entreprise accède aux candidatures reçues sur SES offres
 *    (`candidature.offre.entrepriseId`), et c'est elle seule qui fait évoluer
 *    le statut ;
 *  • le jeune ne peut que retirer sa candidature.
 */
import { CandidatureStatus, DocumentType, JeuneStatus, OffreStatus } from "@prisma/client";
import { LIBELLES, transitionRecruteurAutorisee } from "../domain/candidatures.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { buildMeta, toSkipTake } from "../lib/pagination.js";
import { stripTags } from "../lib/sanitize.js";
import { isAdmin, type Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/candidature.repository.js";
import * as offreRepository from "../repositories/offre.repository.js";
import * as jeuneRepository from "../repositories/jeune.repository.js";
import * as documentRepository from "../repositories/document.repository.js";
import * as entrepriseRepository from "../repositories/entreprise.repository.js";
import {
  toCandidatureDto,
  toCandidatureRecruteurDto,
  type CandidatureDto,
  type CandidatureRecruteurDto,
} from "../mappers/candidature.mapper.js";
import { notify } from "./notification.service.js";
import type { ApiMeta } from "../lib/http.js";
import type {
  CreateCandidatureInput,
  ListCandidaturesInput,
  UpdateCandidatureStatusInput,
} from "../validators/candidature.validator.js";

/**
 * CV à joindre à une candidature.
 *
 * Deux chemins, une seule règle — le compte doit posséder un CV :
 *  • un identifiant fourni est VÉRIFIÉ. Sans ce contrôle, connaître l'UUID d'un
 *    document suffirait à joindre le CV de quelqu'un d'autre ;
 *  • aucun identifiant fourni : on prend le dernier CV déposé, ce qui permet de
 *    candidater d'un seul clic une fois le document en place.
 *
 * @throws {ForbiddenError} si le compte n'a aucun CV — la réponse doit dire
 * quoi faire, pas seulement refuser.
 */
async function resolveCvId(ownerId: string, demande?: string): Promise<string> {
  if (demande) {
    const document = await documentRepository.findDocumentById(demande);
    if (!document || document.ownerId !== ownerId || document.type !== DocumentType.CV) {
      throw new NotFoundError("CV introuvable.");
    }
    return document.id;
  }

  // `listDocuments` trie du plus récent au plus ancien : le premier est le CV
  // le plus à jour, celui qu'on veut envoyer par défaut.
  const [documents] = await documentRepository.listDocuments(ownerId, [DocumentType.CV], 0, 1);
  const dernier = documents[0];
  if (!dernier) {
    // Code `FORBIDDEN` volontairement : l'UI affiche le message tel quel, et
    // ajouter un code au type partagé pour un seul cas n'apporterait rien.
    throw new ForbiddenError("Déposez votre CV dans « Mes documents » avant de candidater.");
  }
  return dernier.id;
}

export async function apply(
  actor: Actor,
  jeuneId: string,
  input: CreateCandidatureInput,
): Promise<CandidatureDto> {
  if (!isAdmin(actor) && actor.profileId !== jeuneId) {
    throw new ForbiddenError("Vous ne pouvez candidater qu'en votre nom.");
  }

  const jeune = await jeuneRepository.findJeuneById(jeuneId);
  if (!jeune) throw new NotFoundError("Profil introuvable.");

  // Le parcours impose la validation du test avant de candidater (§5.5).
  if (jeune.status !== JeuneStatus.valide) {
    throw new ForbiddenError(
      "Votre profil doit être validé (test réussi) avant de pouvoir candidater.",
    );
  }

  const offre = await offreRepository.findOffreById(input.offreId);
  if (!offre || offre.status !== OffreStatus.publiee) {
    throw new NotFoundError("Offre introuvable ou non ouverte aux candidatures.");
  }
  if (offre.dateLimite.getTime() < Date.now()) {
    throw new ConflictError("La date limite de candidature est dépassée.");
  }

  const existing = await repository.findExistingCandidature(jeuneId, input.offreId);
  if (existing && existing.status !== CandidatureStatus.retiree) {
    throw new ConflictError("Vous avez déjà candidaté à cette offre.");
  }

  /*
   * Un CV est OBLIGATOIRE (§5.8).
   *
   * Une candidature sans CV n'apportait au recruteur qu'un profil et un message,
   * et le candidat ne s'en rendait compte qu'une fois la réponse reçue. Le
   * dépôt se fait en amont, dans « Mes documents » : la règle porte donc sur ce
   * que le compte possède, pas sur ce que le formulaire envoie.
   */
  const cvId = await resolveCvId(actor.id, input.cvId);

  const candidature = existing
    ? await repository.updateCandidature(existing.id, {
        status: CandidatureStatus.envoyee,
        message: input.message ? stripTags(input.message) : null,
        cv: { connect: { id: cvId } },
        vueLe: null,
      })
    : await repository.createCandidature({
        jeuneId,
        offreId: input.offreId,
        message: input.message ? stripTags(input.message) : null,
        cvId,
      });

  const entreprise = await entrepriseRepository.findEntrepriseById(offre.entrepriseId);
  if (entreprise) {
    await notify({
      userId: entreprise.userId,
      icon: "person_add",
      title: "Nouvelle candidature reçue",
      detail: `${jeune.prenom} ${jeune.nom} a postulé à « ${offre.titre} ».`,
      href: "/espace-entreprise/candidatures",
      accent: true,
    });
  }

  return toCandidatureDto(candidature);
}

/** Candidatures envoyées par le jeune connecté. */
export async function listMine(
  actor: Actor,
  jeuneId: string,
  input: ListCandidaturesInput,
): Promise<{ items: CandidatureDto[]; meta: ApiMeta }> {
  if (!isAdmin(actor) && actor.profileId !== jeuneId) {
    throw new ForbiddenError("Vous ne pouvez consulter que vos propres candidatures.");
  }

  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listCandidatures(
    {
      jeuneId,
      ...(input.status ? { status: { in: input.status } } : {}),
      // Permet de répondre à « ai-je déjà candidaté à cette offre ? » par une
      // requête ciblée, plutôt qu'en rapatriant toute la liste pour la filtrer.
      ...(input.offreId ? { offreId: input.offreId } : {}),
    },
    skip,
    take,
  );
  return { items: rows.map(toCandidatureDto), meta: buildMeta(input, total) };
}

/**
 * Répartition par statut des candidatures du jeune.
 *
 * Les onglets de l'écran « Mes candidatures » affichent des totaux qui portent
 * sur l'ensemble, alors que la liste est paginée : ces compteurs ne peuvent donc
 * plus être déduits de la page affichée.
 */
export async function countMineByStatus(
  actor: Actor,
  jeuneId: string,
): Promise<Record<string, number>> {
  if (!isAdmin(actor) && actor.profileId !== jeuneId) {
    throw new ForbiddenError("Vous ne pouvez consulter que vos propres candidatures.");
  }
  return repository.countCandidaturesByStatus({ jeuneId });
}

/** Candidatures reçues sur les offres de l'entreprise connectée. */
export async function listReceived(
  actor: Actor,
  entrepriseId: string,
  input: ListCandidaturesInput,
): Promise<{ items: CandidatureRecruteurDto[]; meta: ApiMeta }> {
  if (!isAdmin(actor) && actor.profileId !== entrepriseId) {
    throw new ForbiddenError("Vous ne pouvez consulter que les candidatures de vos offres.");
  }

  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listCandidatures(
    {
      // Le filtre par entreprise passe par la relation : impossible de lire les
      // candidatures d'un concurrent en devinant un `offreId`.
      offre: { entrepriseId },
      ...(input.offreId ? { offreId: input.offreId } : {}),
      // Sans filtre explicite, les candidatures retirées sont masquées.
      status: input.status ? { in: input.status } : { not: CandidatureStatus.retiree },
    },
    skip,
    take,
    input.sort,
  );
  return { items: rows.map(toCandidatureRecruteurDto), meta: buildMeta(input, total) };
}

export async function getOne(
  actor: Actor,
  id: string,
): Promise<CandidatureDto | CandidatureRecruteurDto> {
  const candidature = await repository.findCandidatureById(id);
  if (!candidature) throw new NotFoundError("Candidature introuvable.");

  if (isAdmin(actor)) return toCandidatureRecruteurDto(candidature);

  if (actor.profileId === candidature.jeuneId) {
    return toCandidatureDto(candidature);
  }
  if (actor.profileId === candidature.offre.entrepriseId) {
    // Première consultation par le recruteur : trace `vueLe` et prévient le jeune.
    if (candidature.status === CandidatureStatus.envoyee) {
      await repository.updateCandidature(id, {
        status: CandidatureStatus.vue,
        vueLe: new Date(),
      });
    }
    return toCandidatureRecruteurDto(candidature);
  }

  throw new NotFoundError("Candidature introuvable.");
}

export async function updateStatus(
  actor: Actor,
  id: string,
  input: UpdateCandidatureStatusInput,
): Promise<CandidatureRecruteurDto> {
  const candidature = await repository.findCandidatureById(id);
  if (!candidature) throw new NotFoundError("Candidature introuvable.");

  if (!isAdmin(actor) && actor.profileId !== candidature.offre.entrepriseId) {
    throw new ForbiddenError(
      "Seule l'entreprise propriétaire de l'offre peut faire ce changement.",
    );
  }

  /*
   * Le statut demandé doit être atteignable depuis le statut actuel.
   *
   * Le schéma zod ne restreint QUE la liste des valeurs possibles ; sans ce
   * contrôle, une candidature retirée par le candidat pouvait être repassée en
   * « acceptée », et une acceptation redescendue à « vue ».
   */
  if (!transitionRecruteurAutorisee(candidature.status, input.status)) {
    throw new ConflictError(
      candidature.status === CandidatureStatus.retiree
        ? "Le candidat a retiré sa candidature : elle ne peut plus être modifiée."
        : `Une candidature « ${LIBELLES[candidature.status]} » ne peut pas repasser à « ${LIBELLES[input.status]} ».`,
    );
  }

  const updated = await repository.updateCandidature(id, {
    status: input.status,
    ...(input.status === CandidatureStatus.vue && !candidature.vueLe ? { vueLe: new Date() } : {}),
  });

  const jeune = await jeuneRepository.findJeuneById(candidature.jeuneId);
  if (jeune) {
    await notify({
      userId: jeune.userId,
      icon: "assignment_turned_in",
      title: `Votre candidature à « ${candidature.offre.titre} »`,
      // Libellé et non valeur d'enum : le candidat lisait « Nouveau statut :
      // preselectionnee ».
      detail: `Nouveau statut : ${LIBELLES[input.status]}.`,
      href: "/espace-jeune/candidatures",
      accent:
        input.status === CandidatureStatus.acceptee || input.status === CandidatureStatus.entretien,
    });
  }

  return toCandidatureRecruteurDto(updated);
}

/** Retrait par le jeune — la seule transition qui lui appartient. */
export async function withdraw(actor: Actor, id: string): Promise<CandidatureDto> {
  const candidature = await repository.findCandidatureById(id);
  if (!candidature) throw new NotFoundError("Candidature introuvable.");

  if (!isAdmin(actor) && actor.profileId !== candidature.jeuneId) {
    throw new ForbiddenError("Vous ne pouvez retirer que vos propres candidatures.");
  }

  const updated = await repository.updateCandidature(id, { status: CandidatureStatus.retiree });
  return toCandidatureDto(updated);
}
