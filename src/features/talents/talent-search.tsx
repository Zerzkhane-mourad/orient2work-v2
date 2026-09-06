"use client";

/**
 * Moteur de recherche de talents (§6.5).
 *
 * Le filtrage se fait côté SERVEUR : l'annuaire complet n'est jamais envoyé au
 * navigateur, et seuls les profils validés remontent, en vue publique (sans
 * email, téléphone ni liens personnels). Une entreprise non validée par OMB
 * reçoit un 403, affiché ici comme un message explicite.
 */
import { useState } from "react";
import {
  EmptyState,
  ErrorState,
  Icon,
  optionsFromLabels,
  Pagination,
  Select,
  SkeletonCard,
} from "@/components/ui";
import { api } from "@/lib/api";
import { toJeuneFromPublic } from "@/lib/api/adapters";
import { useApi } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { useDebounced } from "@/lib/use-debounced";
import { NIVEAUX_ETUDES } from "@/lib/constants";
import { useFilieres } from "@/features/admin/use-referentiel";
import { TalentCard } from "./talent-card";

/**
 * Tailles proposées : multiples de 2, 3 et 4, pour que la dernière rangée reste
 * complète quel que soit le nombre de colonnes de la grille.
 */
const GRID_PER_PAGE = [12, 24, 48] as const;

const PER_PAGE = 12;

export function TalentSearch() {
  const { filieres } = useFilieres();
  const [query, setQuery] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [niveau, setNiveau] = useState("");

  // Anti-rebond : sans lui, chaque frappe déclencherait une requête.
  const debouncedQuery = useDebounced(query.trim());

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "recherche-talents",
  });
  const { page, goTo, listRef } = usePagination({
    perPage,
    resetOn: [debouncedQuery, filiereId, niveau],
  });

  const { data, loading, error, refetch } = useApi(
    () =>
      api.jeunes.searchTalents({
        q: debouncedQuery || undefined,
        filiereId: filiereId || undefined,
        niveauEtudes: niveau || undefined,
        page,
        perPage,
      }),
    [debouncedQuery, filiereId, niveau, page, perPage],
  );

  const talents = (data?.items ?? []).map(toJeuneFromPublic);
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom ou compétence…"
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2.5 pl-12 pr-4 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </div>
        {/* La valeur est l'identifiant, le libellé n'est qu'un affichage. */}
        <Select
          className="min-w-44"
          aria-label="Filtrer par filière"
          value={filiereId}
          onChange={setFiliereId}
          options={[
            { value: "", label: "Toutes les filières" },
            ...filieres.map((f) => ({ value: f.id, label: f.nom })),
          ]}
        />
        <Select
          className="min-w-40"
          aria-label="Filtrer par niveau d'études"
          value={niveau}
          onChange={setNiveau}
          options={[{ value: "", label: "Tous les niveaux" }, ...optionsFromLabels(NIVEAUX_ETUDES)]}
        />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div ref={listRef} className="space-y-6">
          {talents.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {talents.map((t) => (
                <TalentCard key={t.id} talent={t} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="person_search"
              title="Aucun talent trouvé"
              description="Ajustez vos filtres de recherche."
            />
          )}

          {meta && (
            <Pagination
              meta={meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              perPageOptions={GRID_PER_PAGE}
              busy={loading}
              unit="talent"
            />
          )}
        </div>
      )}
    </div>
  );
}
