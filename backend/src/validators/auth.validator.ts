import { z } from "zod";
import {
  emailSchema,
  longText,
  passwordSchema,
  phoneSchema,
  shortText,
  urlSchema,
  uuidSchema,
} from "./common.validator.js";

/**
 * Inscription : le rôle demandé se limite à JEUNE ou ENTREPRISE. Un compte ADMIN
 * ne peut pas être créé par l'API publique — il vient du seed ou d'une promotion
 * effectuée par un admin existant.
 */
/**
 * Inscription d'un jeune — TOUS les champs sont exigés.
 *
 * Ces informations ne sont pas décoratives : la filière décide du test de
 * validation servi au candidat (§5.3) et du ciblage des offres, le niveau et
 * l'établissement pèsent dans le score d'employabilité. Un profil créé sans
 * elles arrive incomplet et le reste, faute d'occasion d'y revenir.
 *
 * `filiereId` est un identifiant du référentiel ; un candidat qui ne trouve pas
 * la sienne peut la créer depuis le formulaire (`POST /referentiels/filieres`),
 * il n'est donc jamais bloqué par cette obligation.
 */
export const registerJeuneSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    prenom: shortText(60),
    nom: shortText(60),
    telephone: phoneSchema,
    ville: shortText(80),
    filiereId: uuidSchema,
    niveauEtudes: shortText(40),
    etablissement: shortText(120),
  })
  .strict();

export const registerEntrepriseSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    nom: shortText(120),
    secteur: shortText(120),
    ville: shortText(80),
    siteWeb: urlSchema.optional(),
    description: longText(2000).optional(),
    responsable: shortText(120),
    emailResponsable: emailSchema.optional(),
    telephone: phoneSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    // Pas de `passwordSchema` ici : à la connexion on vérifie le hash, pas la
    // politique. Appliquer la politique révélerait quels mots de passe sont
    // « bien formés » et casserait les comptes créés sous une ancienne règle.
    password: z.string().min(1, "mot de passe requis").max(128),
  })
  .strict();

export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) }).strict();

export const resendVerificationSchema = z.object({ email: emailSchema }).strict();

export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "doit être différent du mot de passe actuel",
  });

export type RegisterJeuneInput = z.infer<typeof registerJeuneSchema>;
export type RegisterEntrepriseInput = z.infer<typeof registerEntrepriseSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
