"use client";

/**
 * Notifications de l'utilisateur connecté.
 *
 * Partagé entre l'en-tête (pastille + aperçu) et la page dédiée : une seule
 * source, donc pas de compteur qui diverge de la liste.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toNotification } from "@/lib/api/adapters";
import { ApiError } from "@/lib/api/errors";
import type { Notification } from "@/lib/types";

export interface UseNotifications {
  notifications: Notification[];
  unread: number;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useNotifications(perPage = 30): UseNotifications {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api.notifications
      .list({ perPage })
      .then((result) => {
        if (!active) return;
        setNotifications(result.items.map(toNotification));
        setUnread(result.unread);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        // Une notification qui ne charge pas ne doit pas casser la page :
        // l'erreur est exposée, mais la liste reste simplement vide.
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "INTERNAL_ERROR", "Chargement des notifications impossible."),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [perPage, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  const markRead = useCallback(async (id: string) => {
    // Optimiste : le compteur doit réagir au clic, pas à l'aller-retour réseau.
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((count) => Math.max(0, count - 1));
    try {
      await api.notifications.markRead(id);
    } catch {
      setNonce((n) => n + 1); // Réaligne sur le serveur en cas d'échec.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.notifications.markAllRead();
    } catch {
      setNonce((n) => n + 1);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setNotifications((list) => list.filter((n) => n.id !== id));
    try {
      await api.notifications.remove(id);
    } finally {
      setNonce((n) => n + 1);
    }
  }, []);

  return { notifications, unread, loading, error, refetch, markRead, markAllRead, remove };
}
