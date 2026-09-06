/** Briques zod réutilisées par tous les schémas. */
import { z } from "zod";

export const uuidSchema = z.string().uuid("identifiant invalide");

export const idParamSchema = z.object({ id: uuidSchema }).strict();

/** Email normalisé : minuscules + trim, pour que l'unicité en base soit fiable. */
export const emailSchema = z.string().trim().toLowerCase().email("adresse email invalide").max(254);

/**
 * Politique de mot de passe : longueur d'abord (le facteur le plus efficace),
 * complétée par une exigence de diversité de caractères.
 */
export const passwordSchema = z
  .string()
  .min(12, "12 caractères minimum")
  .max(128, "128 caractères maximum")
  .refine((value) => /[a-z]/.test(value), "doit contenir une minuscule")
  .refine((value) => /[A-Z]/.test(value), "doit contenir une majuscule")
  .refine((value) => /\d/.test(value), "doit contenir un chiffre");

/** Texte court obligatoire, trimé. */
export function shortText(max = 120, min = 1) {
  return z.string().trim().min(min, "champ obligatoire").max(max, `${max} caractères maximum`);
}

/** Texte long (description, bio…). */
export function longText(max = 5000, min = 0) {
  return z.string().trim().min(min).max(max, `${max} caractères maximum`);
}

export const optionalShortText = (max = 120) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9 ().-]{6,20}$/, "numéro de téléphone invalide");

export const urlSchema = z.string().trim().url("URL invalide").max(500);

/** Liste de chaînes courtes, dédoublonnée et bornée. */
export function tagList(maxItems = 30, maxLength = 60) {
  return z
    .array(z.string().trim().min(1).max(maxLength))
    .max(maxItems, `${maxItems} éléments maximum`)
    .transform((items) => [...new Set(items)]);
}

/** Date au format `YYYY-MM-DD`, convertie en `Date` UTC. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "format attendu : AAAA-MM-JJ")
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => !Number.isNaN(date.getTime()), "date invalide");

/** Heure `HH:MM`. */
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "format attendu : HH:MM");

/**
 * Filtre d'énumération acceptant une valeur OU plusieurs, séparées par des virgules.
 *
 * Les écrans regroupent souvent des statuts sous un même onglet — « en cours »
 * = `envoyee,vue,preselectionnee`. Sans cela, l'affichage devrait charger toute
 * la collection pour la répartir côté client, et la pagination serveur perdrait
 * son intérêt.
 *
 * Chaque valeur est validée contre l'enum : un statut inventé part en 422.
 */
export function enumList<T extends Record<string, string>>(values: T) {
  const single = z.nativeEnum(values);
  return z
    .string()
    .transform((raw) => raw.split(",").map((value) => value.trim()))
    .pipe(z.array(single).min(1).max(Object.keys(values).length))
    .transform((list) => [...new Set(list)]);
}

/** Terme de recherche : borné pour éviter les requêtes `LIKE` pathologiques. */
export const searchSchema = z.string().trim().min(1).max(100).optional();

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");
