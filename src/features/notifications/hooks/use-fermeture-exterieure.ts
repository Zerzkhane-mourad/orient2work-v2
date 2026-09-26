"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Referme une surface ouverte au clic à l'extérieur et à la touche Échap —
 * en rendant alors le focus à son déclencheur.
 *
 * Un écouteur plutôt qu'un voile invisible en `fixed inset-0` : un en-tête
 * portant un `backdrop-blur` devient le bloc conteneur de ses enfants `fixed`,
 * et le voile n'aurait couvert que l'en-tête.
 *
 * Les écouteurs ne sont posés qu'à l'ouverture, et une seule fois : `fermer`
 * est lu via une ref, sa nouvelle identité à chaque rendu ne les relance pas.
 */
export function useFermetureExterieure({
  ouvert,
  fermer,
  racine,
  declencheur,
}: {
  ouvert: boolean;
  fermer: () => void;
  /** Tout clic DANS cet élément est considéré comme intérieur. */
  racine: RefObject<HTMLElement | null>;
  /** Reçoit le focus quand Échap referme la surface. */
  declencheur?: RefObject<HTMLElement | null>;
}): void {
  const fermerRef = useRef(fermer);
  fermerRef.current = fermer;

  useEffect(() => {
    if (!ouvert) return;

    const auClic = (event: PointerEvent) => {
      if (!racine.current?.contains(event.target as Node)) fermerRef.current();
    };
    const auClavier = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      fermerRef.current();
      declencheur?.current?.focus();
    };

    document.addEventListener("pointerdown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("pointerdown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert, racine, declencheur]);
}
