import { z } from "zod";
import { JeuneStatus } from "@prisma/client";
import { EXPERIENCE_TYPES, LIEN_TYPES, NIVEAUX_ETUDES } from "../domain/enums.js";
import { paginationSchema } from "../lib/pagination.js";
import {
  longText,
  optionalShortText,
  phoneSchema,
  searchSchema,
  shortText,
  tagList,
  urlSchema,
  uuidSchema,
} from "./common.validator.js";

/**
 * Mise à jour du profil jeune.
 *
 * `.strict()` est capital : ni `status`, ni `scoreQuiz`, ni `profilCompletion`
 * n'apparaissent ici, donc un jeune ne peut pas se valider lui-même ni gonfler
 * son score en ajoutant ces champs au payload — ils seraient rejetés en 422.
 */
export const updateJeuneSchema = z
  .object({
    prenom: shortText(60).optional(),
    nom: shortText(60).optional(),
    telephone: phoneSchema.optional(),
    ville: shortText(80).optional(),
    bio: longText(1500).optional(),
    titre: shortText(120).optional(),
    niveauEtudes: z.enum(NIVEAUX_ETUDES).optional(),
    etablissement: shortText(120).optional(),
    filiereId: uuidSchema.optional(),
    specialite: optionalShortText(120),
    anneeEtude: optionalShortText(40),
    diplome: optionalShortText(120),
    competences: tagList(40, 60).optional(),
    langues: tagList(15, 40).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export const experienceSchema = z
  .object({
    titre: shortText(120),
    structure: shortText(120),
    periode: shortText(60),
    type: z.enum(EXPERIENCE_TYPES),
    description: longText(1500),
    competences: tagList(20, 60).default([]),
  })
  .strict();

export const updateExperienceSchema = experienceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export const lienSchema = z
  .object({
    type: z.enum(LIEN_TYPES),
    url: urlSchema,
  })
  .strict();

export const jeuneIdParamSchema = z.object({ id: uuidSchema }).strict();

export const nestedIdParamsSchema = z.object({ id: uuidSchema, itemId: uuidSchema }).strict();

/** Recherche de talents (espace entreprise) — réservée aux profils validés. */
export const searchTalentsSchema = paginationSchema
  .extend({
    q: searchSchema,
    filiereId: uuidSchema.optional(),
    ville: z.string().trim().max(80).optional(),
    niveauEtudes: z.enum(NIVEAUX_ETUDES).optional(),
    competences: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((value) =>
        value
          ? value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .slice(0, 10)
          : undefined,
      ),
    scoreMin: z.coerce.number().int().min(0).max(100).optional(),
  })
  .strict();

/** Changement de statut d'un compte jeune — réservé à l'admin. */
export const updateJeuneStatusSchema = z.object({ status: z.nativeEnum(JeuneStatus) }).strict();

export const listJeunesSchema = paginationSchema
  .extend({
    q: searchSchema,
    status: z.nativeEnum(JeuneStatus).optional(),
    filiereId: uuidSchema.optional(),
  })
  .strict();

export type UpdateJeuneInput = z.infer<typeof updateJeuneSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type LienInput = z.infer<typeof lienSchema>;
export type SearchTalentsInput = z.infer<typeof searchTalentsSchema>;
export type ListJeunesInput = z.infer<typeof listJeunesSchema>;
