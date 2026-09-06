"use client";

/**
 * Retour en haut de page.
 *
 * Les listes vont jusqu'à cent lignes : arrivé au bas, remonter aux filtres
 * demandait une dizaine de gestes au doigt. Le bouton n'apparaît qu'à partir
 * d'un écran et demi de défilement — plus tôt, il occuperait le coin de
 * l'écran sans jamais servir.
 *
 * Il s'efface en descendant plutôt que de disparaître d'un coup : sans
 * transition, une pastille qui surgit dans le champ de vision attire l'œil
 * comme une alerte.
 */
import { Icon } from "./icon";
import { useDefilement } from "@/lib/use-defilement";
import { cn } from "@/lib/utils";

/** Un écran et demi : au-delà, le haut de page n'est plus à portée de geste. */
const SEUIL_PX = 1200;

export function RetourEnHaut({ className }: { className?: string }) {
  const visible = useDefilement(SEUIL_PX);

  const remonter = () => {
    /*
     * `behavior: "smooth"` seulement si l'utilisateur n'a pas demandé moins de
     * mouvement : un défilement animé de plusieurs milliers de pixels est
     * exactement ce qui déclenche les vertiges vestibulaires.
     */
    const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: mouvementReduit ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={remonter}
      // Retiré de la tabulation quand il est invisible : sinon le clavier
      // atteint un bouton que personne ne voit.
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Revenir en haut de la page"
      className={cn(
        "fixed bottom-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full",
        "border border-outline-variant bg-surface-container-lowest text-primary shadow-level-2",
        "transition-all duration-200 hover:bg-surface-container",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        className,
      )}
    >
      <Icon name="arrow_forward" className="-rotate-90 text-[20px]" />
    </button>
  );
}
