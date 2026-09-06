"use client";

/**
 * Session React.
 *
 * Enveloppe le store mémoire (`lib/api/session.ts`) dans un contexte, pour que
 * les composants réagissent à la connexion et à la déconnexion. La source de
 * vérité reste le store : le contexte ne fait que s'y abonner.
 *
 * Au montage, on tente une restauration silencieuse via `/auth/refresh` — c'est
 * ce qui permet de rester connecté après un F5, alors que l'access token, gardé
 * en mémoire seulement, a disparu.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser, isBootstrapped, restoreSession, subscribe } from "@/lib/api/session";
import type { Role, User } from "@/lib/api/types";

interface SessionState {
  user: User | null;
  /** `true` tant que la restauration initiale n'a pas abouti. */
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (...roles: Role[]) => boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Recharge l'utilisateur (après vérification d'email, par exemple). */
  reload: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [loading, setLoading] = useState(() => !isBootstrapped());

  useEffect(() => {
    const unsubscribe = subscribe(setUser);

    if (isBootstrapped()) {
      setLoading(false);
    } else {
      // Un échec est le cas normal d'un visiteur non connecté : `restoreSession`
      // ne rejette jamais.
      void restoreSession().finally(() => setLoading(false));
    }

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    return api.auth.login(email, password);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
  }, []);

  const reload = useCallback(async () => {
    try {
      setUser(await api.auth.me());
    } catch {
      // Session perdue entre-temps : le store a déjà purgé et notifié.
    }
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      hasRole: (...roles) => (user ? roles.includes(user.role) : false),
      login,
      logout,
      reload,
    }),
    [user, loading, login, logout, reload],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession doit être utilisé dans un <SessionProvider>.");
  return context;
}
