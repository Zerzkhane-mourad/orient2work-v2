/**
 * Administration des tests de validation des comptes jeunes (§5.3).
 *
 * UN SEUL test par filière, plus un test commun servi à défaut. C'est cette
 * unicité qui rend le test d'un candidat prévisible : pas de tirage, pas de
 * « dernier créé gagne », une seule épreuve par domaine.
 *
 * Le test d'une FORMATION vit ailleurs (`formation.service.ts`) : il valide les
 * acquis d'un cours, celui-ci valide un compte.
 */
import { ConflictError, NotFoundError } from "../lib/errors.js";
import { buildMeta, toSkipTake, type Pagination } from "../lib/pagination.js";
import { assertQuestionCoherente, assertRetraitQuestionPossible } from "../domain/quiz.js";
import * as repository from "../repositories/entretien.repository.js";
import { assertFiliereIdOptional } from "./referentiel.service.js";
import type { ApiMeta } from "../lib/http.js";
import type {
  CreateTestInput,
  CreateTestQuestionInput,
  UpdateTestInput,
  UpdateTestQuestionInput,
} from "../validators/test.validator.js";

export async function list(pagination: Pagination): Promise<{ items: unknown[]; meta: ApiMeta }> {
  const { skip, take } = toSkipTake(pagination);
  const [rows, total] = await repository.listTests(skip, take);
  return { items: rows, meta: buildMeta(pagination, total) };
}

export async function getOne(id: string) {
  const test = await repository.findTestById(id);
  if (!test) throw new NotFoundError("Test introuvable.");
  return test;
}

/**
 * Une filière ne peut porter qu'un test, et il n'existe qu'un test commun.
 *
 * La base l'impose aussi (index unique, et index partiel pour le commun) ; ce
 * contrôle-ci n'est là que pour renvoyer un message exploitable plutôt que la
 * violation de contrainte brute.
 */
async function assertFiliereLibre(filiereId: string | null, testId?: string): Promise<void> {
  const existant = await repository.findTestByFiliere(filiereId);
  if (!existant || existant.id === testId) return;

  throw new ConflictError(
    filiereId
      ? "Cette filière a déjà un test. Modifiez-le plutôt que d'en créer un second."
      : "Le test commun existe déjà. Modifiez-le plutôt que d'en créer un second.",
  );
}

export async function create(input: CreateTestInput) {
  input.questions.forEach(assertQuestionCoherente);

  const filiereId = (await assertFiliereIdOptional(input.filiereId)) ?? null;
  await assertFiliereLibre(filiereId);

  return repository.createTest({
    titre: input.titre,
    description: input.description,
    filiereId,
    active: input.active,
    questions: {
      create: input.questions.map((question, ordre) => ({
        enonce: question.enonce,
        type: question.type,
        options: question.options,
        bonnesReponses: question.bonnesReponses,
        active: question.active,
        ordre,
      })),
    },
  });
}

export async function update(id: string, input: UpdateTestInput) {
  await getOne(id);

  const { filiereId, ...rest } = input;

  if (filiereId !== undefined) {
    const cible = filiereId === null ? null : await assertFiliereIdOptional(filiereId);
    await assertFiliereLibre(cible ?? null, id);
    return repository.updateTest(id, { ...rest, filiereId: cible ?? null });
  }

  return repository.updateTest(id, rest);
}

export async function remove(id: string): Promise<void> {
  await getOne(id);
  // Les questions partent avec (`onDelete: Cascade`).
  await repository.deleteTest(id);
}

// ── Questions d'un test ──────────────────────────────────────────────────────

export async function addQuestion(testId: string, input: CreateTestQuestionInput) {
  await getOne(testId);
  assertQuestionCoherente(input);

  await repository.createQuizQuestion({
    testId,
    enonce: input.enonce,
    type: input.type,
    options: input.options,
    bonnesReponses: input.bonnesReponses,
    active: input.active,
    ordre: await repository.nextQuestionOrdre(testId),
  });

  return getOne(testId);
}

export async function updateQuestion(
  testId: string,
  questionId: string,
  input: UpdateTestQuestionInput,
) {
  const question = await assertQuestionAppartient(testId, questionId);

  // La cohérence porte sur la question FUSIONNÉE : réduire les options sans
  // toucher aux bonnes réponses, ou passer en choix multiples sans en ajouter
  // une seconde, laisserait une question impossible à corriger comme annoncé.
  assertQuestionCoherente({
    type: input.type ?? question.type,
    options: input.options ?? question.options,
    bonnesReponses: input.bonnesReponses ?? question.bonnesReponses,
  });

  await repository.updateQuizQuestion(questionId, input);
  return getOne(testId);
}

export async function removeQuestion(testId: string, questionId: string) {
  await assertQuestionAppartient(testId, questionId);

  // Un test qui existe doit rester notable : on ne le vide pas question par
  // question, on supprime le test entier.
  assertRetraitQuestionPossible((await repository.countQuizQuestions(testId)) - 1);

  await repository.deleteQuizQuestion(questionId);
  return getOne(testId);
}

/**
 * Vérifie que la question appartient bien à CE test.
 *
 * Sans ce contrôle, connaître l'identifiant d'une question suffirait à la
 * modifier depuis l'URL d'un autre test.
 */
async function assertQuestionAppartient(testId: string, questionId: string) {
  const question = await repository.findQuizQuestionById(questionId);
  if (!question || question.testId !== testId) throw new NotFoundError("Question introuvable.");
  return question;
}
