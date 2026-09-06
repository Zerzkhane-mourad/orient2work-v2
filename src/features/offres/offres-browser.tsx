"use client";

/**
 * Recherche d'offres, partagée par l'espace public et l'espace jeune.
 *
 * Recherche, filtres et pagination sont exécutés par le serveur : seules les
 * offres publiées et non expirées sont renvoyées, quoi que demande le client.
 *
 * Le terme et le filtre vivent dans l'URL (`useRechercheOffres`) : le résultat
 * est ainsi partageable, le retour arrière défait la dernière recherche, et la
 * barre de l'en-tête peut piloter cet écran sans lui parler directement.
 *
 * Appelant : ce composant lit `useSearchParams`. Toute page qui l'affiche doit
 * donc le placer sous une frontière `<Suspense>`, faute de quoi son rendu
 * statique bascule en dynamique.
 */
import { EmptyState, ErrorState, Icon, Pagination, SkeletonCard } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { OPPORTUNITY_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { OffreCard } from "./offre-card";
import { TYPE_TOUS, useRechercheOffres } from "./use-recherche-offres";

/**
 * Tailles proposées : multiples de 2, 3 et 4, pour que la dernière rangée reste
 * complète quel que soit le nombre de colonnes de la grille.
 */
const GRID_PER_PAGE = [12, 24, 48] as const;

const PER_PAGE = 12;

interface OffresBrowserProps {
  /** Base path for offer detail links. */
  detailBase?: string;
  /** "grid" for marketing pages, "list" for the LinkedIn-style jobs feed. */
  variant?: "grid" | "list";
}

export function OffresBrowser({ detailBase, variant = "grid" }: OffresBrowserProps) {
  const { terme, setTerme, termeApplique, type, setType } = useRechercheOffres();

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "recherche-offres",
  });
  const { page, goTo, listRef } = usePagination({ perPage, resetOn: [termeApplique, type] });

  const { data, loading, error, refetch } = useApi(
    () =>
      api.offres.list({
        q: termeApplique || undefined,
        type: type === TYPE_TOUS ? undefined : type,
        page,
        perPage,
      }),
    [termeApplique, type, page, perPage],
  );

  const offres = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Icon
          name="search"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          type="search"
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
          placeholder="Rechercher par titre, entreprise, ville ou compétence…"
          aria-label="Rechercher une offre"
          className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-3 pl-12 pr-4 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[TYPE_TOUS, ...OPPORTUNITY_TYPES].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              type === t
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading ? (
        <div
          className={variant === "list" ? "space-y-4" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div ref={listRef} className="space-y-6">
          {offres.length > 0 ? (
            <div
              className={
                variant === "list" ? "space-y-4" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              }
            >
              {offres.map((o) => (
                <OffreCard
                  key={o.id}
                  offre={o}
                  href={detailBase ? `${detailBase}/${o.id}` : undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="search_off"
              title="Aucune offre ne correspond à votre recherche"
              description="Élargissez vos critères ou revenez plus tard : de nouvelles offres sont publiées chaque semaine."
            />
          )}

          {/* Le décompte des résultats est porté par la pagination elle-même :
              « 13–24 sur 87 offres » situe mieux qu'un total isolé. */}
          {meta && (
            <Pagination
              meta={meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              perPageOptions={GRID_PER_PAGE}
              busy={loading}
              unit="offre"
            />
          )}
        </div>
      )}
    </div>
  );
}
