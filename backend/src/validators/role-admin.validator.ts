import { z } from "zod";
import { ALL_PERMISSIONS } from "../domain/permissions.js";
import { paginationSchema } from "../lib/pagination.js";
import { longText, searchSchema, shortText } from "./common.validator.js";

/**
 * Liste de permissions, validée contre le CATALOGUE du code.
 *
 * `z.enum` et non `z.string()` : un code inconnu doit partir en 422 sur le champ
 * `permissions`, pas se retrouver en base où il resterait coché sans rien
 * protéger. Le tableau est dédoublonné — deux cases pour un même droit n'ont pas
 * de sens, et la comparaison de deux rôles s'en trouve fiable.
 */
const permissionListSchema = z
  .array(z.enum(ALL_PERMISSIONS as unknown as [string, ...string[]]))
  .max(ALL_PERMISSIONS.length)
  .transform((codes) => [...new Set(codes)]);

const nomSchema = shortText(60, 2);

export const createRoleSchema = z
  .object({
    nom: nomSchema,
    description: longText(300).optional(),
    /**
     * Facultatif : créer un rôle vide puis cocher est un parcours légitime, et
     * un rôle sans permission ne donne accès à rien — le défaut est sûr.
     */
    permissions: permissionListSchema.default([]),
  })
  .strict();

export const updateRoleSchema = z
  .object({
    nom: nomSchema.optional(),
    description: longText(300).optional(),
    permissions: permissionListSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

export const listRolesSchema = paginationSchema.extend({ q: searchSchema }).strict();

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type ListRolesInput = z.infer<typeof listRolesSchema>;
