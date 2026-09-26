/**
 * Types du module notifications.
 *
 * Réunis ici, et non dispersés dans les composants : le contrat du magasin, les
 * props publiques et les formes internes se lisent au même endroit, et un
 * composant peut changer de forme sans que ses types voyagent avec lui.
 */
import type { IconName } from "@/components/ui";
import type { ApiError } from "@/lib/api/errors";
import type { Notification } from "@/lib/types";

/* ── Magasin ──────────────────────────────────────────────────────────────── */

/** Ce que `useNotifications()` expose à tous les écrans d'un espace. */
export interface NotificationsState {
  notifications: Notification[];
  unread: number;
  /** Premier chargement uniquement — les rafraîchissements sont silencieux. */
  loading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  /** Dernière notification supprimée, tant que la suppression est annulable. */
  removed: Notification | null;
  refetch: () => void;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => void;
  undoRemove: () => void;
}

/** Suppression différée, en attente de validation ou d'annulation. */
export interface PendingRemoval {
  item: Notification;
  /** Position d'origine — l'annulation y réinsère la ligne. */
  index: number;
  timer: ReturnType<typeof setTimeout>;
}

/* ── Filtre « Toutes / Non lues » ─────────────────────────────────────────── */

/** Filtre de lecture, partagé par la cloche et la page. */
export type FiltreLecture = "toutes" | "non-lues";

/** Sens du dernier changement de filtre : +1 vers la droite, -1 vers la gauche. */
export type Sens = 1 | -1;

/* ── Regroupements ────────────────────────────────────────────────────────── */

/** Ancienneté d'une notification, du plus récent au plus ancien. */
export type Periode = "Aujourd'hui" | "Hier" | "Cette semaine" | "Plus anciennes";

export interface GroupePeriode {
  periode: Periode;
  items: Notification[];
}

/** Groupes de la cloche : ce qui reste à lire, puis le reste. */
export interface GroupeLecture {
  titre: "Nouvelles" | "Déjà lues";
  neuves: boolean;
  items: Notification[];
}

/** Habillage d'un groupe de la page, par période. */
export interface StylePeriode {
  pastille: string;
  icon: IconName;
}

/* ── Props des composants publics ─────────────────────────────────────────── */

/** Densité d'une ligne : `compact` pour les aperçus, `comfortable` pour la page. */
export type Densite = "compact" | "comfortable";

export interface NotificationItemProps {
  notification: Notification;
  /**
   * `compact` — cloche et tableau de bord : lecture rapide, pas d'actions.
   * `comfortable` — page dédiée : détail complet, marquer comme lue, supprimer.
   */
  density?: Densite;
  /** Appelé à l'ouverture de la notification (clic sur la ligne). */
  onOpen?: (notification: Notification) => void;
  onMarkRead?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

export interface NotificationBellProps {
  /** Page listant toutes les notifications de l'espace. */
  allHref: string;
  /**
   * `tab` — icône + libellé, pour la barre façon LinkedIn de l'Espace Jeune.
   * `icon` — bouton rond, pour l'en-tête des espaces à barre latérale.
   */
  variant?: "tab" | "icon";
  /** Contrôle externe : la coque referme les autres menus quand la cloche s'ouvre. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export interface NotificationsViewProps {
  /** Ce que l'espace recevra ici — affiché tant que la liste est vide. */
  emptyDescription: string;
  /** Réserve la hauteur de la barre d'onglets mobile sous le bandeau d'annulation. */
  bottomNav?: boolean;
}
