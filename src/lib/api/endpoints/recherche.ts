/** Recherche globale de l'Espace Jeune. */
import { http } from "../client";
import type { ApiRecherche } from "../types";

export const rechercheApi = {
  /**
   * Offres, formations et entreprises correspondant à un terme.
   *
   * @param limit nombre d'éléments par GROUPE — le total réel est renvoyé à
   * part, pour proposer « voir tous les résultats ».
   */
  globale: (q: string, limit?: number) =>
    http.get<ApiRecherche>("/recherche", { q, limit }),
};
