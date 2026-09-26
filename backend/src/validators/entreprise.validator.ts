import { z } from "zod";
import { EntrepriseStatus } from "@prisma/client";
import { paginationSchema } from "../lib/pagination.js";
import {
  emailSchema,
  hexColorSchema,
  longText,
  phoneSchema,
  searchSchema,
  shortText,
  urlSchema,
} from "./common.validator.js";

/** Préréglages livrés — miroir de `src/features/entreprise/themes.ts`. */
export const ENTREPRISE_PRESET_THEMES = [
  "marine",
  "emeraude",
  "ocean",
  "amethyste",
  "bordeaux",
  "ardoise",
] as const;

/**
 * Palette calculée depuis les couleurs du logo, plutôt qu'un préréglage.
 *
 * C'est une VALEUR de `theme` et non un drapeau séparé : les deux sont
 * exclusifs — un espace a une palette, calculée ou choisie — et les réunir dans
 * un champ unique rend cette exclusivité impossible à violer.
 */
export const ENTREPRISE_THEME_AUTO = "auto";

export const ENTREPRISE_THEMES = [
  ENTREPRISE_THEME_AUTO,
  ...ENTREPRISE_PRESET_THEMES,
] as const;

/** `status` volontairement absent : une entreprise ne s'auto-valide pas. */
export const updateEntrepriseSchema = z
  .object({
    nom: shortText(120).optional(),
    theme: z.enum(ENTREPRISE_THEMES).optional(),
    /**
     * Recalculées à chaque remplacement du logo. `null` efface la couleur —
     * d'où `nullable` en plus d'`optional`, qui ne dit que « champ absent ».
     */
    themeCouleur: hexColorSchema.nullable().optional(),
    themeAccent: hexColorSchema.nullable().optional(),
    secteur: shortText(120).optional(),
    ville: shortText(80).optional(),
    siteWeb: urlSchema.optional(),
    description: longText(3000).optional(),
    responsable: shortText(120).optional(),
    emailResponsable: emailSchema.optional(),
    telephone: phoneSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour")
  // Demander « auto » tout en effaçant la couleur dans le même appel ne décrit
  // aucun thème calculable. Le cas symétrique — « auto » sans couleur DÉJÀ
  // enregistrée — dépend de la fiche et se vérifie dans le service.
  .refine(
    (data) => !(data.theme === ENTREPRISE_THEME_AUTO && data.themeCouleur === null),
    {
      path: ["themeCouleur"],
      message: "une couleur est nécessaire pour le thème automatique",
    },
  );

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
