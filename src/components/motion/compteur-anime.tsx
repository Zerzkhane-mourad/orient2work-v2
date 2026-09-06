"use client";

/**
 * Chiffre qui se compte à l'arrivée à l'écran.
 *
 * « 5000+ » qui défile de zéro accroche l'œil bien plus qu'un nombre posé —
 * c'est le seul endroit de la page d'accueil où l'animation porte une
 * information plutôt qu'un ornement : elle dit l'ordre de grandeur.
 *
 * Le nombre FINAL est rendu par le serveur, et c'est lui qui reste si le script
 * ne s'exécute pas ou si le mouvement réduit est demandé. L'animation ne fait
 * que remplacer temporairement ce texte ; elle n'en est jamais la source.
 */
import { useRef } from "react";
import { DECLENCHEMENT, gsap, useGSAP } from "./gsap-client";

/** Sépare « 5000+ » en `{ valeur: 5000, suffixe: "+" }`. */
export function decomposer(brut: string): { valeur: number; suffixe: string } {
  const correspondance = /^(\d+(?:[.,]\d+)?)(.*)$/.exec(brut.trim());
  if (!correspondance) return { valeur: Number.NaN, suffixe: brut };

  return {
    valeur: Number(correspondance[1]!.replace(",", ".")),
    suffixe: correspondance[2] ?? "",
  };
}

interface Props {
  /** Valeur telle qu'affichée : « 5000+ », « 250+ », « 50 ». */
  valeur: string;
  className?: string;
}

export function CompteurAnime({ valeur, className }: Props) {
  const element = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const { valeur: cible, suffixe } = decomposer(valeur);
      // Une valeur non numérique — « N/A », « — » — s'affiche telle quelle.
      if (Number.isNaN(cible)) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const noeud = element.current;
        if (!noeud) return;

        const compteur = { n: 0 };
        // `snap: 1` : le compteur affiche des entiers, jamais « 4783.2916 ».
        const arrondir = gsap.utils.snap(1);

        gsap.to(compteur, {
          n: cible,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            noeud.textContent = `${arrondir(compteur.n).toLocaleString("fr-FR")}${suffixe}`;
          },
          scrollTrigger: { trigger: noeud, start: DECLENCHEMENT, once: true },
        });
      });

      return () => mm.revert();
    },
    { scope: element, dependencies: [valeur] },
  );

  return (
    <span ref={element} className={className}>
      {valeur}
    </span>
  );
}
