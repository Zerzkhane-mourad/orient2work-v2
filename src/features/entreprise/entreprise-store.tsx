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
import { couleursDuFichier } from "@/lib/color";
import type { UpdateEntrepriseInput } from "@/lib/api/endpoints/entreprises";
import { DEFAULT_ENTREPRISE_THEME, THEME_AUTO } from "./themes";

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

          /*
           * Les couleurs du thème sont relevées DANS le logo : changer de logo
           * sans les relire laisserait l'espace aux couleurs du précédent.
           *
           * Le thème lui-même n'est pas touché — une entreprise qui a choisi un
           * préréglage le garde. Seules les couleurs enregistrées suivent, ce
           * qui maintient aussi l'aperçu du thème « Vos couleurs » à jour.
           */
          const couleurs = await couleursDuFichier(file, 2).catch(() => []);

          if (couleurs.length > 0) {
            return api.entreprises.update({
              themeCouleur: couleurs[0].hex,
              themeAccent: couleurs[1]?.hex ?? null,
            });
          }

          // Nouveau logo sans teinte dominante. Les anciennes couleurs ne
          // décrivent plus rien : on les efface, et un espace qui était en
          // thème calculé revient au préréglage par défaut — le serveur
          // refuserait « auto » sans couleur, et il aurait raison.
          if (data.theme === THEME_AUTO) {
            return api.entreprises.update({
              theme: DEFAULT_ENTREPRISE_THEME,
              themeCouleur: null,
              themeAccent: null,
            });
          }
          return api.entreprises.update({ themeCouleur: null, themeAccent: null });
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
