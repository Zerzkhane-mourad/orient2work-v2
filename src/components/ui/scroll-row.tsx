"use client";

/**
 * Rangée horizontale défilante — filtres, onglets, puces de catégories.
 *
 * Une simple `overflow-x-auto` laissait trois problèmes ouverts :
 *  • RIEN n'indiquait qu'il restait des éléments hors de l'écran ; sur un
 *    portable large, la rangée semblait complète alors qu'elle était coupée ;
 *  • à la souris, il n'existait aucun moyen de faire défiler sans trackpad —
 *    la barre horizontale native est fine, laide, et absente sur macOS ;
 *  • l'élément actif pouvait être hors champ au chargement, si bien qu'on
 *    croyait aucun filtre appliqué.
 *
 * Les dégradés de bord et les flèches n'apparaissent que du côté où il reste
 * réellement quelque chose : une affordance permanente mentirait la moitié du
 * temps.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

interface ScrollRowProps {
  children: React.ReactNode;
  /**
   * Change quand la sélection change : l'élément portant `data-active="true"`
   * est alors ramené dans le champ visible.
   */
  activeKey?: string;
  /** Décrit la rangée pour les technologies d'assistance. */
  "aria-label"?: string;
  className?: string;
}

/** Marge de tolérance : un défilement fractionnaire ne doit pas garder un bord allumé. */
const EPSILON = 2;

export function ScrollRow({
  children,
  activeKey,
  "aria-label": ariaLabel,
  className,
}: ScrollRowProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [debordeGauche, setDebordeGauche] = useState(false);
  const [debordeDroite, setDebordeDroite] = useState(false);

  const mesurer = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth;
    setDebordeGauche(rail.scrollLeft > EPSILON);
    setDebordeDroite(rail.scrollLeft < max - EPSILON);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    mesurer();
    rail.addEventListener("scroll", mesurer, { passive: true });

    // `ResizeObserver` et non `window.resize` : la rangée change aussi de
    // largeur quand un panneau voisin s'ouvre, sans que la fenêtre bouge. Il
    // observe le rail ET son contenu, dont le nombre d'éléments varie.
    const observer = new ResizeObserver(mesurer);
    observer.observe(rail);
    if (rail.firstElementChild) observer.observe(rail.firstElementChild);

    return () => {
      rail.removeEventListener("scroll", mesurer);
      observer.disconnect();
    };
  }, [mesurer]);

  /* Ramène la sélection dans le champ — au chargement comme au changement. */
  useEffect(() => {
    const actif = railRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    actif?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [activeKey]);

  /** Un cran = 80 % de la largeur visible : on garde un repère d'un écran à l'autre. */
  const faireDefiler = (sens: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: sens * rail.clientWidth * 0.8, behavior: "smooth" });
  };

  /**
   * Flèches du clavier : déplacent le FOCUS d'un élément à l'autre.
   *
   * Le navigateur ramène alors lui-même l'élément focalisé dans le champ, ce
   * qui rend la rangée parcourable sans souris.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    const rail = railRef.current;
    if (!rail) return;
    const focusables = Array.from(
      rail.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
    );
    const depuis = focusables.indexOf(document.activeElement as HTMLElement);
    if (depuis === -1) return;

    event.preventDefault();
    const pas = event.key === "ArrowRight" ? 1 : -1;
    focusables[(depuis + pas + focusables.length) % focusables.length]?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={railRef}
        role="group"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className="scrollbar-none flex gap-2 overflow-x-auto scroll-smooth"
      >
        {children}
      </div>

      {/* Dégradés de bord — décoratifs, jamais cliquables. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity duration-200",
          debordeGauche ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-200",
          debordeDroite ? "opacity-100" : "opacity-0",
        )}
      />

      {/*
        Flèches réservées au pointeur fin : au doigt, on fait glisser la rangée,
        et deux boutons flottants ne feraient que masquer des éléments.
        `aria-hidden` + `tabIndex={-1}` : le clavier dispose déjà des flèches,
        les exposer une seconde fois allongerait la tabulation sans rien
        apporter.
      */}
      {debordeGauche && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => faireDefiler(-1)}
          className="absolute left-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-primary shadow-level-1 hover:bg-surface-container [@media(pointer:fine)]:flex"
        >
          <Icon name="chevron_right" className="rotate-180 text-[18px]" />
        </button>
      )}
      {debordeDroite && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => faireDefiler(1)}
          className="absolute right-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-primary shadow-level-1 hover:bg-surface-container [@media(pointer:fine)]:flex"
        >
          <Icon name="chevron_right" className="text-[18px]" />
        </button>
      )}
    </div>
  );
}
