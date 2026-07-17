import { JeuneShell } from "@/components/layout/jeune-shell";
import { ProfileProvider } from "@/features/jeune/profil/profile-store";
import { currentJeune, jeuneNotifications } from "@/lib/mock-data";
import { computeProfilCompletion } from "@/lib/profil";

export default function EspaceJeuneLayout({ children }: { children: React.ReactNode }) {
  // Seed the client store with the server-side profile, completion already derived.
  // Mounted here (not on the profil page) so the header and every page read the
  // same live profile — a photo change is reflected everywhere at once.
  const seed = { ...currentJeune, profilCompletion: computeProfilCompletion(currentJeune) };

  return (
    <ProfileProvider initial={seed}>
      <JeuneShell notifications={jeuneNotifications}>{children}</JeuneShell>
    </ProfileProvider>
  );
}
