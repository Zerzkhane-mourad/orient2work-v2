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
 *
 * Organisation : l'état et les effets vivent ici ; les types dans `types.ts`,
 * les réglages dans `constants.ts`, et toute transformation de liste dans
 * `lib/liste.ts` — des fonctions pures, lisibles et testables seules.
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
import { PAGE_SIZE, REFRESH_MS, UNDO_MS } from "./constants";
import { useRafraichissementVisible } from "./hooks/use-rafraichissement-visible";
import {
  ajouterSansDoublon,
  fusionnerPremierePage,
  marquerLues,
  reinserer,
} from "./lib/liste";
import type { NotificationsState, PendingRemoval } from "./types";

// Réexportés pour les appelants historiques de ce module.
export { UNDO_MS } from "./constants";
export type { NotificationsState } from "./types";

const NotificationsContext = createContext<NotificationsState | null>(null);

function enApiError(caught: unknown): ApiError {
  return caught instanceof ApiError
    ? caught
    : new ApiError(0, "INTERNAL_ERROR", "Chargement des notifications impossible.");
}

/** Une page de l'API, déjà convertie au modèle de l'interface. */
async function chargerPage(page = 1) {
  const result = await api.notifications.list({ page, perPage: PAGE_SIZE });
  const items = result.items.map(toNotification);
  return { items, unread: result.unread, hasMore: items.length === PAGE_SIZE };
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

  /* ── Chargement ─────────────────────────────────────────────────────── */

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const premiere = await chargerPage();
      page.current = 1;
      setNotifications(premiere.items);
      setUnread(premiere.unread);
      setHasMore(premiere.hasMore);
    } catch (caught) {
      setError(enApiError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const premiere = await chargerPage();
      // Une suppression en attente d'annulation reste masquée : le serveur ne
      // l'a pas encore reçue, elle reviendrait sinon au premier rafraîchissement.
      const cachee = pending.current?.item;
      const fraiches = premiere.items.filter((n) => n.id !== cachee?.id);
      setNotifications((actuelles) => fusionnerPremierePage(actuelles, fraiches));
      setUnread(Math.max(0, premiere.unread - (cachee && !cachee.read ? 1 : 0)));
      setError(null);
    } catch {
      // Silencieux : la liste affichée reste valable, le prochain passage réessaiera.
    }
  }, []);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const rafraichir = useCallback(() => void refresh(), [refresh]);
  useRafraichissementVisible(rafraichir, REFRESH_MS);

  const loadMore = useCallback(async () => {
    if (fetchingMore.current) return;
    fetchingMore.current = true;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const suivante = page.current + 1;
      const resultat = await chargerPage(suivante);
      page.current = suivante;
      setNotifications((actuelles) => ajouterSansDoublon(actuelles, resultat.items));
      setUnread(resultat.unread);
      setHasMore(resultat.hasMore);
    } catch {
      setLoadMoreFailed(true);
    } finally {
      fetchingMore.current = false;
      setLoadingMore(false);
    }
  }, []);

  /* ── Lecture ────────────────────────────────────────────────────────── */

  const markRead = useCallback(
    async (id: string) => {
      const cible = latest.current.find((n) => n.id === id);
      if (!cible || cible.read) return;
      // Optimiste : la pastille réagit au clic, pas à l'aller-retour réseau.
      setNotifications((liste) => marquerLues(liste, id));
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
    setNotifications((liste) => marquerLues(liste));
    setUnread(0);
    try {
      await api.notifications.markAllRead();
    } catch {
      void refresh();
    }
  }, [refresh]);

  /* ── Suppression annulable ──────────────────────────────────────────── */

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
      const liste = latest.current;
      const index = liste.findIndex((n) => n.id === id);
      const item = liste[index];
      if (!item) return;

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
      setNotifications((actuelles) => actuelles.filter((n) => n.id !== id));
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
    setNotifications((actuelles) => reinserer(actuelles, entry.item, entry.index));
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
