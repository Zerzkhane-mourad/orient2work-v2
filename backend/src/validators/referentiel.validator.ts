import { z } from "zod";
import { paginationSchema } from "../lib/pagination.js";
import { REFERENTIELS } from "../repositories/referentiel.repository.js";
import { shortText } from "./common.validator.js";

/**
 * Entrée de référentiel (catégorie de formation, filière…).
 *
 * `nom` est la clé fonctionnelle : c'est ce libellé qui apparaît dans les listes
 * et qui sert de filtre côté API. Il est donc unique et trimé.
 */
export const createEntreeSchema = z
  .object({
    nom: shortText(60, 2),
    ordre: z.coerce.number().int().min(0).max(999).optional(),
    active: z.boolean().default(true),
  })
  .strict();

/**
 * Proposition d'un visiteur non connecté (§5.1).
 *
 * Le nom SEUL : ni `ordre` ni `active` — décider de sa position ou de son
 * activation reste une prérogative d'administration, et le corps est `strict`,
 * donc les glisser dans la requête est refusé en 422.
 */
export const proposeEntreeSchema = z.object({ nom: shortText(60, 2) }).strict();

export const updateEntreeSchema = z
  .object({
    nom: shortText(60, 2).optional(),
    ordre: z.coerce.number().int().min(0).max(999).optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export const listEntreesSchema = paginationSchema
  .extend({
    /** Côté public seules les entrées actives sortent ; l'admin voit tout. */
    inactives: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();

/** Déplacement d'un cran dans l'ordre d'affichage. */
export const moveEntreeSchema = z.object({ direction: z.enum(["haut", "bas"]) }).strict();

/**
 * Segment d'URL identifiant le référentiel visé.
 *
 * Validé contre la table des adaptateurs : une clé inconnue est rejetée en 422
 * avant d'atteindre le contrôleur, plutôt que de produire un `undefined`.
 */
export const referentielParamSchema = z
  .object({
    referentiel: z.enum(
      Object.keys(REFERENTIELS) as [keyof typeof REFERENTIELS, ...(keyof typeof REFERENTIELS)[]],
    ),
  })
  .strict();

export const referentielEntreeParamsSchema = referentielParamSchema.extend({
  id: z.string().uuid("identifiant invalide"),
});

export type CreateEntreeInput = z.infer<typeof createEntreeSchema>;
export type ProposeEntreeInput = z.infer<typeof proposeEntreeSchema>;
export type UpdateEntreeInput = z.infer<typeof updateEntreeSchema>;
export type ListEntreesInput = z.infer<typeof listEntreesSchema>;
export type MoveEntreeInput = z.infer<typeof moveEntreeSchema>;
