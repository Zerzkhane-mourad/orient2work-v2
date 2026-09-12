"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MdStar, MdStarOutline } from "react-icons/md";
import { DUREE_MENU, useTransitionUI } from "@/components/motion/transitions";
import { cn } from "@/lib/utils";

const LABELS: Record<number, string> = {
  1: "Décevant",
  2: "Moyen",
  3: "Correct",
  4: "Très bien",
  5: "Excellent",
};

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  /** Star size in px. */
  size?: number;
}

/**
 * Interactive 1–5 star picker with hover preview (Udemy-style).
 *
 * ── Ce que le mouvement apporte ─────────────────────────────────────────────
 *
 * C'est le seul champ OBLIGATOIRE du formulaire d'avis, et le seul qui ne
 * ressemble pas à un champ. Les étoiles se remplissaient sans un geste : rien
 * ne distinguait un survol de passage d'une note réellement posée, et il
 * fallait relire le libellé sous les étoiles pour en être sûr.
 *
 * Le ressort ne décore donc pas — il ACCUSE RÉCEPTION. Les étoiles retenues se
 * détendent à pleine taille, les autres restent légèrement en retrait ; la
 * pression enfonce l'étoile sous le doigt, là où un `hover:scale` en CSS ne
 * disait rien au toucher, qui ne survole jamais.
 */
export function StarRatingInput({ value, onChange, size = 36 }: StarRatingInputProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const reduire = useReducedMotion();
  const transitionLibelle = useTransitionUI(DUREE_MENU);

  /*
   * Ressort plutôt que durée : une étoile qui dépasse sa taille puis revient
   * imite la matière, et c'est ce léger dépassement qui se lit comme « c'est
   * pris ». Sous « mouvement réduit », l'étoile prend sa taille finale sans
   * course — l'information reste, l'élan disparaît.
   */
  const ressort = reduire
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 520, damping: 24 };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((star) => {
          const retenue = star <= shown;
          const Star = retenue ? MdStar : MdStarOutline;
          return (
            <motion.button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} étoile${star > 1 ? "s" : ""} — ${LABELS[star]}`}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onBlur={() => setHover(0)}
              onClick={() => onChange(star)}
              /* `whileTap` et non `active:` en CSS : l'enfoncement se voit
                 aussi au doigt, qui n'a pas d'état de survol. */
              whileTap={reduire ? undefined : { scale: 0.86 }}
              className="rounded p-0.5 text-secondary-fixed-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <motion.span
                animate={{ scale: retenue ? 1 : 0.88 }}
                transition={ressort}
                className="block"
              >
                <Star style={{ width: size, height: size }} />
              </motion.span>
            </motion.button>
          );
        })}
      </div>

      {/*
        Le libellé se relaie au lieu de se remplacer.

        Il changeait d'un mot à l'autre sans transition en balayant les
        étoiles : « Moyen », « Correct », « Très bien » clignotaient plus vite
        qu'ils ne se lisaient. Hauteur réservée et positionnement absolu — sans
        eux, passer de « Sélectionnez une note » à « Excellent » ferait sauter
        de quelques pixels tout ce qui suit dans le formulaire.
      */}
      <div className="relative h-5 w-full">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.p
            key={shown}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transitionLibelle}
            className={cn(
              "absolute inset-0 text-center text-sm font-semibold",
              shown ? "text-primary" : "text-on-surface-variant",
            )}
          >
            {shown ? LABELS[shown] : "Sélectionnez une note"}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
