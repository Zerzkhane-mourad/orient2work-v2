"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./icon";
import {
  COURBE_SORTIE,
  DUREE_FEUILLE,
  DUREE_MENU,
  DUREE_PANNEAU,
  DUREE_VOILE,
  useEcranLarge,
  useTransitionUI,
} from "@/components/motion/transitions";
import { cn } from "@/lib/utils";
import { Z_LAYERS } from "@/lib/z-layers";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Sticky action bar rendered at the bottom (usually Cancel / Save). */
  footer?: React.ReactNode;
  size?: "md" | "lg";
}

/**
 * Accessible dialog: portalled, Escape to dismiss, backdrop click to dismiss,
 * body scroll locked while open, and focus moved into the panel — then given
 * back to whatever opened it.
 *
 * ── Le mouvement ────────────────────────────────────────────────────────────
 *
 * Le panneau MONTE en se posant, le voile se fond derrière lui. La boîte
 * apparaissait jusqu'ici d'une image à l'autre, en même temps que la page
 * s'assombrissait : rien ne reliait le bouton qu'on venait d'actionner à la
 * surface qui recouvrait l'écran, et la fermeture était un simple escamotage.
 *
 * Un trajet PAR ANCRAGE, et non une course commune :
 *
 *  • Mobile — feuille collée en bas : elle part de SOUS le bord inférieur
 *    (`y: 100%`) et monte de toute sa hauteur, comme la feuille « Plus » de
 *    l'Espace Jeune. La course commune de 24 px la faisait surgir déjà presque
 *    en place : sur un téléphone, on ne voyait qu'un fondu, et rien ne disait
 *    qu'elle venait du bas ni qu'elle y retournerait.
 *  • Au-delà de `sm` — boîte centrée : elle s'avance de 24 px en grandissant
 *    à peine. Traverser tout l'écran depuis le bas serait ici un trajet
 *    démesuré pour une surface qui se pose au milieu.
 *
 * Le bon trajet est choisi par `useEcranLarge`, le CSS gardant seul la charge
 * du placement.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const large = useEcranLarge();

  // La feuille traverse une bonne part de l'écran : il lui faut la durée des
  // feuilles, pas celle d'une boîte qui ne bouge que de 24 px.
  const transitionEntree = useTransitionUI(large ? DUREE_PANNEAU : DUREE_FEUILLE);
  const transitionSortie = useTransitionUI(large ? DUREE_MENU : DUREE_PANNEAU, COURBE_SORTIE);
  const transitionVoile = useTransitionUI(DUREE_VOILE);

  /*
   * Position de repos hors écran, commune à l'entrée et à la sortie : la
   * surface repart par le chemin qui l'a amenée.
   *
   * La feuille ne se fond pas : opaque de bout en bout, elle GLISSE. Un fondu
   * ajouté au glissement la ferait paraître traverser le voile au lieu de
   * passer devant.
   */
  const horsEcran = large ? { opacity: 0, y: 24, scale: 0.98 } : { opacity: 1, y: "100%", scale: 1 };

  /*
   * `onClose` gardé dans une ref, et l'effet d'ouverture ne dépend QUE de `open`.
   *
   * Les appelants passent normalement une fonction définie dans leur corps de
   * composant, donc recréée à chaque rendu. Si l'effet en dépendait, il se
   * rejouerait à chaque frappe dans un champ de la modale — et son
   * `panelRef.focus()` volerait le focus après chaque lettre, rendant toute
   * saisie impossible. Un composant ne doit pas se dérégler parce qu'on lui
   * passe un gestionnaire en ligne : c'est l'usage normal de React.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    /*
     * Le focus entre dans le panneau, et RETOURNE d'où il venait.
     *
     * Il n'était jusqu'ici que déplacé : la modale refermée, le focus restait
     * sur un élément détruit et le navigateur le renvoyait au début du
     * document. Au clavier, valider « Modifier mon avis » puis fermer
     * rejetait donc en haut de page, loin du bouton qu'on venait d'utiliser.
     */
    const declencheur = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      declencheur?.focus?.();
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    /*
     * `AnimatePresence` À L'INTÉRIEUR du portail, et non autour de lui.
     *
     * La modale se retirait par un `return null` avant même de créer le
     * portail : il n'y avait donc plus rien à animer au moment de la
     * fermeture. C'est le CONTENU qui est maintenant conditionné, le portail
     * restant en place — vide, il ne produit aucun nœud.
     */
    <AnimatePresence>
      {open && (
        // Empilement en `style` et non en classe : la valeur est partagée avec
        // le menu du `Select`, qui doit passer au-dessus et ne peut la lire que
        // sous forme de nombre. Une seule source, donc aucune dérive possible.
        <div
          style={{ zIndex: Z_LAYERS.modal }}
          className="fixed inset-0 flex items-end justify-center sm:items-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: transitionVoile }}
            exit={{ opacity: 0, transition: transitionVoile }}
            className="absolute inset-0 bg-primary/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={horsEcran}
            animate={{ opacity: 1, y: 0, scale: 1, transition: transitionEntree }}
            /* Sortie plus courte et accélérée : la boîte rend l'écran sans le
               retenir. La même courbe dans les deux sens ferait traîner la
               fermeture, qui n'a rien à faire regarder. */
            exit={{ ...horsEcran, transition: transitionSortie }}
            className={cn(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl bg-surface-container-lowest shadow-level-2 outline-none sm:rounded-xl",
              size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl",
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-4">
              <div>
                <h2 className="font-headline text-lg font-bold text-primary">{title}</h2>
                {description && <p className="text-sm text-on-surface-variant">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="close" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>

            {footer && (
              <footer className="flex justify-end gap-3 border-t border-outline-variant bg-surface-container-low px-6 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
