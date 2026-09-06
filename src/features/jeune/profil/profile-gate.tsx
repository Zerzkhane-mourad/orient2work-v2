"use client";

/**
 * Attend que le profil soit chargé avant de rendre l'Espace Jeune.
 *
 * Sans ce garde, chaque page devrait tester le chargement séparément et le
 * moindre oubli produirait un écran vide ou un crash sur un champ manquant.
 */
import { ErrorState, LoadingState } from "@/components/ui";
import { useProfile } from "./profile-store";

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { loading, error, refetch } = useProfile();

  if (loading) return <LoadingState label="Chargement de votre profil…" />;

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return <>{children}</>;
}
