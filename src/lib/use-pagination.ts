"use client";

/**
 * État de pagination d'une liste.
 *
 * Quatre pièges reviennent dans toutes les listes paginées ; ils sont traités ici
 * une fois pour toutes plutôt que dans chaque écran :
 *
 *  1. **Filtrer sans revenir page 1.** On est page 4, on tape une recherche qui
 *     ne rend que 3 résultats : la page 4 est vide et l'utilisateur croit que la
 *     recherche n'a rien donné. Chaque écran devait penser à un `setPage(1)` par
 *     filtre — un oubli suffisait.
 *  2. **La liste rétrécit sous les pieds.** On supprime la dernière ligne de la
 *     dernière page : on reste sur une page qui n'existe plus.
 *  3. **Le saut de page laisse la vue en bas.** On clique « suivant » au pied
 *     d'une longue liste et on atterrit au milieu de la page suivante.
 *  4. **Changer la taille de page fait perdre sa place.** Passer de 20 à 50
 *     lignes en page 4 doit garder sous les yeux la ligne qu'on regardait, pas
 *     renvoyer au début.
 */
import { useEffect, useRef, useState } from "react";
import type { ApiMeta } from "@/lib/api/types";

/** Choix proposés dans le sélecteur de taille de page. */
export const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

export interface UsePaginationOptions {
  /** Taille de page courante — vient en général de `usePageSize`. */
  perPage: number;
  /**
   * Valeurs des filtres. Tout changement ramène page 1 — voir le piège 1.
   * Même rôle que le tableau de dépendances d'un `useEffect`.
   */
  resetOn?: unknown[];
}

export interface UsePaginationResult<T extends HTMLElement = HTMLDivElement> {
  page: number;
  perPage: number;
  /** À câbler sur `<Pagination onPageChange={…}>`. */
  goTo: (page: number) => void;
  /**
   * À poser sur le conteneur de la liste : le changement de page y ramène la
   * vue — piège 3. Facultatif, ne rien attacher désactive simplement le
   * défilement.
   */
  listRef: React.RefObject<T | null>;
  /** Recale la page courante si la liste a rétréci — voir `useClampPage`. */
  clampTo: (totalPages: number) => void;
}

/**
 * Taille de page, mémorisée d'une visite à l'autre.
 *
 * Séparée de `usePagination` parce qu'un écran peut afficher PLUSIEURS listes
 * paginées indépendamment (les sections d'entretiens, par exemple) tout en
 * n'offrant qu'un seul réglage de densité : elles partagent alors ce hook, et
 * gardent chacune leur position.
 */
export function usePageSize({
  defaultSize,
  storageKey,
}: {
  defaultSize: number;
  storageKey?: string;
}): PageSize {
  const [perPage, setPerPage] = useState(() => readStoredPerPage(storageKey, defaultSize));

  return {
    perPage,
    setPerPage: (next: number) => {
      setPerPage(next);
      storePerPage(storageKey, next);
    },
  };
}

export interface PageSize {
  perPage: number;
  setPerPage: (perPage: number) => void;
}

export function usePagination<T extends HTMLElement = HTMLDivElement>({
  perPage,
  resetOn = [],
}: UsePaginationOptions): UsePaginationResult<T> {
  const [page, setPage] = useState(1);
  const listRef = useRef<T>(null);

  // Ajustements pendant le rendu, et non dans un `useEffect` : la requête
  // partirait sinon une première fois avec les nouveaux paramètres ET l'ancienne
  // page, pour être aussitôt remplacée. C'est le motif « ajuster l'état quand
  // une prop change » recommandé par React.
  const key = JSON.stringify(resetOn);
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPage(1);
  }

  // Piège 4 : la taille a changé, on suit l'élément qui était en haut de page.
  const [lastPerPage, setLastPerPage] = useState(perPage);
  if (perPage !== lastPerPage) {
    setLastPerPage(perPage);
    setPage(pageAfterResize(page, lastPerPage, perPage));
  }

  const goTo = (next: number) => {
    setPage(next);
    scrollListIntoView(listRef.current);
  };

  const clampTo = (totalPages: number) => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  };

  return { page, perPage, goTo, listRef, clampTo };
}

/**
 * Piège 2 : recale la page courante quand la liste a rétréci.
 *
 * À appeler juste après le chargement, sur les écrans qui suppriment des lignes —
 * effacer le dernier élément de la dernière page laisserait sinon l'utilisateur
 * devant un tableau vide, alors qu'il reste des résultats en amont.
 */
export function useClampPage(
  meta: ApiMeta | undefined,
  clampTo: (totalPages: number) => void,
): void {
  const totalPages = meta?.totalPages;
  const clampRef = useRef(clampTo);
  clampRef.current = clampTo;

  useEffect(() => {
    if (totalPages !== undefined) clampRef.current(totalPages);
  }, [totalPages]);
}

/**
 * Piège 4 : page à afficher après un changement de taille, pour que le PREMIER
 * élément visible le reste.
 *
 * Page 4 à 20 lignes commence au 61ᵉ résultat ; en passant à 50 lignes, ce 61ᵉ
 * résultat se trouve page 2. Revenir bêtement page 1 ferait perdre le fil à qui
 * parcourt une longue file de modération.
 */
export function pageAfterResize(page: number, perPage: number, nextPerPage: number): number {
  const premierElement = (page - 1) * perPage;
  return Math.floor(premierElement / nextPerPage) + 1;
}

const STORAGE_PREFIX = "o2w:per-page:";

/**
 * Lecture au premier rendu plutôt que dans un effet : passer par un effet
 * déclencherait une requête avec la taille par défaut, aussitôt suivie d'une
 * seconde avec la taille mémorisée.
 *
 * Sans risque d'écart d'hydratation : la pagination n'est rendue qu'une fois les
 * données chargées, donc jamais dans le HTML produit par le serveur.
 */
function readStoredPerPage(storageKey: string | undefined, fallback: number): number {
  if (!storageKey || typeof window === "undefined") return fallback;

  const stored = Number(window.localStorage.getItem(STORAGE_PREFIX + storageKey));
  // Une valeur hors liste (bricolée à la main, ou d'une version précédente)
  // ferait une requête refusée par l'API : on retombe sur la valeur par défaut.
  return PER_PAGE_OPTIONS.includes(stored as (typeof PER_PAGE_OPTIONS)[number]) ? stored : fallback;
}

function storePerPage(storageKey: string | undefined, perPage: number): void {
  if (!storageKey || typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + storageKey, String(perPage));
}

/** Ramène la vue en haut de la liste, sans brusquer qui a désactivé les animations. */
function scrollListIntoView(element: HTMLElement | null): void {
  if (!element || typeof window === "undefined") return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
}
