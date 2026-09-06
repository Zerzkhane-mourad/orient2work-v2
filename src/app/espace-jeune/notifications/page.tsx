"use client";

import Link from "next/link";
import { Card, CardBody, EmptyState, ErrorState, Icon, SkeletonList } from "@/components/ui";
import { useNotifications } from "@/features/notifications/use-notifications";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { notifications, unread, loading, error, refetch, markRead, markAllRead, remove } =
    useNotifications(50);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-xl font-bold text-primary">Notifications</h1>
            <p className="text-sm text-on-surface-variant">
              {loading
                ? "Chargement…"
                : unread > 0
                  ? `${unread} nouvelle(s) notification(s)`
                  : "Vous êtes à jour"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unread === 0}
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline disabled:opacity-40 disabled:hover:no-underline"
          >
            <Icon name="check_circle" className="text-[18px]" /> Tout marquer comme lu
          </button>
        </CardBody>
      </Card>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications"
          title="Aucune notification"
          description="Vous serez prévenu ici dès qu'une entreprise consulte votre profil ou répond à une candidature."
        />
      ) : (
        <Card>
          <div className="divide-y divide-outline-variant">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "group flex gap-4 px-5 py-4 transition-colors hover:bg-surface-container-low",
                  !n.read && "bg-surface-container-low",
                )}
              >
                <Link
                  href={n.href ?? "#"}
                  onClick={() => {
                    if (!n.read) void markRead(n.id);
                  }}
                  className="flex min-w-0 flex-1 gap-4"
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                      n.accent
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container text-on-surface-variant",
                    )}
                  >
                    <Icon name={n.icon} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-on-surface">{n.title}</p>
                    {n.detail && <p className="text-sm text-on-surface-variant">{n.detail}</p>}
                    <p className="mt-0.5 text-xs text-on-surface-variant">{n.time}</p>
                  </div>
                </Link>

                <div className="flex shrink-0 items-start gap-1">
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      title="Marquer comme lue"
                      aria-label="Marquer comme lue"
                      className="rounded-full p-1.5 hover:bg-surface-container"
                    >
                      <span className="block h-2.5 w-2.5 rounded-full bg-secondary" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(n.id)}
                    title="Supprimer"
                    aria-label="Supprimer la notification"
                    className="rounded-full p-1.5 text-on-surface-variant opacity-0 transition-opacity hover:bg-error-container hover:text-error focus:opacity-100 group-hover:opacity-100"
                  >
                    <Icon name="close" className="text-[16px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
