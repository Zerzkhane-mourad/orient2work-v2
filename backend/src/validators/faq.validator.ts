import { z } from "zod";
import { longText, shortText } from "./common.validator.js";

/**
 * Question fréquente.
 *
 * `shortText` / `longText` assainissent et bornent : la réponse est stockée en
 * TEXTE SIMPLE, jamais en HTML. Une page publique n'a pas besoin de mise en
 * forme riche ici, et l'accepter ouvrirait une surface d'injection pour un gain
 * nul — c'est le même arbitrage que pour les messages de contact.
 */
export const createFaqSchema = z
  .object({
    question: shortText(200),
    reponse: longText(2000),
    publiee: z.boolean().default(true),
  })
  .strict();

/** Modification partielle : on peut ne changer que la publication. */
export const updateFaqSchema = z
  .object({
    question: shortText(200).optional(),
    reponse: longText(2000).optional(),
    publiee: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

/** Déplacement d'un cran ; l'ordre complet est recalculé côté serveur. */
export const moveFaqSchema = z.object({ direction: z.enum(["haut", "bas"]) }).strict();

export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type MoveFaqInput = z.infer<typeof moveFaqSchema>;
