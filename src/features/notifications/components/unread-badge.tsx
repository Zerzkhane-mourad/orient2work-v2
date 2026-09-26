"use client";

import { motion } from "framer-motion";
import { DUREE_MENU, useTransitionUI } from "@/components/motion/transitions";
import { cn } from "@/lib/utils";
import { libelleBadge } from "../lib/liste";

/**
 * Pastille chiffrée posée sur une icône.
 *
 * Plafonnée à « 9+ » : au-delà, le nombre exact n'aide plus à décider, et une
 * pastille qui s'élargit déborde de l'icône. Elle rebondit brièvement quand le
 * compteur change — c'est le seul signal qu'une notification vient d'arriver.
 * Décorative (`aria-hidden`) : le nombre est porté par le libellé du bouton.
 */
export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  const transition = useTransitionUI(DUREE_MENU);
  if (count <= 0) return null;
  const libelle = libelleBadge(count);

  return (
    <motion.span
      key={libelle}
      aria-hidden
      initial={{ scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={transition}
      className={cn(
        "absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-on-error ring-2 ring-surface-container-lowest",
        className,
      )}
    >
      {libelle}
    </motion.span>
  );
}
