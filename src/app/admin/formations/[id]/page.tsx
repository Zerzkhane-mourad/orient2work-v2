"use client";

import { use } from "react";
import { ErrorState, LoadingState } from "@/components/ui";
import { FormationEditor } from "@/features/admin/formation-editor";
import { RequirePermission } from "@/features/auth/require-permission";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

function Contenu({ id }: { id: string }) {
  // En tant qu'admin, la réponse inclut les bonnes réponses du quiz.
  const { data: formation, loading, error, refetch } = useApi(() => api.formations.byId(id), [id]);

  if (loading) return <LoadingState label="Chargement de la formation…" />;

  if (error || !formation) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return <FormationEditor formation={formation} />;
}

export default function ModifierFormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  /*
   * Le garde enveloppe le CHARGEMENT, pas seulement le formulaire : sans droit
   * d'écriture, rien ne justifie d'aller chercher la formation. L'aperçu, lui,
   * reste ouvert — c'est `/admin/formations/[id]/apercu`, une lecture.
   */
  return (
    <RequirePermission
      requires="formations:write"
      retour="/admin/formations"
      retourLabel="Retour au catalogue"
    >
      <Contenu id={id} />
    </RequirePermission>
  );
}
