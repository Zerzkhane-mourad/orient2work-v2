import { z } from "zod";
import { OffreStatus } from "@prisma/client";
import { NIVEAUX_ETUDES, OPPORTUNITY_TYPES, WORK_MODES } from "../domain/enums.js";
import { paginationSchema } from "../lib/pagination.js";
import {
  dateOnlySchema,
  longText,
  searchSchema,
  shortText,
  tagList,
  uuidSchema,
} from "./common.validator.js";

/** Date limite : forcément dans le futur à la création. */
const futureDateSchema = dateOnlySchema.refine(
  (date) => date.getTime() > Date.now() - 86_400_000,
  "la date limite doit être dans le futur",
);

export const createOffreSchema = z
  .object({
    titre: shortText(150),
    type: z.enum(OPPORTUNITY_TYPES),
    ville: shortText(80),
    mode: z.enum(WORK_MODES),
    niveauDemande: z.enum(NIVEAUX_ETUDES),
    filiereId: uuidSchema,
    competences: tagList(20, 60).default([]),
    description: longText(8000, 20),
    dateLimite: futureDateSchema,
    nombrePostes: z.coerce.number().int().min(1).max(500).default(1),
    /**
     * L'entreprise choisit uniquement entre brouillon et soumission ; passer une
     * offre en `publiee` reste une décision admin (§7.3).
     */
    status: z
      .enum([OffreStatus.brouillon, OffreStatus.attente_validation])
      .default(OffreStatus.attente_validation),
  })
  .strict();

export const updateOffreSchema = createOffreSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

/** Filtres du moteur de recherche d'offres (§5.6). */
export const listOffresSchema = paginationSchema
  .extend({
    q: searchSchema,
    type: z.enum(OPPORTUNITY_TYPES).optional(),
    mode: z.enum(WORK_MODES).optional(),
    filiereId: uuidSchema.optional(),
    ville: z.string().trim().max(80).optional(),
    niveauDemande: z.enum(NIVEAUX_ETUDES).optional(),
    entrepriseId: z.string().uuid().optional(),
    /** Réservé à l'admin et à l'entreprise propriétaire ; ignoré côté public. */
    status: z.nativeEnum(OffreStatus).optional(),
    sort: z.enum(["recent", "dateLimite", "candidatures"]).default("recent"),
  })
  .strict();

/** Modération d'une offre par l'admin. */
export const moderateOffreSchema = z
  .object({
    status: z.nativeEnum(OffreStatus),
    motif: longText(500).optional(),
  })
  .strict();

export type CreateOffreInput = z.infer<typeof createOffreSchema>;
export type UpdateOffreInput = z.infer<typeof updateOffreSchema>;
export type ListOffresInput = z.infer<typeof listOffresSchema>;
export type ModerateOffreInput = z.infer<typeof moderateOffreSchema>;
