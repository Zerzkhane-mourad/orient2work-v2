import { z } from "zod";
import { EntretienStatus, QuestionType } from "@prisma/client";
import { paginationSchema } from "../lib/pagination.js";
import { questionFields } from "./formation.validator.js";
import {
  dateOnlySchema,
  longText,
  shortText,
  enumList,
  timeSchema,
  urlSchema,
  uuidSchema,
} from "./common.validator.js";

/** Demande d'entretien émise par une entreprise (§10). */
export const createEntretienSchema = z
  .object({
    jeuneId: uuidSchema,
    offreId: uuidSchema.optional(),
    candidatureId: uuidSchema.optional(),
    offreTitre: shortText(150),
    date: dateOnlySchema.refine(
      (date) => date.getTime() > Date.now() - 86_400_000,
      "la date doit être dans le futur",
    ),
    heure: timeSchema,
    lienReunion: urlSchema.optional(),
    commentaire: longText(1000).optional(),
  })
  .strict();

/**
 * Réponse à une demande : accepter ou refuser.
 *
 * `lienReunion` accompagne l'ACCEPTATION, car c'est l'instant où l'on décide
 * comment l'échange aura lieu. Sur une candidature spontanée, c'est même la
 * seule occasion naturelle : le rendez-vous a été créé par le candidat, qui ne
 * pouvait évidemment pas fournir la salle de visio de l'entreprise.
 *
 * Le service vérifie en outre que seul le côté ENTREPRISE le renseigne : un
 * candidat ne convoque pas son recruteur dans sa propre réunion.
 */
export const respondEntretienSchema = z
  .object({
    status: z.enum([EntretienStatus.accepte, EntretienStatus.refuse]),
    lienReunion: urlSchema.optional(),
    commentaire: longText(1000).optional(),
  })
  .strict()
  .refine(
    (data) => !data.lienReunion || data.status === EntretienStatus.accepte,
    // Diffuser un lien sur un refus reviendrait à ouvrir une salle pour un
    // rendez-vous qui n'aura pas lieu.
    { path: ["lienReunion"], message: "un lien de réunion n'a de sens qu'avec une acceptation" },
  );

/** Replanification / annulation par l'entreprise. */
export const updateEntretienSchema = z
  .object({
    date: dateOnlySchema.optional(),
    heure: timeSchema.optional(),
    lienReunion: urlSchema.optional(),
    commentaire: longText(1000).optional(),
    status: z.literal(EntretienStatus.annule).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export const listEntretiensSchema = paginationSchema
  .extend({
    /** Un statut, ou plusieurs séparés par des virgules (sections regroupées). */
    status: enumList(EntretienStatus).optional(),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    /**
     * Origine : `true` = candidature spontanée, `false` = invitation reçue.
     *
     * Littéraux plutôt que `z.coerce.boolean()`, qui rend `true` pour toute
     * chaîne non vide — « false » compris. Le filtre aurait silencieusement
     * fait l'inverse de ce qu'on lui demande.
     */
    spontanee: z
      .enum(["true", "false"])
      .transform((valeur) => valeur === "true")
      .optional(),
    /** `asc` pour les entretiens à venir, `desc` pour l'historique. */
    ordre: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict();

// ── Test de validation général (§5.3) ────────────────────────────────────────

export const startQuizSchema = z.object({ filiereId: uuidSchema.optional() }).strict();

export const submitQuizSchema = z
  .object({
    reponses: z
      .array(
        z
          .object({
            questionId: uuidSchema,
            reponses: z.array(z.coerce.number().int().min(0).max(10)).max(6).default([]),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

/**
 * Question du test général : les champs communs, plus la filière ciblée.
 *
 * Pas d'`explication`, contrairement au quiz d'une formation : le test de
 * validation ne renvoie au candidat que son score, jamais la correction —
 * sinon un échec suffirait à connaître le corrigé avant de recommencer.
 */
const { explication: _sansExplication, ...questionFieldsTest } = questionFields;

export const createQuizQuestionSchema = z
  .object({
    ...questionFieldsTest,
    filiereId: uuidSchema.optional(),
    active: z.boolean().default(true),
  })
  .strict();

/**
 * Modification partielle.
 *
 * Aucun contrôle croisé ici : le service revalide la question FUSIONNÉE contre
 * `domain/quiz.ts`. Changer le seul `type` doit rester possible tant que le
 * résultat reste cohérent.
 *
 * `filiereId: null` rend la question COMMUNE ; l'omettre laisse le ciblage
 * inchangé. Sans ce `null`, une question ne pourrait jamais redevenir commune.
 */
export const updateQuizQuestionSchema = z
  .object({
    enonce: questionFields.enonce.optional(),
    type: z.nativeEnum(QuestionType).optional(),
    options: questionFields.options.optional(),
    bonnesReponses: questionFields.bonnesReponses.optional(),
    filiereId: uuidSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export type CreateEntretienInput = z.infer<typeof createEntretienSchema>;
export type RespondEntretienInput = z.infer<typeof respondEntretienSchema>;
export type UpdateEntretienInput = z.infer<typeof updateEntretienSchema>;
export type ListEntretiensInput = z.infer<typeof listEntretiensSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
export type CreateQuizQuestionInput = z.infer<typeof createQuizQuestionSchema>;
export type UpdateQuizQuestionInput = z.infer<typeof updateQuizQuestionSchema>;
