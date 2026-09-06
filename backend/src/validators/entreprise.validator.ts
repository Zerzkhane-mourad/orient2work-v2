import { z } from "zod";
import { EntrepriseStatus } from "@prisma/client";
import { paginationSchema } from "../lib/pagination.js";
import {
  emailSchema,
  longText,
  phoneSchema,
  searchSchema,
  shortText,
  urlSchema,
} from "./common.validator.js";

/** `status` volontairement absent : une entreprise ne s'auto-valide pas. */
export const updateEntrepriseSchema = z
  .object({
    nom: shortText(120).optional(),
    secteur: shortText(120).optional(),
    ville: shortText(80).optional(),
    siteWeb: urlSchema.optional(),
    description: longText(3000).optional(),
    responsable: shortText(120).optional(),
    emailResponsable: emailSchema.optional(),
    telephone: phoneSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export const listEntreprisesSchema = paginationSchema
  .extend({
    q: searchSchema,
    status: z.nativeEnum(EntrepriseStatus).optional(),
    ville: z.string().trim().max(80).optional(),
    secteur: z.string().trim().max(120).optional(),
  })
  .strict();

/** Décision de l'admin sur une entreprise (§7.2). */
export const updateEntrepriseStatusSchema = z
  .object({
    status: z.nativeEnum(EntrepriseStatus),
    motif: longText(500).optional(),
  })
  .strict();

export type UpdateEntrepriseInput = z.infer<typeof updateEntrepriseSchema>;
export type ListEntreprisesInput = z.infer<typeof listEntreprisesSchema>;
