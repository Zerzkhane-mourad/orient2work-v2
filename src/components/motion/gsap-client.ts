"use client";

/**
 * Point d'entrée unique de GSAP.
 *
 * Les greffons se déclarent UNE fois pour toute l'application. Répartir des
 * `registerPlugin` dans chaque composant fonctionne, mais rend impossible de
 * savoir ce qui est réellement chargé — et un oubli ne se voit qu'à l'exécution,
 * sous forme d'animation muette.
 *
 * Ce module est marqué client : GSAP touche au DOM et ne doit jamais s'exécuter
 * pendant le rendu serveur. La page d'accueil reste un Server Component ; seuls
 * les composants d'animation qui l'enveloppent basculent côté navigateur.
 */
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother);

/**
 * Réglages d'entrée — communs à toute la page.
 *
 * Préréglage « Stagger List (Standard) » de la skill `ui-ux-pro-max`. Des
 * valeurs choisies écran par écran donneraient une impression de bricolage.
 *
 * La courbe `back.out` dépasse légèrement l'arrivée avant de se poser : c'est
 * ce léger rebond qui distingue une entrée vivante d'un simple fondu. Le
 * facteur reste modeste (1.4) — au-delà, un site institutionnel se met à
 * rebondir comme un jeu.
 */
export const ENTREE = {
  duree: 0.45,
  courbe: "back.out(1.4)",
  /** Décalage vertical de départ, en pixels. Assez pour se voir, pas pour sauter. */
  decalage: 16,
  /** Échelle de départ : l'élément se pose, il n'apparaît pas à plat. */
  echelle: 0.92,
  /** Retard entre deux éléments d'un même groupe. */
  cascade: 0.06,
} as const;

/**
 * Position de déclenchement par défaut.
 *
 * « top 85% » : l'élément s'anime lorsqu'il entre dans le dernier sixième de
 * l'écran. Plus haut, l'animation se joue hors du regard ; plus bas, elle
 * démarre trop tard et l'on voit surgir le contenu.
 */
export const DECLENCHEMENT = "top 85%";

export { gsap, ScrollSmoother, ScrollTrigger, useGSAP };
