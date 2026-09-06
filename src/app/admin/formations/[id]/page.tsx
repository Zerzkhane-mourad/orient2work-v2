"use client";

import { use } from "react";
import { ErrorState, LoadingState } from "@/components/ui";
import { FormationEditor } from "@/features/admin/formation-editor";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

export default function ModifierFormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
