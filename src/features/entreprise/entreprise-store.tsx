"use client";

/**
 * Profil de l'entreprise connectée.
 *
 * Même principe que le store jeune : chargé une fois dans le layout, partagé par
 * toutes les pages de l'espace. Le `status` (validation OMB) n'est PAS
 * modifiable ici — c'est une décision d'administrateur, et l'API le refuserait.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import type { ApiEntreprise } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import type { UpdateEntrepriseInput } from "@/lib/api/endpoints/entreprises";

interface EntrepriseStore {
  entreprise: ApiEntreprise;
  /** `true` quand OMB a validé le compte : conditionne offres et talents. */
  isValidated: boolean;
  saving: boolean;
  saveError: ApiError | null;
  update: (patch: UpdateEntrepriseInput) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<void>;
  refetch: () => void;
}

const EntrepriseContext = createContext<EntrepriseStore | null>(null);

export function EntrepriseProvider({ children }: { children: React.ReactNode }) {
  const { data, loading, error, refetch, setData } = useApi(() => api.entreprises.me(), []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const mutate = useCallback(
    async (action: () => Promise<ApiEntreprise>): Promise<boolean> => {
      setSaving(true);
      setSaveError(null);
      try {
        setData(await action());
        return true;
      } catch (caught) {
        setSaveError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "INTERNAL_ERROR", "Enregistrement impossible."),
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setData],
  );

  const store = useMemo<EntrepriseStore | null>(() => {
    if (!data) return null;
    return {
      entreprise: data,
      isValidated: data.status === "valide",
      saving,
      saveError,
      update: (patch) => mutate(() => api.entreprises.update(patch)),
      // Le logo est un document : l'upload met à jour `entreprise.logo` côté
      // serveur, on recharge donc la fiche pour récupérer l'URL.
      uploadLogo: async (file) => {
        await mutate(async () => {
          await api.documents.upload("LOGO", file);
          return api.entreprises.me();
        });
      },
      refetch,
    };
  }, [data, saving, saveError, mutate, refetch]);

  if (loading) return <LoadingState label="Chargement de votre espace…" />;
  if (error || !store) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return <EntrepriseContext.Provider value={store}>{children}</EntrepriseContext.Provider>;
}

export function useEntreprise(): EntrepriseStore {
  const ctx = useContext(EntrepriseContext);
  if (!ctx) throw new Error("useEntreprise doit être utilisé dans un <EntrepriseProvider>.");
  return ctx;
}
