"use client";

import { AppShell } from "@/components/layout/app-shell";
import { RequireRole } from "@/features/auth/require-role";
import { EntrepriseProvider, useEntreprise } from "@/features/entreprise/entreprise-store";
import { useThemeEntreprise } from "@/features/entreprise/use-theme-entreprise";
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

  // Préréglage ou palette calculée depuis le logo — voir le hook.
  useThemeEntreprise(entreprise);

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
