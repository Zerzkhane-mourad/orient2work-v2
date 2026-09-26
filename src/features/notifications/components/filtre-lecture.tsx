"use client";

/**
 * Sélecteur « Toutes / Non lues » — le même pour la cloche et la page.
 *
 * Il existait en deux copies, avec deux clés différentes (`non_lues`,
 * `non-lues`) et deux réglages d'animation : un même geste qui ne se comportait
 * pas pareil selon l'écran. Seule la TAILLE varie désormais.
 */
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Icon, type IconName } from "@/components/ui";
import { DUREE_PANNEAU, useTransitionUI } from "@/components/motion/transitions";
import { cn } from "@/lib/utils";
import { libelleCompteur } from "../lib/liste";
import { IMMOBILE, REBOND } from "../motion";
import type { FiltreLecture as Filtre } from "../types";

interface FiltreLectureProps {
  filtre: Filtre;
  onChange: (filtre: Filtre) => void;
  total: number;
  unread: number;
  /** `compact` : pleine largeur, sans icônes — la cloche. `normal` : la page. */
  taille?: "compact" | "normal";
  className?: string;
}

interface Option {
  cle: Filtre;
  libelle: string;
  icon: IconName;
}

const OPTIONS: readonly Option[] = [
  { cle: "toutes", libelle: "Toutes", icon: "inbox" },
  { cle: "non-lues", libelle: "Non lues", icon: "mail" },
];

export function FiltreLecture({
  filtre,
  onChange,
  total,
  unread,
  taille = "normal",
  className,
}: FiltreLectureProps) {
  // Propre à l'instance : la cloche et la page, montées ensemble, ne doivent
  // pas se disputer la même pastille.
  const pastilleId = `filtre-lecture-${useId()}`;
  const glisse = useTransitionUI(DUREE_PANNEAU);
  const compact = taille === "compact";

  return (
    <div
      role="group"
      aria-label="Filtrer les notifications"
      className={cn(
        "rounded-full bg-surface-container p-1",
        compact ? "grid grid-cols-2 gap-1" : "inline-flex shadow-inner",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const actif = filtre === option.cle;
        const compte = option.cle === "toutes" ? total : unread;
        return (
          <button
            key={option.cle}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(option.cle)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-full transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
              compact ? "min-h-8 text-xs font-bold" : "min-h-10 px-4 text-sm font-semibold",
              actif ? "text-primary" : "text-on-surface-variant hover:text-primary",
            )}
          >
            {/* UNE pastille partagée (`layoutId`) qui glisse d'un filtre à l'autre. */}
            {actif && (
              <motion.span
                layoutId={pastilleId}
                transition={glisse}
                className="absolute inset-0 rounded-full bg-surface-container-lowest shadow-level-1"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {!compact && <Icon name={option.icon} className="text-[16px]" />}
              {option.libelle}
              {compte > 0 && (
                <Compteur
                  valeur={compte}
                  alerte={option.cle === "non-lues" && (actif || !compact)}
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Compteur de filtre : rebondit à chaque changement de valeur. */
function Compteur({ valeur, alerte }: { valeur: number; alerte: boolean }) {
  const reduire = useReducedMotion();
  return (
    <motion.span
      // Nouvelle clé = nouvel élément : c'est ce qui rejoue le rebond.
      key={valeur}
      initial={reduire ? false : { scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={reduire ? IMMOBILE : REBOND}
      className={cn(
        "rounded-full px-1.5 text-[11px] font-bold leading-4 tabular-nums transition-colors duration-200",
        alerte ? "bg-error text-on-error" : "bg-surface-container-high text-primary",
      )}
    >
      {libelleCompteur(valeur)}
    </motion.span>
  );
}
