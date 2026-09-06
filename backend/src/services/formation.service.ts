/**
 * Formations, progression de lecture, quiz de validation et avis.
 *
 * Point de sécurité central : la correction des quiz se fait EXCLUSIVEMENT côté
 * serveur. Les bonnes réponses ne sont jamais sérialisées pour un jeune, et le
 * score renvoyé est calculé à partir de la base, pas de ce que le client affirme.
 */
import { DocumentType, QuestionType, Role } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import {
  assertQuestionCoherente,
  assertRetraitQuestionPossible,
  estCorrecte,
} from "../domain/quiz.js";
import { buildMeta, toSkipTake, type Pagination } from "../lib/pagination.js";
import { sanitizeRichHtml, stripTags } from "../lib/sanitize.js";
import {
  assertRealFileType,
  removeStoredFile,
  sanitizeFilename,
  storedPath,
} from "../lib/upload.js";
import { env } from "../config/env.js";
import { isAdmin, type Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/formation.repository.js";
import * as jeuneRepository from "../repositories/jeune.repository.js";
import * as documentRepository from "../repositories/document.repository.js";
import { assertCategorieId, filiereRelation } from "./referentiel.service.js";
import {
  toAvisDto,
  toFormationDto,
  toFormationSummaryDto,
  type AvisDto,
  type FormationDto,
  type FormationSummaryDto,
} from "../mappers/formation.mapper.js";
import { notify } from "./notification.service.js";
import type { ApiMeta } from "../lib/http.js";
import type {
  CreateAvisInput,
  CreateFormationInput,
  ListFormationsInput,
  SubmitFormationQuizInput,
  QuizQuestionInput,
  UpdateFormationInput,
  UpdateFormationQuizInput,
  UpdateProgressionInput,
  UpdateQuizQuestionInput,
} from "../validators/formation.validator.js";

export async function list(
  actor: Actor | null,
  input: ListFormationsInput,
): Promise<{ items: FormationSummaryDto[]; meta: ApiMeta }> {
  const where = repository.buildFormationWhere({
    q: input.q,
    categorieId: input.categorieId,
    filiereId: input.filiereId,
    niveau: input.niveau,
    certifiante: input.certifiante,
    populaire: input.populaire,
    // Un brouillon n'est visible que de l'admin.
    ...(actor && isAdmin(actor) ? {} : { publiee: true }),
  });

  // Une seule requête pour toutes les progressions du jeune, plutôt qu'une par
  // formation (N+1). Remontée AVANT la pagination : le filtre « en cours »
  // s'appuie dessus.
  const progressions =
    actor?.role === Role.JEUNE && actor.profileId
      ? await repository.listProgressByJeune(actor.profileId)
      : [];
  const byFormation = new Map(progressions.map((p) => [p.formationId, p.progression]));

  if (input.enCours) {
    // Commencée mais pas finie. Le filtrage se fait ici plutôt que dans le
    // `where` du dépôt : la progression vit dans une autre table, et les
    // identifiants concernés sont déjà en mémoire.
    const ids = progressions
      .filter((p) => p.progression > 0 && p.progression < 100)
      .map((p) => p.formationId);

    // Aucune formation en cours : `id IN ()` est invalide, on répond une page
    // vide sans interroger la base.
    if (ids.length === 0) {
      return { items: [], meta: buildMeta(input, 0) };
    }
    where.id = { in: ids };
  }

  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listFormations(where, skip, take);

  return {
    items: rows.map((row) => toFormationSummaryDto(row, byFormation.get(row.id) ?? 0)),
    meta: buildMeta(input, total),
  };
}

export async function getOne(actor: Actor | null, id: string): Promise<FormationDto> {
  const formation = await repository.findFormationById(id);
  if (!formation) throw new NotFoundError("Formation introuvable.");

  const admin = Boolean(actor && isAdmin(actor));
  if (!formation.publiee && !admin) throw new NotFoundError("Formation introuvable.");

  let progression = 0;
  if (actor?.role === Role.JEUNE && actor.profileId) {
    const stored = await repository.findProgress(actor.profileId, id);
    progression = stored?.progression ?? 0;
  }

  // `includeAnswers` réservé à l'admin : le jeune ne reçoit jamais `bonneReponse`.
  return toFormationDto(formation, { progression, includeAnswers: admin });
}

// ── Administration du catalogue ──────────────────────────────────────────────

export async function create(input: CreateFormationInput): Promise<FormationDto> {
  // La catégorie est désignée par IDENTIFIANT. Le référentiel vivant en base,
  // c'est le service — et non zod — qui vérifie que l'entrée existe et qu'elle
  // est encore active.
  const categorieId = await assertCategorieId(input.categorieId);

  const formation = await repository.createFormation({
    titre: input.titre,
    sousTitre: input.sousTitre ?? null,
    description: stripTags(input.description),
    categorie: { connect: { id: categorieId } },
    // Pas de filière = formation transverse, proposée à tout le monde.
    ...(await filiereRelation(input.filiereId)),
    image: input.image ?? null,
    tempsLectureMin: input.tempsLectureMin,
    niveau: input.niveau ?? null,
    instructeur: input.instructeur ?? null,
    populaire: input.populaire,
    certifiante: input.certifiante,
    objectifs: input.objectifs,
    prerequis: input.prerequis,
    // Assainissement obligatoire : le HTML est réinjecté tel quel dans le lecteur.
    contenuHtml: sanitizeRichHtml(input.contenuHtml),
    publiee: input.publiee,
  });

  if (input.quiz) {
    await repository.replaceQuiz(formation.id, input.quiz);
  }

  const reloaded = await repository.findFormationById(formation.id);
  return toFormationDto(reloaded!, { includeAnswers: true });
}

export async function update(id: string, input: UpdateFormationInput): Promise<FormationDto> {
  const existing = await repository.findFormationById(id);
  if (!existing) throw new NotFoundError("Formation introuvable.");

  // `categorieId` et `filiere` sont extraits : ce sont des références au
  // référentiel, à convertir en relations Prisma.
  const { quiz, categorieId: nouvelleCategorie, filiereId, ...rest } = input;

  const categorieId =
    nouvelleCategorie !== undefined ? await assertCategorieId(nouvelleCategorie) : undefined;

  await repository.updateFormation(id, {
    ...rest,
    ...(categorieId ? { categorie: { connect: { id: categorieId } } } : {}),
    ...(await filiereRelation(filiereId)),
    ...(rest.description !== undefined ? { description: stripTags(rest.description) } : {}),
    ...(rest.contenuHtml !== undefined ? { contenuHtml: sanitizeRichHtml(rest.contenuHtml) } : {}),
  });

  if (quiz !== undefined) {
    await repository.replaceQuiz(id, quiz);
  }

  const reloaded = await repository.findFormationById(id);
  return toFormationDto(reloaded!, { includeAnswers: true });
}

export async function remove(id: string): Promise<void> {
  const existing = await repository.findFormationById(id);
  if (!existing) throw new NotFoundError("Formation introuvable.");

  await repository.deleteFormation(id);
  // La ligne `Document` part avec, mais pas le fichier : sans ce nettoyage, le
  // disque accumulerait les couvertures de formations supprimées.
  await supprimerCouverture(existing.imageDocumentId);
}

// ── Couverture ───────────────────────────────────────────────────────────────

/**
 * Remplace la couverture d'une formation.
 *
 * Le fichier est stocké hors du répertoire servi, comme tous les autres uploads,
 * et exposé par `GET /formations/:id/image` — la SEULE route de média publique
 * de l'API. C'est assumé : une couverture de cours s'affiche dans le catalogue
 * ouvert aux visiteurs anonymes, la protéger par jeton la rendrait invisible.
 */
export async function uploadImage(
  actor: Actor,
  formationId: string,
  file: Express.Multer.File,
): Promise<FormationDto> {
  const formation = await repository.findFormationById(formationId);
  if (!formation) throw new NotFoundError("Formation introuvable.");

  // Contrôle du contenu réel : un exécutable renommé en `.png` est supprimé ici.
  await assertRealFileType(file.path, file.mimetype);

  const document = await documentRepository.createDocument({
    ownerId: actor.id,
    type: DocumentType.FORMATION,
    filename: sanitizeFilename(file.originalname),
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
  });

  await repository.updateFormation(formationId, {
    imageDocument: { connect: { id: document.id } },
    image: `${env.API_PREFIX}/formations/${formationId}/image`,
  });

  // L'ancienne couverture n'est effacée qu'une fois la nouvelle en place : en
  // cas d'échec, la formation garde une image valide.
  await supprimerCouverture(formation.imageDocumentId);

  const reloaded = await repository.findFormationById(formationId);
  return toFormationDto(reloaded!, { includeAnswers: true });
}

/** Fichier de couverture à servir, ou `null` si la formation n'en a pas. */
export async function getImage(
  actor: Actor | null,
  formationId: string,
): Promise<{ absolutePath: string; mimeType: string }> {
  const formation = await repository.findFormationCouverture(formationId);
  if (!formation?.imageDocument) throw new NotFoundError("Image introuvable.");

  // Un brouillon reste invisible du public, couverture comprise.
  if (!formation.publiee && !(actor && isAdmin(actor))) {
    throw new NotFoundError("Image introuvable.");
  }

  return {
    absolutePath: storedPath(formation.imageDocument.storedName),
    mimeType: formation.imageDocument.mimeType,
  };
}

/**
 * Illustration DANS le corps d'un cours.
 *
 * Distincte de la couverture : celle-ci est unique et rattachée à la formation,
 * alors qu'un cours porte autant d'illustrations que de chapitres. Le fichier
 * est donc simplement stocké, et son URL revient à l'éditeur, qui l'insère dans
 * le HTML.
 *
 * Conséquence assumée : un fichier téléversé puis retiré du texte reste sur le
 * disque. Le lier au contenu supposerait d'analyser le HTML à chaque
 * enregistrement pour deviner ce qui est encore référencé — coûteux, et faux
 * dès qu'un brouillon est en cours d'écriture.
 */
export async function uploadMedia(
  actor: Actor,
  file: Express.Multer.File,
): Promise<{ id: string; url: string }> {
  // Contrôle du contenu réel : un exécutable renommé en `.png` est supprimé ici.
  await assertRealFileType(file.path, file.mimetype);

  const document = await documentRepository.createDocument({
    ownerId: actor.id,
    type: DocumentType.FORMATION,
    filename: sanitizeFilename(file.originalname),
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
  });

  return { id: document.id, url: `${env.API_PREFIX}/formations/medias/${document.id}` };
}

/**
 * Sert une illustration de cours, SANS authentification.
 *
 * Même raisonnement que la couverture : une image intégrée à une page HTML est
 * chargée par la balise `<img>`, qui ne sait pas porter de jeton. La protéger
 * la rendrait simplement invisible dans le lecteur.
 *
 * Le type `FORMATION` est vérifié : cette route ne doit pas devenir un moyen de
 * lire le CV d'un candidat en devinant un identifiant.
 */
export async function getMedia(
  documentId: string,
): Promise<{ absolutePath: string; mimeType: string }> {
  const document = await documentRepository.findDocumentById(documentId);
  if (!document || document.type !== DocumentType.FORMATION) {
    throw new NotFoundError("Image introuvable.");
  }

  return { absolutePath: storedPath(document.storedName), mimeType: document.mimeType };
}

/** Efface la ligne `Document` et le fichier associé, sans jamais échouer. */
async function supprimerCouverture(documentId: string | null): Promise<void> {
  if (!documentId) return;

  const document = await documentRepository.findDocumentById(documentId);
  if (!document) return;

  await documentRepository.deleteDocument(documentId);
  await removeStoredFile(document.storedName);
}

// ── Progression de lecture ───────────────────────────────────────────────────

export async function updateProgression(
  actor: Actor,
  formationId: string,
  input: UpdateProgressionInput,
): Promise<{ progression: number; lu: boolean }> {
  const jeuneId = requireJeuneProfile(actor);

  const formation = await repository.findFormationById(formationId);
  if (!formation?.publiee) throw new NotFoundError("Formation introuvable.");

  const existing = await repository.findProgress(jeuneId, formationId);
  // La progression ne redescend jamais : un rechargement de page en haut du
  // cours ne doit pas effacer l'avancement déjà acquis.
  const progression = Math.max(existing?.progression ?? 0, input.progression);
  const lu = existing?.lu || input.lu === true || progression >= 100;

  const saved = await repository.upsertProgress(jeuneId, formationId, {
    progression,
    lu,
    ...(lu && !existing?.lu ? { luAt: new Date() } : {}),
  });

  return { progression: saved.progression, lu: saved.lu };
}

// ── Quiz de validation ───────────────────────────────────────────────────────

export interface QuizResult {
  score: number;
  scoreMinimum: number;
  reussi: boolean;
  /** Correction détaillée, renvoyée UNE FOIS le quiz soumis. */
  corrections: Array<{
    questionId: string;
    correcte: boolean;
    bonnesReponses: number[];
    explication: string;
  }>;
}

export async function submitQuiz(
  actor: Actor,
  formationId: string,
  input: SubmitFormationQuizInput,
): Promise<QuizResult> {
  const jeuneId = requireJeuneProfile(actor);

  const formation = await repository.findFormationById(formationId);
  if (!formation?.publiee) throw new NotFoundError("Formation introuvable.");
  if (!formation.quiz) throw new NotFoundError("Cette formation n'a pas de test.");

  const progress = await repository.findProgress(jeuneId, formationId);
  // Le quiz se débloque à la fin de la lecture (§5.4).
  if (!progress?.lu) {
    throw new ForbiddenError("Terminez la lecture du cours avant de passer le test.");
  }

  const questions = formation.quiz.questions;
  const answers = new Map(input.reponses.map((r) => [r.questionId, r.reponses]));

  // Correction côté SERVEUR, à partir des questions stockées : le client n'a
  // jamais reçu les bonnes réponses avant de soumettre.
  const corrections = questions.map((question) => ({
    questionId: question.id,
    correcte: estCorrecte(question.bonnesReponses, answers.get(question.id) ?? []),
    bonnesReponses: question.bonnesReponses,
    explication: question.explication,
  }));

  const correctes = corrections.filter((c) => c.correcte).length;
  const score = questions.length === 0 ? 0 : Math.round((correctes / questions.length) * 100);
  const reussi = score >= formation.quiz.scoreMinimum;

  await repository.upsertProgress(jeuneId, formationId, {
    progression: 100,
    lu: true,
    valide: progress.valide || reussi,
    ...(reussi && !progress.valide ? { valideAt: new Date() } : {}),
    meilleurScore: Math.max(progress.meilleurScore ?? 0, score),
  });

  if (reussi && !progress.valide) {
    const jeune = await jeuneRepository.findJeuneById(jeuneId);
    if (jeune) {
      await notify({
        userId: jeune.userId,
        icon: "workspace_premium",
        title: `Formation « ${formation.titre} » validée`,
        detail: `Score : ${score}%. Votre score d'employabilité progresse.`,
        href: "/espace-jeune/formations",
        accent: true,
      });
    }
  }

  return { score, scoreMinimum: formation.quiz.scoreMinimum, reussi, corrections };
}

// ── Avis ─────────────────────────────────────────────────────────────────────

export async function listAvis(
  formationId: string,
  pagination: Pagination,
): Promise<{ items: AvisDto[]; meta: ApiMeta }> {
  const { skip, take } = toSkipTake(pagination);
  const [rows, total] = await repository.listAvis(formationId, skip, take);
  return { items: rows.map(toAvisDto), meta: buildMeta(pagination, total) };
}

export async function upsertAvis(
  actor: Actor,
  formationId: string,
  input: CreateAvisInput,
): Promise<AvisDto> {
  const jeuneId = requireJeuneProfile(actor);

  const formation = await repository.findFormationById(formationId);
  if (!formation?.publiee) throw new NotFoundError("Formation introuvable.");

  // Un avis suppose d'avoir lu le cours : évite les notes déposées sans lecture.
  const progress = await repository.findProgress(jeuneId, formationId);
  if (!progress?.lu) {
    throw new ForbiddenError("Vous devez avoir terminé la formation pour laisser un avis.");
  }

  const avis = await repository.upsertAvis(formationId, jeuneId, {
    note: input.note,
    commentaire: stripTags(input.commentaire),
  });
  await repository.refreshFormationRating(formationId);

  return toAvisDto(avis);
}

/**
 * Bascule le vote « utile » sur un avis.
 *
 * Un jeune ne peut pas voter pour son propre avis, et le vote est unique par
 * couple (avis, jeune) grâce à la clé primaire composée de `AvisUtile`.
 */
/** Un avis trop court ne témoigne de rien : « test », « ok », « bien ». */
const LONGUEUR_TEMOIGNAGE = 40;

export interface TemoignageDto {
  id: string;
  auteurNom: string;
  auteurPhoto?: string;
  note: number;
  commentaire: string;
  /** Formation concernée : le témoignage dit de QUOI il parle. */
  formation: { id: string; titre: string };
}

/**
 * Avis récents servant de preuve sociale sur la page d'accueil.
 *
 * PUBLIC, et volontairement pauvre : prénom et initiale, comme partout ailleurs
 * dans l'application. Un nom complet sur une page ouverte à tous exposerait des
 * candidats qui n'ont accepté que de commenter une formation.
 */
export async function listTemoignages(limite: number): Promise<TemoignageDto[]> {
  const lignes = await repository.listAvisRecents(limite, LONGUEUR_TEMOIGNAGE);

  return lignes.map((avis) => ({
    id: avis.id,
    auteurNom: `${avis.jeune.prenom} ${avis.jeune.nom.charAt(0)}.`,
    ...(avis.jeune.photo ? { auteurPhoto: avis.jeune.photo } : {}),
    note: avis.note,
    commentaire: avis.commentaire,
    formation: { id: avis.formation.id, titre: avis.formation.titre },
  }));
}

export async function toggleAvisUtile(
  actor: Actor,
  formationId: string,
  avisId: string,
): Promise<AvisDto> {
  const jeuneId = requireJeuneProfile(actor);

  const avis = await repository.findAvisById(avisId);
  if (!avis || avis.formationId !== formationId) {
    throw new NotFoundError("Avis introuvable.");
  }
  if (avis.jeuneId === jeuneId) {
    throw new ForbiddenError("Vous ne pouvez pas voter pour votre propre avis.");
  }

  return toAvisDto(await repository.toggleAvisUtile(avisId, jeuneId));
}

/** Ids des avis déjà marqués utiles par le jeune connecté, pour cette formation. */
export async function listMyAvisUtiles(actor: Actor, formationId: string): Promise<string[]> {
  if (actor.role !== Role.JEUNE || !actor.profileId) return [];
  return repository.listAvisUtilesByJeune(formationId, actor.profileId);
}

export async function removeAvis(actor: Actor, avisId: string): Promise<void> {
  const avis = await repository.findAvisById(avisId);
  if (!avis) throw new NotFoundError("Avis introuvable.");

  if (!isAdmin(actor) && actor.profileId !== avis.jeuneId) {
    throw new ForbiddenError("Vous ne pouvez supprimer que vos propres avis.");
  }

  await repository.deleteAvis(avisId);
  await repository.refreshFormationRating(avis.formationId);
}

function requireJeuneProfile(actor: Actor): string {
  if (actor.role !== Role.JEUNE || !actor.profileId) {
    throw new ForbiddenError("Action réservée aux comptes jeunes.");
  }
  return actor.profileId;
}

/** Réexporté pour le seed et les tests. */
export const QUESTION_TYPES = QuestionType;

// ── Édition du quiz, question par question ───────────────────────────────────

/**
 * Métadonnées du quiz (titre, consigne, score minimum).
 *
 * Le quiz est créé s'il n'existe pas : côté back-office, « ajouter une première
 * question » ne doit pas imposer une étape préalable dont l'utilisateur ignore
 * l'existence.
 */
async function ensureQuiz(formationId: string) {
  const existing = await repository.findQuizByFormation(formationId);
  if (existing) return existing;

  const formation = await repository.findFormationById(formationId);
  if (!formation) throw new NotFoundError("Formation introuvable.");

  await repository.createQuiz({
    formationId,
    titre: `Valider ses acquis — ${formation.titre}`,
    description: "",
    scoreMinimum: 80,
  });
  return (await repository.findQuizByFormation(formationId))!;
}

export async function updateQuizMeta(
  formationId: string,
  input: UpdateFormationQuizInput,
): Promise<FormationDto> {
  await ensureQuiz(formationId);
  await repository.updateQuiz(formationId, input);
  return getOneAsAdmin(formationId);
}

export async function addQuizQuestion(
  formationId: string,
  input: QuizQuestionInput,
): Promise<FormationDto> {
  assertQuestionCoherente(input);

  const quiz = await ensureQuiz(formationId);
  await repository.createQuizQuestion({
    quizId: quiz.id,
    enonce: input.enonce,
    type: input.type,
    options: input.options,
    bonnesReponses: input.bonnesReponses,
    explication: input.explication,
    chapitre: input.chapitre ?? null,
    ordre: await repository.nextQuestionOrdre(quiz.id),
  });

  return getOneAsAdmin(formationId);
}

export async function updateQuizQuestion(
  formationId: string,
  questionId: string,
  input: UpdateQuizQuestionInput,
): Promise<FormationDto> {
  const question = await assertQuestionAppartient(formationId, questionId);

  // Cohérence évaluée sur la question FUSIONNÉE : une modification partielle ne
  // porte pas forcément les trois champs liés.
  assertQuestionCoherente({
    type: input.type ?? question.type,
    options: input.options ?? question.options,
    bonnesReponses: input.bonnesReponses ?? question.bonnesReponses,
  });

  await repository.updateQuizQuestion(questionId, {
    ...input,
    ...(input.chapitre !== undefined ? { chapitre: input.chapitre || null } : {}),
  });

  return getOneAsAdmin(formationId);
}

export async function removeQuizQuestion(
  formationId: string,
  questionId: string,
): Promise<FormationDto> {
  const question = await assertQuestionAppartient(formationId, questionId);

  // Un quiz qui existe doit rester notable : on ne le vide pas question par
  // question, on le supprime d'un bloc (`removeQuiz`).
  assertRetraitQuestionPossible((await repository.countQuizQuestions(question.quizId)) - 1);

  await repository.deleteQuizQuestion(questionId);
  return getOneAsAdmin(formationId);
}

/**
 * Supprime le quiz entier.
 *
 * La formation se valide alors à la simple lecture. C'est la seule façon
 * d'enlever un quiz : le retirer question par question laisserait, à l'avant-
 * dernière, un quiz d'une seule question qui ne note plus rien.
 */
export async function removeQuiz(formationId: string): Promise<FormationDto> {
  const quiz = await repository.findQuizByFormation(formationId);
  if (!quiz) throw new NotFoundError("Cette formation n'a pas de test.");

  // Les questions partent avec lui (`onDelete: Cascade`).
  await repository.deleteQuiz(formationId);
  return getOneAsAdmin(formationId);
}

/**
 * Vérifie que la question appartient bien au quiz de CETTE formation.
 *
 * Sans ce contrôle, connaître l'identifiant d'une question suffirait à la
 * modifier depuis l'URL d'une autre formation.
 */
async function assertQuestionAppartient(formationId: string, questionId: string) {
  const question = await repository.findQuizQuestion(questionId);
  const quiz = await repository.findQuizByFormation(formationId);

  if (!question || !quiz || question.quizId !== quiz.id) {
    throw new NotFoundError("Question introuvable.");
  }
  return question;
}

/** Rechargement complet, corrigé compris — l'appelant est un administrateur. */
async function getOneAsAdmin(formationId: string): Promise<FormationDto> {
  const reloaded = await repository.findFormationById(formationId);
  if (!reloaded) throw new NotFoundError("Formation introuvable.");
  return toFormationDto(reloaded, { includeAnswers: true });
}
