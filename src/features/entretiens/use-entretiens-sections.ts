"use client";

/**
 * Sections d'entretiens, paginées côté serveur.
 *
 * Les deux écrans d'entretiens (jeune et entreprise) présentent la même chose :
 * plusieurs sections par statut, chacune paginée indépendamment, plus des
 * compteurs qui portent sur la totalité.
 *
 * Une requête par section plutôt qu'un chargement global : c'est ce qui permet
 * de ne jamais rapatrier toute la collection. Les compteurs, eux, viennent d'un
 * `groupBy` dédié (`GET /entretiens/compteurs`) — ils resteraient faux s'ils
 * étaient déduits des pages affichées.
 */
import { api } from "@/lib/api";
import type { ApiEntretien, ApiMeta, EntretienStatus } from "@/lib/api/types";
import type { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";
import { usePageSize, usePagination, type PageSize } from "@/lib/use-pagination";

export const ENTRETIENS_PER_PAGE = 8;

/** Tailles adaptées à des sections courtes, empilées sur un même écran. */
export const ENTRETIENS_PER_PAGE_OPTIONS = [5, 8, 15, 30] as const;

/**
 * Densité commune à toutes les sections de l'écran.
 *
 * Un réglage par section donnerait deux ou trois sélecteurs identiques sur la
 * même page : c'est un seul choix, il se pilote donc d'un seul endroit — tout en
 * laissant chaque section sur sa propre page.
 */
export function useEntretiensPageSize(storageKey: string): PageSize {
  return usePageSize({ defaultSize: ENTRETIENS_PER_PAGE, storageKey });
}

export interface EntretiensSection {
  items: ApiEntretien[];
  meta?: ApiMeta;
  loading: boolean;
  error: ApiError | null;
  goTo: (page: number) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
  refetch: () => void;
}

/** Filtres au-delà du statut ; tous facultatifs. */
export interface SectionFiltres {
  /** `true` = candidature spontanée envoyée, `false` = invitation reçue. */
  spontanee?: boolean;
  /** `YYYY-MM-DD` — sépare ce qui vient de ce qui est passé. */
  from?: string;
  to?: string;
  /** `asc` pour ce qui vient, `desc` pour l'historique. */
  ordre?: "asc" | "desc";
}

/**
 * Une section = un filtre + sa propre position dans la liste.
 *
 * `statuts` doit être une constante stable (déclarée hors composant) : un
 * tableau recréé à chaque rendu relancerait la requête en boucle. Les autres
 * filtres passent par un objet libre, mais ce sont leurs VALEURS qui entrent
 * dans les dépendances — l'objet peut donc être écrit à la volée.
 *
 * La taille de page vient de l'écran (`useEntretiensPageSize`) : la changer
 * s'applique à toutes les sections d'un coup, chacune gardant sa page.
 */
export function useEntretiensSection(
  statuts: readonly EntretienStatus[],
  { perPage: taillePage }: PageSize,
  filtres: SectionFiltres = {},
): EntretiensSection {
  const { page, perPage, goTo, listRef } = usePagination({ perPage: taillePage });
  const { spontanee, from, to, ordre } = filtres;

  const { data, loading, error, refetch } = useApi(
    () =>
      api.entretiens.list({
        status: statuts,
        page,
        perPage,
        ...(spontanee !== undefined ? { spontanee } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(ordre ? { ordre } : {}),
      }),
    [page, perPage, statuts, spontanee, from, to, ordre],
  );

  return {
    items: data?.items ?? [],
    ...(data?.meta ? { meta: data.meta } : {}),
    loading,
    error,
    goTo,
    listRef,
    refetch,
  };
}

/** Totaux par statut, sur l'ensemble du périmètre de l'utilisateur connecté. */
export function useEntretiensCounts() {
  const { data, loading, refetch } = useApi(() => api.entretiens.countByStatus(), []);
  const parStatut = data ?? {};

  return {
    loading,
    refetch,
    /** Total cumulé des statuts demandés ; `0` tant que rien n'est chargé. */
    somme: (...statuts: EntretienStatus[]) =>
      statuts.reduce((total, statut) => total + (parStatut[statut] ?? 0), 0),
  };
}
