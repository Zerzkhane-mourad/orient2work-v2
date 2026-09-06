"use client";

/**
 * Défilement lissé du site public.
 *
 * ── Ce que ça fait ──────────────────────────────────────────────────────────
 *
 * `ScrollSmoother` immobilise le contenu réel dans un conteneur fixe et le
 * translate lui-même, avec un retard sur la position native. La molette ou le
 * doigt ne déplacent plus la page directement : ils déplacent une CIBLE, que le
 * contenu rattrape image par image. D'où l'inertie.
 *
 * Le greffon est fourni avec GSAP depuis la version 3.13 : rien à installer, et
 * `ScrollTrigger` s'y synchronise tout seul. Les animations déjà en place
 * (`Reveal`, `SceneScrub`) continuent donc de se déclencher au bon moment, sans
 * qu'on ait à leur brancher un proxy de défilement — ce qu'une bibliothèque
 * tierce aurait exigé.
 *
 * ── Pourquoi le site PUBLIC seulement ───────────────────────────────────────
 *
 * Une inertie de défilement se justifie sur des pages qui se parcourent, où le
 * mouvement fait partie de la lecture. Sur un tableau de bord, un tableau de
 * candidatures ou un formulaire, elle rend l'interface IMPRÉCISE : on vise une
 * ligne, la page continue de glisser, on corrige. Les espaces jeune, entreprise
 * et administration gardent donc le défilement natif.
 *
 * ── Trois précautions ───────────────────────────────────────────────────────
 *
 * 1. MOUVEMENT RÉDUIT. C'est exactement le genre d'effet qui provoque des
 *    nausées chez les personnes sensibles aux troubles vestibulaires, et GSAP
 *    échappe à la règle `prefers-reduced-motion` de `globals.css`, qui ne
 *    neutralise que les transitions CSS. Sous ce réglage, le lisseur n'est pas
 *    créé du tout : le défilement reste strictement natif.
 *
 * 2. TACTILE INTACT. `smoothTouch: 0` — la valeur par défaut, réaffirmée ici
 *    pour qu'elle soit lue comme un choix. Un téléphone a déjà son inertie,
 *    native et calibrée par le système ; en superposer une seconde donne cette
 *    sensation de glissement mou qu'on reproche aux sites « animés ».
 *
 * 3. L'EN-TÊTE RESTE DEHORS. Un élément `position: fixed` placé dans le
 *    conteneur translaté se positionnerait par rapport à lui, et suivrait donc
 *    le défilement au lieu de rester en place. `PublicHeader` est monté avant
 *    l'enveloppe, jamais dedans.
 */
import { useRef } from "react";
import { gsap, ScrollSmoother, useGSAP } from "./gsap-client";

export function DefilementDoux({ children }: { children: React.ReactNode }) {
  const enveloppe = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const lisseur = ScrollSmoother.create({
          wrapper: enveloppe.current,
          content: "#contenu-lisse",
          /*
           * Durée, en secondes, que met le contenu à rattraper la position
           * réelle. Au-delà de ~1,5 s le site paraît répondre en retard ; en
           * dessous de ~0,6 s l'effet ne se distingue plus du natif.
           */
          smooth: 1,
          smoothTouch: 0,
          /*
           * `data-speed` et `data-lag` non utilisés : les activer ferait
           * parcourir le DOM à chaque rafraîchissement pour n'y rien trouver.
           */
          effects: false,
        });

        // Rendre le lisseur au démontage : sans cela, une navigation vers
        // l'espace jeune laisserait un conteneur fixe et un contenu translaté
        // sur une page qui ne les attend pas.
        return () => lisseur.kill();
      });

      return () => mm.revert();
    },
    { scope: enveloppe },
  );

  return (
    <div ref={enveloppe}>
      {/*
        `min-h-screen flex flex-col` reproduit ici ce que `body` faisait : une
        fois l'enveloppe passée en `position: fixed` par le greffon, le pied de
        page perd son point d'appui et remonterait sous le contenu sur les pages
        courtes.
      */}
      <div id="contenu-lisse" className="flex min-h-screen flex-col">
        {children}
      </div>
    </div>
  );
}
