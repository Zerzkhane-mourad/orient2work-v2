"use client";

/**
 * Apparition au défilement.
 *
 * Enveloppe une portion de page ; celle-ci monte et se révèle lorsqu'elle entre
 * dans le champ. `cascade` fait entrer les enfants DIRECTS l'un après l'autre —
 * une grille de cartes, une liste d'avantages.
 *
 * ── Trois précautions qui comptent plus que l'effet lui-même ────────────────
 *
 * 1. LE CONTENU EST VISIBLE SANS JAVASCRIPT. L'état de départ n'est pas posé en
 *    CSS (`opacity-0`), mais par GSAP au moment de l'animation. Une classe
 *    `opacity-0` dans le HTML rendu par le serveur laisserait une page blanche
 *    aux robots d'indexation, aux navigateurs sans JS, et à quiconque subit un
 *    échec de chargement du script.
 *
 * 2. AUCUN CLIGNOTEMENT. `useGSAP` s'exécute dans un `useLayoutEffect`, donc
 *    AVANT le premier affichage : l'état initial est posé sans que l'œil voie
 *    le contenu apparaître puis disparaître.
 *
 * 3. LE MOUVEMENT RÉDUIT EST RESPECTÉ. GSAP anime en JavaScript et échappe
 *    complètement à la règle `prefers-reduced-motion` de `globals.css`, qui ne
 *    neutralise que les transitions CSS. Sans le `matchMedia` ci-dessous, la
 *    page continuerait de bouger malgré le réglage système — exactement la
 *    régression que le reste de l'application évite.
 */
import { useRef } from "react";
import { DECLENCHEMENT, ENTREE, gsap, useGSAP } from "./gsap-client";

interface RevealProps {
  children: React.ReactNode;
  /** Anime les enfants DIRECTS en cascade plutôt que le bloc d'un seul tenant. */
  cascade?: boolean;
  /**
   * Classes du conteneur.
   *
   * Indispensable : en cascade, ce conteneur EST souvent la grille dont on
   * anime les cellules. Insérer un `div` nu entre la grille et ses cellules
   * casserait la mise en page.
   */
  className?: string;
  /** Retard avant le départ, en secondes. Pour enchaîner deux blocs voisins. */
  delai?: number;
  /**
   * Joue dès l'affichage, sans attendre le défilement.
   *
   * Réservé à ce qui est DÉJÀ visible à l'ouverture — la bannière d'accueil.
   * Un déclenchement au défilement y fonctionnerait aussi, mais dirait le
   * contraire de l'intention : rien n'attend ici que l'on descende.
   */
  auChargement?: boolean;
  /**
   * Balise rendue. `div` par défaut.
   *
   * `cascade` anime les ENFANTS DIRECTS du conteneur : pour échelonner les
   * entrées d'une liste, il faut donc que le conteneur SOIT la liste. Sans ce
   * réglage, envelopper un `<ol>` dans un `<div>` animé ne donne qu'une seule
   * cible, et l'échelonnement ne se voit pas.
   *
   * Restreint aux conteneurs de liste : on ne veut pas qu'un appelant en fasse
   * un `<span>` et casse le flux.
   */
  as?: "div" | "ol" | "ul" | "dl";
}

export function Reveal({
  children,
  cascade,
  className,
  delai = 0,
  auChargement,
  as: Balise = "div",
}: RevealProps) {
  const conteneur = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const element = conteneur.current;
        if (!element) return;

        // Les enfants directs en cascade ; sinon le bloc entier.
        const cibles = cascade ? Array.from(element.children) : element;
        if (cascade && (cibles as Element[]).length === 0) return;

        gsap.from(cibles, {
          opacity: 0,
          y: ENTREE.decalage,
          scale: ENTREE.echelle,
          duration: ENTREE.duree,
          ease: ENTREE.courbe,
          delay: delai,
          ...(cascade
            ? {
                /*
                 * `grid: "auto"` laisse GSAP déduire lignes et colonnes de la
                 * grille CSS : les cartes entrent en VAGUE, en diagonale, au
                 * lieu de défiler une à une de gauche à droite. Sur une grille
                 * de quatre colonnes, la différence est nette.
                 */
                stagger: { each: ENTREE.cascade, from: "start", grid: "auto" },
              }
            : {}),
          ...(auChargement
            ? {}
            : {
                scrollTrigger: {
                  trigger: element,
                  start: DECLENCHEMENT,
                  // Une vitrine se lit une fois : rejouer l'entrée à chaque
                  // remontée transformerait le défilement en clignotement.
                  once: true,
                },
              }),
        });
      });

      // `mm.revert()` remet les styles en place ET tue les ScrollTriggers
      // associés. Sans lui, une navigation vers une autre page laisserait des
      // observateurs actifs sur des nœuds détachés.
      return () => mm.revert();
    },
    { scope: conteneur, dependencies: [cascade, delai, auChargement] },
  );

  return (
    // `as never` : la balise est choisie dans une union fermée, mais TypeScript
    // ne peut pas rapprocher la ref commune des quatre types d'élément.
    <Balise ref={conteneur as never} className={className}>
      {children}
    </Balise>
  );
}
