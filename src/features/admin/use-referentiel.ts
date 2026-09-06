"use client";

/**
 * Lecture d'un référentiel administrable (§7.4).
 *
 * Remplace les anciennes constantes `FORMATION_CATEGORIES` et `FILIERES` : ces
 * listes s'administrent depuis le back-office, elles ne peuvent plus être figées
 * dans le bundle.
 *
 * `variant` distingue les deux usages :
 *  • `"publiques"` — onglets et filtres, accessible sans être connecté ;
 *  • `"admin"` — inclut les entrées désactivées et leur nombre d'usages.
 *
 * Ce hook renvoie la liste ENTIÈRE : il alimente des `<select>` et des onglets,
 * qui ont besoin de toutes les valeurs proposables. Le volume est borné par
 * nature — c'est une liste administrée à la main. L'écran de gestion, lui, est
 * paginé et passe par `api.referentiels.liste` directement.
 */
import { api } from "@/lib/api";
import { API_MAX_PER_PAGE, type ApiReferentielEntree, type ReferentielKey } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";

export type ReferentielVariant = "publiques" | "admin";

export function useReferentiel(
  referentiel: ReferentielKey,
  variant: ReferentielVariant = "publiques",
) {
  const { data, loading, error, refetch } = useApi(
    () =>
      variant === "admin"
        ? api.referentiels
            .liste(referentiel, { inactives: true, perPage: API_MAX_PER_PAGE })
            .then((page) => page.items)
        : api.referentiels.publiques(referentiel),
    [referentiel, variant],
  );

  const entrees: ApiReferentielEntree[] = data ?? [];

  return {
    entrees,
    /** Libellés actifs seuls, pour les `<select>` et les onglets. */
    noms: entrees.filter((entree) => entree.active).map((entree) => entree.nom),
    loading,
    error,
    refetch,
  };
}

/** Raccourcis nommés — la clé d'URL ne remonte pas dans les composants. */
export function useCategories(variant: ReferentielVariant = "publiques") {
  const { entrees, ...rest } = useReferentiel("categories-formation", variant);
  return { categories: entrees, ...rest };
}

export function useFilieres(variant: ReferentielVariant = "publiques") {
  const { entrees, ...rest } = useReferentiel("filieres", variant);
  return { filieres: entrees, ...rest };
}
