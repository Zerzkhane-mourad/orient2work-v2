"use client";

import { use } from "react";
import { ErrorState, LoadingState } from "@/components/ui";
import { RoleEditor } from "@/features/admin/role-editor";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

export default function ModifierRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: role, loading, error, refetch } = useApi(() => api.admin.role(id), [id]);

  if (loading) return <LoadingState label="Chargement du rôle…" />;

  if (error || !role) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return <RoleEditor role={role} />;
}
