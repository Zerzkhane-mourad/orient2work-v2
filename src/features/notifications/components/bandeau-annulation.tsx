"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui";
import { DUREE_MENU, useTransitionUI } from "@/components/motion/transitions";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * « Notification supprimée · Annuler ».
 *
 * La région `aria-live` reste montée en permanence : un lecteur d'écran
 * n'annonce pas une région qui apparaît déjà remplie, seulement celle dont le
 * contenu change.
 */
export function BandeauAnnulation({
  removed,
  onUndo,
  bottomNav,
}: {
  removed: Notification | null;
  onUndo: () => void;
  /** Réserve la hauteur de la barre d'onglets mobile. */
  bottomNav?: boolean;
}) {
  const transition = useTransitionUI(DUREE_MENU);

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-4 z-50 flex justify-center sm:bottom-6",
        bottomNav ? "bottom-20" : "bottom-4",
      )}
    >
      <AnimatePresence>
        {removed && (
          <motion.div
            key={removed.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition }}
            exit={{ opacity: 0, y: 16, transition }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full bg-inverse-surface py-2 pl-5 pr-2 text-sm text-inverse-on-surface shadow-level-2"
          >
            <span className="flex-1">Notification supprimée</span>
            <button
              type="button"
              onClick={onUndo}
              className="flex min-h-9 items-center gap-1 rounded-full px-3 font-semibold text-inverse-primary transition-colors hover:bg-inverse-on-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-primary"
            >
              <Icon name="undo" className="text-[18px]" /> Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
