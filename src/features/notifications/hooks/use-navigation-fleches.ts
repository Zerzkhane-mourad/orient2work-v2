"use client";

import { useCallback, type KeyboardEvent, type RefObject } from "react";

const TOUCHES = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

/**
 * ↑ / ↓ passent d'un élément à l'autre, Début / Fin vont aux bouts.
 *
 * Une liste se parcourt ainsi au clavier sans tabuler à travers chaque ligne ;
 * le navigateur fait défiler de lui-même jusqu'à l'élément focalisé.
 *
 * @param conteneur zone qui porte le `onKeyDown` retourné.
 * @param selecteur éléments focalisables à parcourir, dans l'ordre du DOM.
 */
export function useNavigationFleches<T extends HTMLElement>(
  conteneur: RefObject<T | null>,
  selecteur: string,
) {
  return useCallback(
    (event: KeyboardEvent<T>) => {
      if (!TOUCHES.has(event.key)) return;
      const cibles = Array.from(conteneur.current?.querySelectorAll<HTMLElement>(selecteur) ?? []);
      if (cibles.length === 0) return;
      event.preventDefault();

      const depuis = cibles.indexOf(document.activeElement as HTMLElement);
      const dernier = cibles.length - 1;
      const suivant =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? dernier
            : event.key === "ArrowDown"
              ? Math.min(dernier, depuis + 1)
              : Math.max(0, depuis - 1);
      cibles[suivant]?.focus();
    },
    [conteneur, selecteur],
  );
}
