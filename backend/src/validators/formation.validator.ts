import { z } from "zod";
import { QuestionType } from "@prisma/client";
import { FORMATION_NIVEAUX } from "../domain/enums.js";
import { MIN_QUESTIONS_PAR_QUIZ } from "../domain/quiz.js";
import { paginationSchema } from "../lib/pagination.js";
import {
  longText,
  searchSchema,
  shortText,
  tagList,
  uuidSchema,
} from "./common.validator.js";

/**
 * Le contenu est du HTML riche produit par l'éditeur admin. Il est assaini côté
 * service (`sanitizeHtml`) avant persistance : seule une whitelist de balises et
 * d'attributs survit, ce qui empêche un XSS stocké côté frontend.
 */
const contenuHtmlSchema = z.string().min(1, "contenu obligatoire").max(200_000);

/**
 * Champs communs à toute question de quiz, quel que soit le quiz.
 *
 * `bonnesReponses` est un tableau d'index dans `options` : c'est ce qui permet
 * aux trois types de partager un seul modèle.
 */
export const questionFields = {
  enonce: shortText(500),
  type: z.nativeEnum(QuestionType).default(QuestionType.qcm),
  options: z.array(shortText(300)).min(2, "2 options minimum").max(6),
  bonnesReponses: z
    .array(z.coerce.number().int().min(0))
    .min(1, "au moins une bonne réponse")
    .max(6)
    // Un même index deux fois fausserait le contrôle de cardinalité ci-dessous.
    .transform((indices) => [...new Set(indices)].sort((a, b) => a - b)),
  explication: longText(1500).default(""),
};

/**
 * La COHÉRENCE (type ↔ options ↔ bonnes réponses) n'est pas vérifiée ici mais
 * dans `domain/quiz.ts` : une modification partielle ne porte pas forcément les
 * trois champs, seule la question fusionnée peut être jugée. Une seule
 * implémentation, valable quel que soit le chemin.
 */
export const quizQuestionSchema = z
  .object({ ...questionFields, chapitre: shortText(200).optional() })
  .strict();

export const formationQuizSchema = z
  .object({
    titre: shortText(200),
    description: longText(1000).default(""),
    scoreMinimum: z.coerce.number().int().min(0).max(100).default(80),
    questions: z
      .array(quizQuestionSchema)
      .min(MIN_QUESTIONS_PAR_QUIZ, `au moins ${MIN_QUESTIONS_PAR_QUIZ} questions`)
      .max(50),
  })
  .strict();

export const createFormationSchema = z
  .object({
    titre: shortText(200),
    sousTitre: shortText(300).optional(),
    description: longText(3000, 10),
    // Le référentiel est désigné par IDENTIFIANT, pas par libellé : un renommage
    // depuis le back-office ne doit pas invalider un formulaire ouvert, et deux
    // entrées ne peuvent pas être confondues. Son existence — et son activation —
    // sont vérifiées par le service (§7.4).
    categorieId: uuidSchema,
    filiereId: uuidSchema.optional(),
    image: z.string().trim().max(500).optional(),
    tempsLectureMin: z.coerce.number().int().min(1).max(600).default(10),
    niveau: z.enum(FORMATION_NIVEAUX).optional(),
    instructeur: shortText(120).optional(),
    populaire: z.boolean().default(false),
    certifiante: z.boolean().default(false),
    objectifs: tagList(15, 200).default([]),
    prerequis: tagList(15, 200).default([]),
    contenuHtml: contenuHtmlSchema,
    publiee: z.boolean().default(true),
    quiz: formationQuizSchema.optional(),
  })
  .strict();

export const updateFormationSchema = createFormationSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export const listFormationsSchema = paginationSchema
  .extend({
    q: searchSchema,
    // Filtre par identifiant de catégorie ; un id inconnu ne remonte simplement
    // aucun résultat.
    categorieId: uuidSchema.optional(),
    filiereId: uuidSchema.optional(),
    niveau: z.enum(FORMATION_NIVEAUX).optional(),
    certifiante: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    populaire: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    /**
     * Formations commencées et non terminées, pour le jeune connecté.
     *
     * Sans ce filtre, l'écran « Continuer l'apprentissage » devait rapatrier
     * tout le catalogue et le trier dans le navigateur — et perdait de vue les
     * cours en cours au-delà de la centième formation. Ignoré pour un visiteur
     * ou un autre rôle : la progression n'a de sens que pour un jeune.
     */
    enCours: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();

/** Progression de lecture d'un cours. */
export const updateProgressionSchema = z
  .object({
    progression: z.coerce.number().int().min(0).max(100),
    /** Passe à `true` quand le lecteur atteint la fin du cours. */
    lu: z.boolean().optional(),
  })
  .strict();

/** Soumission du quiz de validation d'une formation. */
export const submitFormationQuizSchema = z
  .object({
    reponses: z
      .array(
        z
          .object({
            questionId: uuidSchema,
            // Un tableau, même pour un choix unique : la forme ne dépend pas du
            // type, et un tableau vide vaut « sans réponse ».
            reponses: z.array(z.coerce.number().int().min(0).max(10)).max(6).default([]),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

export const createAvisSchema = z
  .object({
    note: z.coerce.number().int().min(1).max(5),
    commentaire: longText(2000).default(""),
  })
  .strict();

export type CreateFormationInput = z.infer<typeof createFormationSchema>;
export type UpdateFormationInput = z.infer<typeof updateFormationSchema>;
export type ListFormationsInput = z.infer<typeof listFormationsSchema>;
export type SubmitFormationQuizInput = z.infer<typeof submitFormationQuizSchema>;
export type CreateAvisInput = z.infer<typeof createAvisSchema>;
export type UpdateProgressionInput = z.infer<typeof updateProgressionSchema>;

/** Métadonnées du quiz d'une formation, modifiables séparément des questions. */
export const updateFormationQuizSchema = z
  .object({
    titre: shortText(200).optional(),
    description: longText(1000).optional(),
    scoreMinimum: z.coerce.number().int().min(0).max(100).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

/**
 * Modification partielle d'une question.
 *
 * Comme pour le test général, aucun contrôle croisé ici : le service revalide la
 * question fusionnée contre `domain/quiz.ts`.
 */
export const updateQuizQuestionSchema = z
  .object({
    enonce: questionFields.enonce.optional(),
    type: z.nativeEnum(QuestionType).optional(),
    options: questionFields.options.optional(),
    bonnesReponses: questionFields.bonnesReponses.optional(),
    explication: questionFields.explication.optional(),
    chapitre: shortText(200).optional().or(z.literal("")),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type UpdateFormationQuizInput = z.infer<typeof updateFormationQuizSchema>;
export type UpdateQuizQuestionInput = z.infer<typeof updateQuizQuestionSchema>;

/** Paramètres d'une route ciblant une question d'un quiz de formation. */
export const quizQuestionParamsSchema = z
  .object({ id: uuidSchema, questionId: uuidSchema })
  .strict();
