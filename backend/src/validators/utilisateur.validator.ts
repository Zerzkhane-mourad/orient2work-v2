import { z } from "zod";
import { paginationSchema } from "../lib/pagination.js";
import {
  emailSchema,
  passwordSchema,
  searchSchema,
  shortText,
  uuidSchema,
} from "./common.validator.js";

export const createUtilisateurSchema = z
  .object({
    nom: shortText(120, 2),
    email: emailSchema,
    /**
     * Même politique que l'inscription publique : un compte d'administration ne
     * doit pas être le maillon faible de la plateforme sous prétexte qu'il est
     * créé en interne.
     */
    password: passwordSchema,
    /**
     * Obligatoire. Un administrateur sans rôle n'a aucune permission — le
     * laisser facultatif produirait des comptes qui se connectent sur un
     * back-office vide, et dont personne ne comprendrait pourquoi.
     */
    roleAdminId: uuidSchema,
  })
  .strict();

export const updateUtilisateurSchema = z
  .object({
    nom: shortText(120, 2).optional(),
    roleAdminId: uuidSchema.optional(),
    /** Désactiver plutôt que supprimer : l'historique de connexion est conservé. */
    actif: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

/**
 * Réinitialisation par un administrateur — sans mot de passe actuel.
 *
 * Distincte de `POST /auth/mot-de-passe` (changement par le titulaire, qui
 * exige l'ancien) : ici l'autorisation vient de la permission
 * `utilisateurs:write`, pas de la connaissance du secret.
 */
export const resetUtilisateurPasswordSchema = z
  .object({ password: passwordSchema })
  .strict();

export const listUtilisateursSchema = paginationSchema
  .extend({
    q: searchSchema,
    roleAdminId: uuidSchema.optional(),
    actif: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  })
  .strict();

export type CreateUtilisateurInput = z.infer<typeof createUtilisateurSchema>;
export type UpdateUtilisateurInput = z.infer<typeof updateUtilisateurSchema>;
export type ResetUtilisateurPasswordInput = z.infer<typeof resetUtilisateurPasswordSchema>;
export type ListUtilisateursInput = z.infer<typeof listUtilisateursSchema>;
