"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button, Icon } from "@/components/ui";
import { libelleCompteur, libelleNonLues } from "../lib/liste";
import { IMMOBILE } from "../motion";

/** Rebond plus marqué que celui des filtres : c'est le compteur principal. */
const REBOND_ENTETE = { type: "spring", stiffness: 500, damping: 18 } as const;

/**
 * Bandeau d'en-tête de la page — bleu nuit et or, comme les autres écrans.
 *
 * L'action « Tout marquer comme lu » y vit : elle agit sur toute la page, sa
 * place est en tête. `primary-container` reste profond dans tous les thèmes,
 * y compris sombre, sous un texte blanc.
 */
export function EnteteNotifications({
  unread,
  loading,
  onMarkAllRead,
}: {
  unread: number;
  loading: boolean;
  onMarkAllRead: () => void;
}) {
  const reduire = useReducedMotion();

  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary-container px-5 py-6 text-white shadow-level-1 sm:px-8 sm:py-7">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-secondary-container/20 blur-3xl"
      />
      <Icon
        name="notifications"
        className="pointer-events-none absolute -bottom-6 right-6 hidden text-[130px] text-white/[0.05] sm:block"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container shadow-level-1">
            <Icon
              name={unread > 0 ? "notifications_active" : "notifications"}
              className="text-[28px]"
            />
            {unread > 0 && (
              <motion.span
                key={unread}
                aria-hidden
                initial={reduire ? false : { scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={reduire ? IMMOBILE : REBOND_ENTETE}
                className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-error px-1.5 text-xs font-bold text-on-error ring-2 ring-primary-container"
              >
                {libelleCompteur(unread)}
              </motion.span>
            )}
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="font-headline text-2xl font-bold leading-tight sm:text-3xl">
              Notifications
            </h1>
            <p className="text-sm text-white/80">
              {loading ? "Chargement…" : unread > 0 ? libelleNonLues(unread) : "Vous êtes à jour"}
            </p>
          </div>
        </div>

        {unread > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onMarkAllRead}
            className="self-start sm:self-auto"
          >
            <Icon name="check_circle" className="text-[18px]" /> Tout marquer comme lu
          </Button>
        )}
      </div>
    </section>
  );
}
