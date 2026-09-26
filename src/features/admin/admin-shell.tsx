"use client";

/**
 * Enveloppe du back-office.
 *
 * Existe pour une seule raison : la barre latérale dépend des permissions de
 * l'administrateur connecté, donc de la session — une information cliente. Le
 * layout `/admin` reste ainsi un composant serveur, et seul ce fragment bascule
 * côté navigateur.
 *
 * Le filtrage est un confort d'affichage, pas une protection : le serveur
 * refuse de lui-même chaque route dont la permission manque.
 */
import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/features/auth/session-provider";
import { usePermissions } from "@/features/auth/use-permissions";
import { adminNav, filterNav } from "@/lib/navigation";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const { canAny } = usePermissions();

  return (
    <AppShell
      nav={filterNav(adminNav, canAny)}
      homeHref="/admin"
      roleLabel="Administration OMB"
      // Repli sur le libellé générique tant que la session se restaure, et pour
      // les comptes créés avant que les administrateurs ne portent un nom.
      user={{ name: user?.nom || "Équipe OMB", role: "Administrateur" }}
    >
      {children}
    </AppShell>
  );
}
