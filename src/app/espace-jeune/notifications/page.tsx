import Link from "next/link";
import { Card, CardBody, EmptyState, Icon } from "@/components/ui";
import { jeuneNotifications } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const notifications = jeuneNotifications;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-xl font-bold text-primary">Notifications</h1>
            <p className="text-sm text-on-surface-variant">
              {unread > 0 ? `${unread} nouvelle(s) notification(s)` : "Vous êtes à jour"}
            </p>
          </div>
          <button className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            <Icon name="check_circle" className="text-[18px]" /> Tout marquer comme lu
          </button>
        </CardBody>
      </Card>

      {notifications.length === 0 ? (
        <EmptyState icon="notifications" title="Aucune notification" />
      ) : (
        <Card>
          <div className="divide-y divide-outline-variant">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.href ?? "#"}
                className={cn(
                  "flex gap-4 px-5 py-4 transition-colors hover:bg-surface-container-low",
                  !n.read && "bg-surface-container-low",
                )}
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
                {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
