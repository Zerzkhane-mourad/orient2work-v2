"use client";

/**
 * Page « Notifications », commune aux espaces Jeune et Entreprise.
 *
 * Regroupée par jour : une liste plate de cinquante lignes ne disait pas ce qui
 * était récent, et « Il y a 3 jours » répété dix fois se lisait mal. Filtre
 * « Non lues » pour traiter ce qui reste, pagination à la demande plutôt qu'une
 * troncature silencieuse à cinquante éléments.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, Card, EmptyState, ErrorState, Icon } from "@/components/ui";
import { DUREE_PANNEAU, useTransitionUI } from "@/components/motion/transitions";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BandeauAnnulation } from "./components/bandeau-annulation";
import { EnteteNotifications } from "./components/entete-notifications";
import { FiltreLecture } from "./components/filtre-lecture";
import { useFiltreLecture } from "./hooks/use-filtre-lecture";
import { filtrer, grouperParPeriode } from "./lib/liste";
import { APPARITION, CASCADE, GLISSEMENT } from "./motion";
import { NotificationItem, NotificationItemSkeleton } from "./notification-item";
import { useNotifications } from "./notifications-store";
import type { GroupePeriode, NotificationsViewProps, Periode, StylePeriode } from "./types";

/**
 * Une teinte par ancienneté : l'or pour ce qui vient d'arriver, puis de plus
 * en plus neutre à mesure qu'on remonte le temps. Table EXHAUSTIVE sur
 * `Periode` : une période ajoutée ne compile pas tant qu'elle n'a pas de style.
 */
const STYLE_PERIODE: Record<Periode, StylePeriode> = {
  "Aujourd'hui": { pastille: "bg-secondary-container text-on-secondary-container", icon: "bolt" },
  Hier: { pastille: "bg-primary/10 text-primary", icon: "schedule" },
  "Cette semaine": { pastille: "bg-surface-container-high text-primary", icon: "calendar_month" },
  "Plus anciennes": { pastille: "bg-surface-container text-on-surface-variant", icon: "work_history" },
};

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
  const { filtre, sens, changer } = useFiltreLecture();
  const glisse = useTransitionUI(DUREE_PANNEAU);
  const reduire = useReducedMotion();

  const visibles = filtrer(notifications, filtre);

  const contenu = loading ? (
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
        <Button variant="secondary" size="sm" onClick={() => changer("toutes")}>
          Voir toutes les notifications
        </Button>
      }
    />
  ) : (
    // Cascade orchestrée : chaque groupe hérite de l'état du conteneur.
    <motion.div
      variants={reduire ? undefined : CASCADE}
      initial="cache"
      animate="visible"
      className="space-y-5"
    >
      {grouperParPeriode(visibles).map((groupe) => (
        <GroupeCarte
          key={groupe.periode}
          groupe={groupe}
          anime={!reduire}
          onOpen={(n) => void markRead(n.id)}
          onMarkRead={(id) => void markRead(id)}
          onRemove={remove}
        />
      ))}
    </motion.div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <EnteteNotifications
        unread={unread}
        loading={loading}
        onMarkAllRead={() => void markAllRead()}
      />

      {!loading && !error && notifications.length > 0 && (
        <FiltreLecture
          filtre={filtre}
          onChange={changer}
          total={notifications.length}
          unread={unread}
        />
      )}

      {/*
        `overflow-x-clip` : le glissement latéral ne fait pas surgir de barre
        horizontale ; marge négative pour laisser passer l'ombre des cartes.
      */}
      <div className="-mx-3 overflow-x-clip px-3">
        <AnimatePresence mode="wait" initial={false} custom={sens}>
          <motion.div
            key={filtre}
            custom={sens}
            variants={GLISSEMENT}
            initial="entree"
            animate="present"
            exit="sortie"
            transition={glisse}
          >
            {contenu}
          </motion.div>
        </AnimatePresence>
      </div>

      {!loading && hasMore && (
        <ChargerPlus
          loadingMore={loadingMore}
          failed={loadMoreFailed}
          onLoadMore={() => void loadMore()}
        />
      )}

      <BandeauAnnulation removed={removed} onUndo={undoRemove} bottomNav={bottomNav} />
    </div>
  );
}

/* ── Sous-composants ──────────────────────────────────────────────────────── */

function GroupeCarte({
  groupe,
  anime,
  onOpen,
  onMarkRead,
  onRemove,
}: {
  groupe: GroupePeriode;
  anime: boolean;
  onOpen: (notification: Notification) => void;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const style = STYLE_PERIODE[groupe.periode];

  return (
    <motion.section
      variants={anime ? APPARITION : undefined}
      aria-label={groupe.periode}
      className="space-y-2"
    >
      <h2 className="flex items-center gap-2 px-1">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
            style.pastille,
          )}
        >
          <Icon name={style.icon} className="text-[14px]" />
          {groupe.periode}
        </span>
        <span className="text-xs font-semibold tabular-nums text-on-surface-variant">
          {groupe.items.length}
        </span>
        <span aria-hidden className="h-px flex-1 bg-outline-variant" />
      </h2>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-outline-variant">
          {groupe.items.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onOpen={onOpen}
              onMarkRead={onMarkRead}
              onRemove={onRemove}
            />
          ))}
        </ul>
      </Card>
    </motion.section>
  );
}

function ChargerPlus({
  loadingMore,
  failed,
  onLoadMore,
}: {
  loadingMore: boolean;
  failed: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      {failed && (
        <p className="text-sm text-error" role="alert">
          Le chargement a échoué.
        </p>
      )}
      <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loadingMore}>
        {loadingMore ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-secondary" />
            Chargement…
          </>
        ) : (
          <>
            <Icon name={failed ? "refresh" : "expand_more"} className="text-[18px]" />
            {failed ? "Réessayer" : "Afficher plus"}
          </>
        )}
      </Button>
    </div>
  );
}
