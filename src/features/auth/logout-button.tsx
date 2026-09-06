"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { LOGIN_PATH } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useSession } from "./session-provider";

/**
 * Déconnexion.
 *
 * `logout` révoque le refresh token côté serveur puis purge la mémoire. Même si
 * l'appel réseau échoue, la session locale est vidée : on ne laisse jamais
 * l'utilisateur croire qu'il est déconnecté alors qu'il ne l'est pas — et
 * inversement, un serveur injoignable ne doit pas le bloquer sur place.
 */
export function LogoutButton({
  className,
  compact,
}: {
  className?: string;
  /** Icône seule — barre latérale réduite. Le libellé passe en infobulle. */
  compact?: boolean;
}) {
  const { logout } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    try {
      await logout();
    } finally {
      router.replace(LOGIN_PATH);
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={pending}
      title={compact ? "Déconnexion" : undefined}
      aria-label={compact ? "Déconnexion" : undefined}
      className={cn("flex items-center gap-3 disabled:opacity-60", className)}
    >
      <Icon name="logout" className="text-[18px]" />
      {!compact && (pending ? "Déconnexion…" : "Déconnexion")}
    </button>
  );
}
