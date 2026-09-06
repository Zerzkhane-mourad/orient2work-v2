"use client";

import { AppShell } from "@/components/layout/app-shell";
import { RequireRole } from "@/features/auth/require-role";
import { EntrepriseProvider, useEntreprise } from "@/features/entreprise/entreprise-store";
import { entrepriseNav } from "@/lib/navigation";

export default function EspaceEntrepriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["ENTREPRISE"]}>
      <EntrepriseProvider>
        <Shell>{children}</Shell>
      </EntrepriseProvider>
    </RequireRole>
  );
}

/** Séparé du layout pour pouvoir lire le contexte fourni juste au-dessus. */
function Shell({ children }: { children: React.ReactNode }) {
  const { entreprise } = useEntreprise();

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
    >
      {children}
    </AppShell>
  );
}
