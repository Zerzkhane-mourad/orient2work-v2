"use client";

import { use } from "react";
import { ErrorState, LoadingState } from "@/components/ui";
import { TestEditor } from "@/features/admin/test-editor";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

export default function ModifierTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
