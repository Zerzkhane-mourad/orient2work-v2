"use client";

/**
 * Page « Notifications », commune aux espaces Jeune et Entreprise.
 *
 * Regroupée par jour : une liste plate de cinquante lignes ne disait pas ce qui
 * était récent, et « Il y a 3 jours » répété dix fois se lisait mal. Filtre
 * « Non lues » pour traiter ce qui reste, pagination à la demande plutôt qu'une
 * troncature silencieuse à cinquante éléments.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Card, EmptyState, ErrorState, Icon, PageHeader } from "@/components/ui";
import { DUREE_MENU, useTransitionUI } from "@/components/motion/transitions";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NotificationItem, NotificationItemSkeleton } from "./notification-item";
import { useNotifications } from "./notifications-store";

type Filtre = "toutes" | "non-lues";

interface NotificationsViewProps {
  /** Ce que l'espace recevra ici — affiché tant que la liste est vide. */
  emptyDescription: string;
  /** Réserve la hauteur de la barre d'onglets mobile sous le bandeau d'annulation. */
  bottomNav?: boolean;
}

export function NotificationsView({ emptyDescription, bottomNav }: NotificationsViewProps) {
  const {
    notifications,
    unread,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMoreFailed,
    removed,
    refetch,
    loadMore,
    markRead,
    markAllRead,
    remove,
    undoRemove,
  } = useNotifications();
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  const visibles = filtre === "non-lues" ? notifications.filter((n) => !n.read) : notifications;
  const groupes = grouperParJour(visibles);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Notifications"
        subtitle={
          loading
            ? "Chargement…"
            : unread > 0
              ? `${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}`
              : "Vous êtes à jour"
        }
        actions={
          unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
              <Icon name="check_circle" className="text-[18px]" /> Tout marquer comme lu
            </Button>
          )
        }
      />

      {!loading && !error && notifications.length > 0 && (
        <div
          role="group"
          aria-label="Filtrer les notifications"
          className="inline-flex rounded-full bg-surface-container p-1"
        >
          <FiltreBouton actif={filtre === "toutes"} onClick={() => setFiltre("toutes")}>
            Toutes
          </FiltreBouton>
          <FiltreBouton actif={filtre === "non-lues"} onClick={() => setFiltre("non-lues")}>
            Non lues
            {unread > 0 && (
              <span className="rounded-full bg-error px-1.5 text-[11px] font-bold leading-4 text-on-error">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </FiltreBouton>
        </div>
      )}

      {loading ? (
        <Card className="overflow-hidden">
          <ul aria-label="Chargement des notifications" className="divide-y divide-outline-variant">
            {Array.from({ length: 5 }).map((_, i) => (
              <NotificationItemSkeleton key={i} />
            ))}
          </ul>
        </Card>
      ) : error && notifications.length === 0 ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications" title="Aucune notification" description={emptyDescription} />
      ) : visibles.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="Tout est lu"
          description="Aucune notification en attente. Les suivantes apparaîtront ici."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFiltre("toutes")}>
              Voir toutes les notifications
            </Button>
          }
        />
      ) : (
        groupes.map((groupe) => (
          <section key={groupe.libelle} aria-label={groupe.libelle} className="space-y-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {groupe.libelle}
            </h2>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-outline-variant">
                {groupe.items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onOpen={() => void markRead(n.id)}
                    onMarkRead={(id) => void markRead(id)}
                    onRemove={remove}
                  />
                ))}
              </ul>
            </Card>
          </section>
        ))
      )}

      {!loading && hasMore && (
        <div className="flex flex-col items-center gap-2 pt-1">
          {loadMoreFailed && (
            <p className="text-sm text-error" role="alert">
              Le chargement a échoué.
            </p>
          )}
          <Button variant="ghost" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-secondary" />
                Chargement…
              </>
            ) : (
              <>
                <Icon name={loadMoreFailed ? "refresh" : "expand_more"} className="text-[18px]" />
                {loadMoreFailed ? "Réessayer" : "Afficher plus"}
              </>
            )}
          </Button>
        </div>
      )}

      <BandeauAnnulation removed={removed} onUndo={undoRemove} bottomNav={bottomNav} />
    </div>
  );
}

function FiltreBouton({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={cn(
        "flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
        actif
          ? "bg-surface-container-lowest text-primary shadow-sm"
          : "text-on-surface-variant hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

/**
 * « Notification supprimée · Annuler ».
 *
 * La région `aria-live` reste montée en permanence : un lecteur d'écran
 * n'annonce pas une région qui apparaît déjà remplie, seulement celle dont le
 * contenu change.
 */
function BandeauAnnulation({
  removed,
  onUndo,
  bottomNav,
}: {
  removed: Notification | null;
  onUndo: () => void;
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

/** Groupes « Aujourd'hui / Hier / Cette semaine / Plus anciennes », dans l'ordre reçu. */
function grouperParJour(items: Notification[]): { libelle: string; items: Notification[] }[] {
  const maintenant = new Date();
  const debutJour = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    maintenant.getDate(),
  ).getTime();
  const JOUR = 86_400_000;

  const libelleDe = (iso: string) => {
    const t = new Date(iso).getTime();
    if (t >= debutJour) return "Aujourd'hui";
    if (t >= debutJour - JOUR) return "Hier";
    if (t >= debutJour - 6 * JOUR) return "Cette semaine";
    return "Plus anciennes";
  };

  const groupes: { libelle: string; items: Notification[] }[] = [];
  for (const n of items) {
    const libelle = libelleDe(n.createdAt);
    const dernier = groupes.at(-1);
    if (dernier?.libelle === libelle) dernier.items.push(n);
    else groupes.push({ libelle, items: [n] });
  }
  return groupes;
}
