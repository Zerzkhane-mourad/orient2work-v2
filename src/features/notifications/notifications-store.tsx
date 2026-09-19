"use client";

/**
 * Notifications de l'utilisateur connecté — une seule source par espace.
 *
 * La cloche, la pastille de la barre du bas, le tableau de bord et la page
 * dédiée appelaient chacun leur propre `useNotifications` : quatre copies de la
 * liste, quatre requêtes, et une notification lue sur la page restait « non
 * lue » dans l'en-tête jusqu'au rechargement. Le fournisseur, posé dans la
 * coque de l'espace, les aligne toutes.
 *
 * La liste se rafraîchit discrètement chaque minute tant que l'onglet est
 * visible, et au retour sur l'onglet : une candidature reçue apparaît sans
 * recharger la page, et sans squelette qui clignote.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api";
import { toNotification } from "@/lib/api/adapters";
import { ApiError } from "@/lib/api/errors";
import type { Notification } from "@/lib/types";

const PAGE_SIZE = 20;
const REFRESH_MS = 60_000;
/** Délai pendant lequel une suppression peut encore être annulée. */
export const UNDO_MS = 5_000;

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

interface PendingRemoval {
  item: Notification;
  index: number;
  timer: ReturnType<typeof setTimeout>;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

function asApiError(caught: unknown): ApiError {
  return caught instanceof ApiError
    ? caught
    : new ApiError(0, "INTERNAL_ERROR", "Chargement des notifications impossible.");
}

/**
 * Fusionne la première page fraîche avec la liste affichée.
 *
 * La page 1 fait foi pour sa fenêtre de dates : ce qui en a disparu a été
 * supprimé ailleurs. Les notifications plus anciennes, chargées par « Afficher
 * plus », sont conservées — sinon un rafraîchissement ramènerait l'utilisateur
 * en haut d'une liste raccourcie.
 */
function mergeFirstPage(current: Notification[], fresh: Notification[]): Notification[] {
  const oldest = fresh.at(-1)?.createdAt;
  const older = oldest ? current.filter((n) => n.createdAt < oldest) : [];
  return [...fresh, ...older];
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [removed, setRemoved] = useState<Notification | null>(null);

  // Lus par les actions sans en faire des dépendances : une action qui change
  // d'identité à chaque rendu relancerait les effets des composants abonnés.
  const latest = useRef<Notification[]>([]);
  const page = useRef(1);
  const pending = useRef<PendingRemoval | null>(null);
  const fetchingMore = useRef(false);

  useEffect(() => {
    latest.current = notifications;
  }, [notifications]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.notifications.list({ perPage: PAGE_SIZE });
      page.current = 1;
      setNotifications(result.items.map(toNotification));
      setUnread(result.unread);
      setHasMore(result.items.length === PAGE_SIZE);
    } catch (caught) {
      setError(asApiError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await api.notifications.list({ perPage: PAGE_SIZE });
      // Une suppression en attente d'annulation reste masquée : le serveur ne
      // l'a pas encore reçue, elle reviendrait sinon au premier rafraîchissement.
      const hidden = pending.current?.item;
      const fresh = result.items.map(toNotification).filter((n) => n.id !== hidden?.id);
      setNotifications((current) => mergeFirstPage(current, fresh));
      setUnread(Math.max(0, result.unread - (hidden && !hidden.read ? 1 : 0)));
      setError(null);
    } catch {
      // Silencieux : la liste affichée reste valable, le prochain passage réessaiera.
    }
  }, []);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    const whenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(whenVisible, REFRESH_MS);
    document.addEventListener("visibilitychange", whenVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", whenVisible);
    };
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (fetchingMore.current) return;
    fetchingMore.current = true;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const next = page.current + 1;
      const result = await api.notifications.list({ page: next, perPage: PAGE_SIZE });
      page.current = next;
      const items = result.items.map(toNotification);
      // Des notifications arrivées entre-temps décalent les pages : les doublons
      // en bordure de page sont écartés.
      setNotifications((current) => {
        const known = new Set(current.map((n) => n.id));
        return [...current, ...items.filter((n) => !known.has(n.id))];
      });
      setUnread(result.unread);
      setHasMore(items.length === PAGE_SIZE);
    } catch {
      setLoadMoreFailed(true);
    } finally {
      fetchingMore.current = false;
      setLoadingMore(false);
    }
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      const target = latest.current.find((n) => n.id === id);
      if (!target || target.read) return;
      // Optimiste : la pastille réagit au clic, pas à l'aller-retour réseau.
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((count) => Math.max(0, count - 1));
      try {
        await api.notifications.markRead(id);
      } catch {
        void refresh();
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    setNotifications((list) => list.map((n) => (n.read ? n : { ...n, read: true })));
    setUnread(0);
    try {
      await api.notifications.markAllRead();
    } catch {
      void refresh();
    }
  }, [refresh]);

  const commitRemoval = useCallback(
    (entry: PendingRemoval) => {
      clearTimeout(entry.timer);
      api.notifications.remove(entry.item.id).catch(() => void refresh());
    },
    [refresh],
  );

  /**
   * Suppression différée : la ligne disparaît tout de suite, l'appel ne part
   * qu'après `UNDO_MS`. Un clic de trop sur la corbeille se rattrape, sans
   * boîte de confirmation à franchir pour chaque ligne.
   */
  const remove = useCallback(
    (id: string) => {
      const list = latest.current;
      const index = list.findIndex((n) => n.id === id);
      if (index === -1) return;
      const item = list[index];

      // Une seule suppression annulable à la fois : la précédente est validée.
      if (pending.current) commitRemoval(pending.current);

      const timer = setTimeout(() => {
        if (pending.current?.item.id !== id) return;
        commitRemoval(pending.current);
        pending.current = null;
        setRemoved(null);
      }, UNDO_MS);

      pending.current = { item, index, timer };
      setRemoved(item);
      setNotifications((current) => current.filter((n) => n.id !== id));
      if (!item.read) setUnread((count) => Math.max(0, count - 1));
    },
    [commitRemoval],
  );

  const undoRemove = useCallback(() => {
    const entry = pending.current;
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.current = null;
    setRemoved(null);
    setNotifications((current) => {
      const copy = [...current];
      copy.splice(Math.min(entry.index, copy.length), 0, entry.item);
      return copy;
    });
    if (!entry.item.read) setUnread((count) => count + 1);
  }, []);

  // Quitter l'espace (déconnexion, changement de rôle) valide la suppression
  // en attente plutôt que de la perdre.
  useEffect(
    () => () => {
      if (pending.current) commitRemoval(pending.current);
    },
    [commitRemoval],
  );

  const refetch = useCallback(() => void loadFirstPage(), [loadFirstPage]);

  const value = useMemo<NotificationsState>(
    () => ({
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
    }),
    [
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
    ],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsState {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error("useNotifications doit être appelé sous <NotificationsProvider>.");
  }
  return value;
}
