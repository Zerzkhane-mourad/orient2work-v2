"use client";

/**
 * Scène liée au défilement.
 *
 * ── Ce qui est repris de la référence ───────────────────────────────────────
 *
 * Le héros « MacBook » fourni en modèle repose sur une seule mécanique : la
 * position de défilement pilote DIRECTEMENT une valeur continue, image par
 * image. Ce n'est pas une apparition déclenchée à un seuil, c'est un curseur
 * que l'utilisateur tient dans la main. C'est cela qui donne l'impression de
 * cinéma, pas la séquence d'images elle-même.
 *
 * C'est donc cela qui est transposé ici, avec `scrub` : le panneau se retire
 * pendant qu'on le quitte, exactement au rythme du doigt ou de la molette.
 *
 * ── Ce qui n'a PAS été repris, et pourquoi ──────────────────────────────────
 *
 * La séquence de 941 images. Elle demande un asset que ce projet n'a pas — le
 * dossier `public/` est vide — et la démonstration pointe sur des rendus de
 * MacBook hébergés dans le dépôt GitHub d'un tiers. Les afficher sur une
 * plateforme marocaine d'employabilité n'aurait aucun sens, et chargerait
 * 140 images avant le premier affichage sur des connexions mobiles.
 *
 * ── Pourquoi `scale` et `opacity`, et rien d'autre ──────────────────────────
 *
 * Ce sont les deux seules propriétés que le compositeur traite sans repasser
 * par la mise en page ni par le dessin. Un `scrub` s'exécute à chaque image
 * pendant tout le défilement : y animer une marge ou une hauteur ferait
 * recalculer la page des centaines de fois d'affilée.
 *
 * `will-change` n'est pas posé en CSS : GSAP le gère pour la durée de
 * l'animation, et le laisser en permanence garderait une couche composite en
 * mémoire pour un élément immobile 95 % du temps.
 */
import { useRef } from "react";
import { gsap, useGSAP } from "./gsap-client";

export function SceneScrub({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const conteneur = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      /*
       * GSAP anime en JavaScript et échappe complètement à la règle
       * `prefers-reduced-motion` de `globals.css`, qui ne neutralise que les
       * transitions CSS. Sans ce `matchMedia`, la scène continuerait de bouger
       * malgré le réglage système.
       *
       * Le second test écarte les écrans étroits : sur un téléphone, le héros
       * occupe presque toute la fenêtre, et le voir rétrécir dès les premiers
       * pixels de défilement gêne la lecture au lieu de l'accompagner.
       */
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
        const element = conteneur.current;
        if (!element) return;

        gsap.to(element, {
          scale: 0.94,
          opacity: 0.55,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            // Le retrait commence quand le haut du panneau atteint le haut de
            // la fenêtre, et s'achève quand son bas y arrive. La valeur suit
            // donc exactement la portion de scène encore visible.
            start: "top top",
            end: "bottom top",
            scrub: 0.4,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: conteneur },
  );

  return (
    <div ref={conteneur} className={className}>
      {children}
    </div>
  );
}
