"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/** Du contenu est-il caché au-dessus / au-dessous de la zone visible ? */
export interface BordsDefilement {
  haut: boolean;
  bas: boolean;
}

/** Tolérance : un défilement fractionnaire ne doit pas laisser un bord allumé. */
const TOLERANCE_PX = 2;

/**
 * Suit ce qui dépasse d'une zone défilante — pour l'ombre d'en-tête et le fondu
 * du bas.
 *
 * Mesure au défilement (`mesurer`, à brancher sur `onScroll`), et à chaque
 * changement de taille : une liste qui se remplit après chargement, ou qu'un
 * filtre raccourcit, change ce qui dépasse sans qu'aucun défilement ait lieu.
 *
 * @param actif suspend l'observation quand la zone n'est pas montée (menu fermé).
 * @param cleContenu change quand le CONTENU est remplacé (filtre, chargement) :
 *   l'enfant observé n'est alors plus le même élément.
 */
export function useBordsDefilement(actif: boolean, cleContenu?: string | number) {
  const zone = useRef<HTMLDivElement>(null);
  const [bords, setBords] = useState<BordsDefilement>({ haut: false, bas: false });

  const mesurer = useCallback(() => {
    const el = zone.current;
    if (!el) return;
    const haut = el.scrollTop > TOLERANCE_PX;
    const bas = el.scrollTop + el.clientHeight < el.scrollHeight - TOLERANCE_PX;
    // Même objet si rien n'a changé : pas de rendu à chaque pixel défilé.
    setBords((avant) => (avant.haut === haut && avant.bas === bas ? avant : { haut, bas }));
  }, []);

  useLayoutEffect(() => {
    if (!actif) return;
    mesurer();
    const el = zone.current;
    if (!el) return;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    if (el.firstElementChild) observateur.observe(el.firstElementChild);
    return () => observateur.disconnect();
  }, [actif, cleContenu, mesurer]);

  /** Descend d'un « écran » de zone — 80 %, pour garder un repère. */
  const descendre = useCallback(() => {
    const el = zone.current;
    el?.scrollBy({ top: el.clientHeight * 0.8 });
  }, []);

  const remonter = useCallback(() => zone.current?.scrollTo({ top: 0 }), []);

  return { zone, bords, mesurer, descendre, remonter };
}
