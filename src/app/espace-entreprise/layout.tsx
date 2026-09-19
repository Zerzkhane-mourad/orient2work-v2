"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RequireRole } from "@/features/auth/require-role";
import { EntrepriseProvider, useEntreprise } from "@/features/entreprise/entreprise-store";
import { DEFAULT_ENTREPRISE_THEME, THEME_ATTRIBUTE } from "@/features/entreprise/themes";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { NotificationsProvider } from "@/features/notifications/notifications-store";
import { entrepriseNav } from "@/lib/navigation";

export default function EspaceEntrepriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["ENTREPRISE"]}>
      <EntrepriseProvider>
        <NotificationsProvider>
          <Shell>{children}</Shell>
        </NotificationsProvider>
      </EntrepriseProvider>
    </RequireRole>
  );
}

/** Séparé du layout pour pouvoir lire le contexte fourni juste au-dessus. */
function Shell({ children }: { children: React.ReactNode }) {
  const { entreprise } = useEntreprise();

  // Thème posé sur <html> (voir `themes.ts`) et retiré en quittant l'espace :
  // le site public et les autres espaces gardent la palette de base.
  useEffect(() => {
    const root = document.documentElement;
    if (entreprise.theme && entreprise.theme !== DEFAULT_ENTREPRISE_THEME) {
      root.setAttribute(THEME_ATTRIBUTE, entreprise.theme);
    } else {
      root.removeAttribute(THEME_ATTRIBUTE);
    }
    return () => root.removeAttribute(THEME_ATTRIBUTE);
  }, [entreprise.theme]);

  return (
    <AppShell
      nav={entrepriseNav}
      homeHref="/espace-entreprise"
      roleLabel="Espace Entreprise"
      user={{
        name: entreprise.responsable || entreprise.nom,
        role: entreprise.nom,
        photo: entreprise.logo,
      }}
      headerActions={
        <NotificationBell allHref="/espace-entreprise/notifications" variant="icon" />
      }
    >
      {children}
    </AppShell>
  );
}
