import { z } from "zod";
import { CandidatureStatus } from "@prisma/client";
import { paginationSchema } from "../lib/pagination.js";
import { longText, enumList, uuidSchema } from "./common.validator.js";

export const createCandidatureSchema = z
  .object({
    offreId: uuidSchema,
    message: longText(2000).optional(),
    /** Document de type CV appartenant au jeune ; vérifié côté service. */
    cvId: uuidSchema.optional(),
  })
  .strict();

export const listCandidaturesSchema = paginationSchema
  .extend({
    /** Un statut, ou plusieurs séparés par des virgules (onglets regroupés). */
    status: enumList(CandidatureStatus).optional(),
    offreId: uuidSchema.optional(),
    /**
     * Ordre de la liste — outil du recruteur.
     *
     * `score` et `formations` font remonter les profils les plus qualifiés sans
     * avoir à parcourir toutes les pages. `recent` reste le défaut : une
     * candidature nouvelle est ce qu'on vient traiter.
     */
    sort: z.enum(["recent", "score", "formations"]).default("recent"),
  })
  .strict();

/**
 * Seule l'entreprise propriétaire de l'offre fait évoluer le statut, et jamais
 * vers `retiree` — ce statut est l'action du jeune qui retire sa candidature.
 */
export const updateCandidatureStatusSchema = z
  .object({
    status: z.enum([
      CandidatureStatus.vue,
      CandidatureStatus.preselectionnee,
      CandidatureStatus.entretien,
      CandidatureStatus.acceptee,
      CandidatureStatus.refusee,
    ]),
  })
  .strict();

export type CreateCandidatureInput = z.infer<typeof createCandidatureSchema>;
export type ListCandidaturesInput = z.infer<typeof listCandidaturesSchema>;
export type UpdateCandidatureStatusInput = z.infer<typeof updateCandidatureStatusSchema>;
