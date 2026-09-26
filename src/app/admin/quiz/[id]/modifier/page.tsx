"use client";

import { use } from "react";
import { ErrorState, LoadingState } from "@/components/ui";
import { TestEditor } from "@/features/admin/test-editor";
import { RequirePermission } from "@/features/auth/require-permission";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

function Contenu({ id }: { id: string }) {
  const { data: test, loading, error, refetch } = useApi(() => api.admin.test(id), [id]);

  if (loading) return <LoadingState label="Chargement du test…" />;

  if (error || !test) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return <TestEditor test={test} />;
}

export default function ModifierTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Le garde enveloppe le chargement : sans droit d'écriture, rien ne justifie
  // d'aller chercher le test — et `GET /admin/tests/:id` le refuserait de toute
  // façon à qui n'a pas au moins `tests:read`.
  return (
    <RequirePermission requires="tests:write" retour="/admin/quiz" retourLabel="Retour aux tests">
      <Contenu id={id} />
    </RequirePermission>
  );
}
