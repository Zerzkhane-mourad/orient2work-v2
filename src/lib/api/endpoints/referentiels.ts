/**
 * Référentiels administrables (§7.4).
 *
 * Catégories de formation et filières ne sont plus des constantes du code :
 * elles viennent de l'API et se gèrent depuis le back-office. Côté serveur les
 * routes sont paramétrées par le nom du référentiel, on garde donc ici un seul
 * jeu de fonctions, pris comme clé.
 */
import { http } from "../client";
import type { ApiReferentielEntree, Paginated, ReferentielKey } from "../types";

export const referentielsApi = {
  /** Entrées actives — alimente onglets et filtres, même pour un anonyme. */
  publiques: (referentiel: ReferentielKey) =>
    http.get<ApiReferentielEntree[]>(`/referentiels/${referentiel}`),

  /**
   * Filière proposée par un candidat qui ne trouve pas la sienne (§5.1).
   *
   * Accessible sans compte — c'est le seul référentiel ouvert ainsi, d'où une
   * méthode dédiée plutôt qu'un paramètre `referentiel` : les catégories de
   * formation restent purement administratives.
   *
   * Renvoie l'entrée EXISTANTE quand un nom équivalent est déjà là (casse,
   * accents et espaces ignorés). L'appelant obtient donc toujours un
   * identifiant à rattacher, sans avoir à distinguer les deux cas.
   */
  proposerFiliere: (nom: string) =>
    http.post<ApiReferentielEntree>("/referentiels/filieres", { nom }),

  /** Vue admin, paginée : `inactives` inclut les entrées désactivées. */
  liste: (
    referentiel: ReferentielKey,
    params: { inactives?: boolean; page?: number; perPage?: number } = {},
  ): Promise<Paginated<ApiReferentielEntree>> =>
    http.list<ApiReferentielEntree>(`/admin/referentiels/${referentiel}`, {
      inactives: params.inactives ? "true" : undefined,
      page: params.page,
      perPage: params.perPage,
    }),

  creer: (referentiel: ReferentielKey, input: { nom: string; ordre?: number; active?: boolean }) =>
    http.post<ApiReferentielEntree>(`/admin/referentiels/${referentiel}`, input),

  modifier: (
    referentiel: ReferentielKey,
    id: string,
    input: { nom?: string; ordre?: number; active?: boolean },
  ) => http.patch<ApiReferentielEntree>(`/admin/referentiels/${referentiel}/${id}`, input),

  /**
   * Déplace l'entrée d'un cran dans l'ordre d'affichage.
   *
   * Le serveur réécrit l'ordre complet en une transaction : le voisin peut se
   * trouver sur une autre page, et un échange en deux requêtes pouvait laisser
   * deux entrées au même rang si la seconde échouait.
   */
  deplacer: (referentiel: ReferentielKey, id: string, direction: "haut" | "bas") =>
    http.post<void>(`/admin/referentiels/${referentiel}/${id}/position`, { direction }),

  /** Refusé en 409 si des enregistrements y sont rattachés. */
  supprimer: (referentiel: ReferentielKey, id: string) =>
    http.delete<void>(`/admin/referentiels/${referentiel}/${id}`),
};
