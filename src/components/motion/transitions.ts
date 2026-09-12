"use client";

/**
 * Durées et courbes des surfaces qui s'ouvrent — menus, panneaux, feuille du bas.
 *
 * Une seule source pour toutes : dans l'Espace Jeune, la loupe, la feuille
 * « Plus », le menu « Moi » et les notifications s'ouvrent depuis la même barre.
 * Réglés séparément, ces gestes finissaient par diverger de quelques dizaines de
 * millisecondes — et cela se voit : deux panneaux voisins qui ne suivent pas la
 * même cadence donnent l'impression que l'un des deux rame.
 *
 * `prefers-reduced-motion` est lu ICI, dans `useTransitionUI`. La règle globale
 * de `globals.css` ramène les transitions CSS à une durée imperceptible, mais
 * elle ne voit RIEN de ce que fait Framer Motion : sans ce test, les panneaux
 * continueraient de glisser malgré la préférence système.
 */
import { useSyncExternalStore } from "react";
import { useReducedMotion, type Transition } from "framer-motion";

/** Bézier à quatre points — la forme qu'attend `ease`. */
type Courbe = [number, number, number, number];

/** Courbe standard Material : départ franc, arrivée freinée. */
export const COURBE: Courbe = [0.4, 0, 0.2, 1];

/**
 * Sortie accélérée.
 *
 * Ce qui s'en va n'a pas à être regardé partir : une fermeture qui emprunte la
 * courbe d'entrée traîne en fin de course et retient l'écran qu'elle libère.
 */
export const COURBE_SORTIE: Courbe = [0.3, 0, 0.8, 0.15];

/** Petit menu ancré sous son bouton — course de quelques pixels. */
export const DUREE_MENU = 0.18;

/** Panneau qui pousse le contenu : recherche dépliée, liste de résultats. */
export const DUREE_PANNEAU = 0.24;

/** Feuille du bas : elle traverse un tiers d'écran, il lui faut le temps. */
export const DUREE_FEUILLE = 0.32;

/** Voile : il suit la surface qu'il accompagne, sans se faire remarquer. */
export const DUREE_VOILE = 0.2;

/**
 * Transition prête à poser sur un `motion.*`, préférence système comprise.
 *
 * Durée à zéro plutôt qu'animation supprimée : l'état final reste le même, donc
 * rien à écrire en double pour le cas « mouvement réduit ».
 */
export function useTransitionUI(duree: number, courbe: Courbe = COURBE): Transition {
  const reduire = useReducedMotion();
  return { duration: reduire ? 0 : duree, ease: courbe };
}

/** Point de rupture `sm` de Tailwind : en deçà, les boîtes deviennent des feuilles. */
const REQUETE_ECRAN_LARGE = "(min-width: 640px)";

function abonnerEcranLarge(notifier: () => void): () => void {
  const requete = window.matchMedia(REQUETE_ECRAN_LARGE);
  requete.addEventListener("change", notifier);
  return () => requete.removeEventListener("change", notifier);
}

/**
 * Vrai au-delà de `sm`, là où une surface modale est une BOÎTE centrée ; faux
 * en deçà, où elle devient une FEUILLE collée au bas de l'écran.
 *
 * Le CSS place déjà la surface au bon endroit ; ce test ne sert qu'à choisir son
 * TRAJET, que Framer Motion reçoit en JavaScript et ne peut pas lire d'une
 * média-requête. Une feuille doit monter depuis le bord, une boîte s'avancer au
 * centre : un trajet unique pour les deux se lit faux dans l'un des cas.
 *
 * `useSyncExternalStore` suit le redimensionnement (rotation d'une tablette)
 * sans état ni effet à écrire. Le rendu serveur répond « faux » : aucune
 * surface modale n'y est jamais ouverte, la valeur n'y est donc pas lue.
 */
export function useEcranLarge(): boolean {
  return useSyncExternalStore(
    abonnerEcranLarge,
    () => window.matchMedia(REQUETE_ECRAN_LARGE).matches,
    () => false,
  );
}
