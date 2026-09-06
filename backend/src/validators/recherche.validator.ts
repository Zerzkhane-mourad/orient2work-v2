import { z } from "zod";

/**
 * Recherche globale.
 *
 * `q` est EXIGÉ, contrairement au `searchSchema` partagé qui le rend
 * facultatif : là-bas il affine une liste qui existe sans lui, ici il n'y a
 * rien à chercher sans terme. Un appel sans `q` est un défaut d'appelant, pas
 * une recherche vide à servir en silence.
 *
 * `limit` borne CHAQUE groupe, pas le total : une liste de suggestions doit
 * rester lisible d'un coup d'œil, et trente offres y noieraient les deux
 * formations pertinentes. Le total réel est renvoyé à côté, pour proposer
 * « voir tous les résultats ».
 */
export const rechercheSchema = z
  .object({
    q: z.string().trim().min(1, "terme de recherche requis").max(100),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  })
  .strict();

export type RechercheInput = z.infer<typeof rechercheSchema>;
