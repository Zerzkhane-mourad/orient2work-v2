import { AppShell } from "@/components/layout/app-shell";
import { entrepriseNav } from "@/lib/navigation";
import { currentEntreprise } from "@/lib/mock-data";

export default function EspaceEntrepriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      nav={entrepriseNav}
      homeHref="/espace-entreprise"
      roleLabel="Espace Entreprise"
      user={{
        name: currentEntreprise.responsable,
        role: currentEntreprise.nom,
        photo: currentEntreprise.logo,
      }}
    >
      {children}
    </AppShell>
  );
}
