/**
 * Tests de validation des comptes jeunes (§5.3).
 *
 * Un test cible une filière, ou aucune — il est alors COMMUN, servi aux
 * candidats dont la filière n'a pas de test propre. L'unicité (un seul test par
 * filière, un seul commun) est garantie par la base et vérifiée par le service,
 * qui sait produire un message utile là où l'erreur Prisma serait opaque.
 */
import { z } from "zod";
import { QuestionType } from "@prisma/client";
import { paginationSchema } from "../lib/pagination.js";
import { questionFields } from "./formation.validator.js";
import { longText, shortText, uuidSchema } from "./common.validator.js";

/**
 * Question d'un test de validation.
 *
 * Ni `explication` ni `chapitre`, contrairement au test d'une formation : ce
 * test ne renvoie au candidat que son score, jamais la correction — la lui
 * montrer suffirait à réussir la tentative suivante.
 */
const { explication: _explicationInutilisee, ...questionFieldsTest } = questionFields;

export const createTestQuestionSchema = z
  .object({ ...questionFieldsTest, active: z.boolean().default(true) })
  .strict();

/**
 * Modification partielle d'une question.
 *
 * Aucun contrôle croisé ici : le service revalide la question FUSIONNÉE contre
 * `domain/quiz.ts`. Changer le seul `type` doit rester possible tant que le
 * résultat reste cohérent.
 */
export const updateTestQuestionSchema = z
  .object({
    enonce: questionFields.enonce.optional(),
    type: z.nativeEnum(QuestionType).optional(),
    options: questionFields.options.optional(),
    bonnesReponses: questionFields.bonnesReponses.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export const createTestSchema = z
  .object({
    titre: shortText(200),
    description: longText(1000).default(""),
    /** Absent = test commun à toutes les filières. */
    filiereId: uuidSchema.optional(),
    active: z.boolean().default(true),
    /**
     * Questions fournies dès la création. Facultatif : on crée souvent le test
     * d'abord, on le remplit ensuite — le test est alors signalé incomplet tant
     * qu'il n'a pas atteint le minimum.
     */
    questions: z.array(createTestQuestionSchema).max(50).default([]),
  })
  .strict();

/** `filiereId: null` rend le test commun ; l'omettre laisse le ciblage tel quel. */
export const updateTestSchema = z
  .object({
    titre: shortText(200).optional(),
    description: longText(1000).optional(),
    filiereId: uuidSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export const listTestsSchema = paginationSchema;

/** Paramètres d'une route ciblant une question d'un test. */
export const testQuestionParamsSchema = z
  .object({ id: uuidSchema, questionId: uuidSchema })
  .strict();

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type CreateTestQuestionInput = z.infer<typeof createTestQuestionSchema>;
export type UpdateTestQuestionInput = z.infer<typeof updateTestQuestionSchema>;
