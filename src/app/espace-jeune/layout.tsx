import { JeuneShell } from "@/components/layout/jeune-shell";
import { RequireRole } from "@/features/auth/require-role";
import { ProfileGate } from "@/features/jeune/profil/profile-gate";
import { ProfileProvider } from "@/features/jeune/profil/profile-store";

export default function EspaceJeuneLayout({ children }: { children: React.ReactNode }) {
  // Le profil est chargé une seule fois ici et partagé par toutes les pages :
  // l'en-tête et le tableau de bord lisent le même objet, donc un changement de
  // photo est répercuté partout d'un coup.
  return (
    <RequireRole roles={["JEUNE"]}>
      <ProfileProvider>
        <JeuneShell>
          <ProfileGate>{children}</ProfileGate>
        </JeuneShell>
      </ProfileProvider>
    </RequireRole>
  );
}
