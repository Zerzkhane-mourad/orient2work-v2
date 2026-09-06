"use client";

/**
 * Catalogue de formations.
 *
 * Le filtrage et la pagination sont délégués au serveur : le catalogue peut
 * grandir sans que le navigateur ait à tout télécharger. Les brouillons
 * (`publiee: false`) ne sont jamais renvoyés à un non-admin.
 *
 * La recherche est temporisée : sans cela, chaque touche frappée partirait en
 * requête. Tout changement de filtre ramène à la page 1 — rester en page 4 d'un
 * résultat qui n'en compte plus qu'une donnerait une liste vide.
 */
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, Icon, Pagination, ScrollRow, Skeleton } from "@/components/ui";
import { useCategories } from "@/features/admin/use-referentiel";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { useDebounced } from "@/lib/use-debounced";
import { useEcrireParams, useParam } from "@/lib/use-url-param";
import { cn } from "@/lib/utils";
import { FormationCard } from "./formation-card";

/**
 * Tailles proposées : multiples de 2, 3 et 4, pour que la dernière rangée reste
 * complète quel que soit le nombre de colonnes de la grille.
 */
const GRID_PER_PAGE = [12, 24, 48] as const;

const PER_PAGE = 12;

/** Miroir de `FORMATION_NIVEAUX` côté backend — l'API refuse toute autre valeur. */
const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé", "Tous niveaux"] as const;

interface FormationsCatalogProps {
  /** Base du lien de détail ; à défaut, le catalogue public renvoie vers l'inscription. */
  detailBase?: string;
}

/** Onglet « tout le catalogue » : aucun filtre, donc pas d'identifiant. */
const TOUS = "";

/** Bouton de filtre — pilule à état, cible tactile de 44px. */
function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function FormationsCatalog({ detailBase }: FormationsCatalogProps) {
  // L'onglet actif est mémorisé par IDENTIFIANT : renommer une catégorie depuis
  // le back-office ne doit pas vider la liste sous les yeux du visiteur.
  const [categorieId, setCategorieId] = useState<string>(TOUS);
  const [niveau, setNiveau] = useState<string>("");
  const [certifiante, setCertifiante] = useState(false);

  /*
   * Le terme vient de l'URL (`?q=`) et y retourne : c'est ce qui permet à la
   * recherche globale de l'en-tête d'ouvrir ce catalogue déjà filtré, et à un
   * lien partagé de restituer la même liste. Les autres filtres restent locaux —
   * ils ne sont pilotés de l'extérieur par personne.
   */
  const termeUrl = useParam("q");
  const ecrire = useEcrireParams();
  const [search, setSearch] = useState(termeUrl);

  // L'URL a bougé sans passer par ce champ : on adopte, sauf s'il dit déjà la
  // même chose — sinon le curseur reculerait à chaque espace saisi.
  useEffect(() => {
    setSearch((actuel) => (actuel.trim() === termeUrl ? actuel : termeUrl));
  }, [termeUrl]);

  const q = useDebounced(search.trim());

  // `replace` : une entrée d'historique par frappe ferait rejouer la saisie
  // lettre par lettre au retour arrière.
  useEffect(() => {
    if (q !== termeUrl) ecrire({ q });
  }, [q, termeUrl, ecrire]);

  // Les onglets viennent du référentiel administrable, dans son ordre d'affichage.
  const { categories } = useCategories("publiques");
  const tabs = [{ id: TOUS, nom: "Tous" }, ...categories.filter((c) => c.active)];

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "catalogue-formations",
  });
  const { page, goTo, listRef } = usePagination({
    perPage,
    resetOn: [categorieId, q, niveau, certifiante],
  });

  const { data, loading, error, refetch } = useApi(
    () =>
      api.formations.list({
        categorieId: categorieId || undefined,
        q: q || undefined,
        niveau: niveau || undefined,
        certifiante: certifiante || undefined,
        page,
        perPage,
      }),
    [categorieId, q, niveau, certifiante, page, perPage],
  );

  const formations = data?.items ?? [];
  const meta = data?.meta;
  const hrefFor = (id: string) => (detailBase ? `${detailBase}/${id}` : "/inscription");

  const filtered = Boolean(q || niveau || certifiante || categorieId);
  const clearAll = () => {
    setSearch("");
    setNiveau("");
    setCertifiante(false);
    setCategorieId(TOUS);
  };

  return (
    <div className="space-y-4">
      {/* Recherche */}
      <div className="relative">
        <label htmlFor="catalogue-recherche" className="sr-only">
          Rechercher une formation
        </label>
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
        />
        <input
          id="catalogue-recherche"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une formation…"
          className="min-h-11 w-full rounded-full border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
      </div>

      {/* Catégories — la liste vient du référentiel et peut largement dépasser
          la largeur de l'écran. */}
      <ScrollRow
        aria-label="Catégories de formation"
        activeKey={categorieId}
        className="border-b border-outline-variant"
      >
        {tabs.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategorieId(c.id)}
            aria-current={categorieId === c.id ? "true" : undefined}
            // Lu par `ScrollRow` pour ramener l'onglet actif dans le champ.
            data-active={categorieId === c.id ? "true" : undefined}
            className={cn(
              "min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors",
              categorieId === c.id
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-primary",
            )}
          >
            {c.nom}
          </button>
        ))}
      </ScrollRow>

      {/* Niveau + certifiante */}
      <div className="flex flex-wrap items-center gap-2">
        {NIVEAUX.map((n) => (
          <FilterPill
            key={n}
            active={niveau === n}
            onClick={() => setNiveau((current) => (current === n ? "" : n))}
          >
            {n}
          </FilterPill>
        ))}
        <FilterPill active={certifiante} onClick={() => setCertifiante((v) => !v)}>
          <Icon name="verified" className="text-[16px]" /> Certifiante
        </FilterPill>

        {filtered && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-on-surface-variant underline-offset-2 hover:text-primary hover:underline"
          >
            <Icon name="close" className="text-[16px]" /> Effacer les filtres
          </button>
        )}
      </div>

      {/* Nombre de résultats — annoncé, pour que le filtrage soit perceptible
          sans voir la grille changer. */}
      {meta && !loading && !error && (
        <p aria-live="polite" className="text-sm text-on-surface-variant">
          {meta.total} formation{meta.total > 1 ? "s" : ""}
          {filtered ? " correspondent à votre recherche" : " au catalogue"}
        </p>
      )}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          ))}
        </div>
      ) : formations.length > 0 ? (
        <div ref={listRef} className="space-y-5">
          {/* Une seule colonne sous 640px : à deux, la carte tombait sous 170px
              de large et titre, note et méta se disputaient la place. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {formations.map((f) => (
              <FormationCard key={f.id} formation={f} href={hrefFor(f.id)} />
            ))}
          </div>

          {meta && (
            <Pagination
              meta={meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              perPageOptions={GRID_PER_PAGE}
              busy={loading}
              unit="formation"
            />
          )}
        </div>
      ) : (
        <EmptyState
          icon="search_off"
          title={filtered ? "Aucune formation ne correspond" : "Aucune formation disponible"}
          action={
            filtered ? (
              <button
                type="button"
                onClick={clearAll}
                className="min-h-11 text-sm font-semibold text-primary underline underline-offset-2"
              >
                Effacer les filtres
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
