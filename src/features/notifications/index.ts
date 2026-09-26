/**
 * API publique du module notifications.
 *
 * Ce qui est exporté ici est le contrat avec le reste de l'application ; tout
 * le reste (hooks internes, fonctions de liste, mouvements) peut changer sans
 * prévenir. Les chemins profonds historiques restent valides.
 */
export { NotificationBell } from "./notification-bell";
export { NotificationItem, NotificationItemSkeleton } from "./notification-item";
export { NotificationsProvider, useNotifications } from "./notifications-store";
export { NotificationsView } from "./notifications-view";
export { UnreadBadge } from "./components/unread-badge";
export { UNDO_MS } from "./constants";
export type {
  Densite,
  NotificationBellProps,
  NotificationItemProps,
  NotificationsState,
  NotificationsViewProps,
} from "./types";
