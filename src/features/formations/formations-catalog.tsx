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
import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { EmptyState, ErrorState, Icon, Pagination, ScrollRow, Skeleton } from "@/components/ui";
import { useCategories } from "@/features/admin/use-referentiel";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { useDebounced } from "@/lib/use-debounced";
import { useEcrireParams, useParam } from "@/lib/use-url-param";
import { cn } from "@/lib/utils";
import { FormationCard } from "./formation-card";
import { pointNiveau } from "./niveau";

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
  point,
  activeClassName = "border-primary bg-primary text-on-primary shadow-level-1",
  children,
}: {
  active: boolean;
  onClick: () => void;
  /** Pastille de couleur — celle que reprennent les cartes. */
  point?: string;
  /** Teinte à l'état actif, quand le filtre a sa propre couleur de sens. */
  activeClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-all duration-200",
        active
          ? activeClassName
          : "border-outline-variant bg-surface-container-lowest text-on-surface hover:-translate-y-px hover:border-primary/40 hover:text-primary",
      )}
    >
      {point && (
        <span
          aria-hidden
          className={cn("h-2.5 w-2.5 rounded-full", point, active && "ring-2 ring-white/80")}
        />
      )}
      {children}
      {active && <Icon name="close" className="-mr-1 text-[16px] opacity-80" />}
    </button>
  );
}

export function FormationsCatalog({ detailBase }: FormationsCatalogProps) {
  // L'onglet actif est mémorisé par IDENTIFIANT : renommer une catégorie depuis
  // le back-office ne doit pas vider la liste sous les yeux du visiteur.
  const [categorieId, setCategorieId] = useState<string>(TOUS);
  // Propre à cette instance : deux catalogues à l'écran ne partageraient pas
  // le même filet.
  const filetId = `categorie-filet-${useId()}`;
  const reduire = useReducedMotion();
  /** Ressort amorti : le filet arrive franchement, sans rebond qui distrait. */
  const glisse: Transition = reduire
    ? { duration: 0 }
    : { type: "spring", stiffness: 500, damping: 40 };
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
      {/* Recherche — même champ que les offres : en relief, anneau or au focus. */}
      <div className="group relative">
        <label htmlFor="catalogue-recherche" className="sr-only">
          Rechercher une formation
        </label>
        <span className="pointer-events-none absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-focus-within:bg-primary group-focus-within:text-on-primary">
          <Icon name="search" className="text-[20px]" />
        </span>
        <input
          id="catalogue-recherche"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une formation…"
          className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-3.5 pl-14 pr-4 text-body-md text-on-surface shadow-level-1 transition-shadow placeholder:text-on-surface-variant/80 focus:border-secondary-container focus:shadow-level-2 focus:outline-none focus:ring-4 focus:ring-secondary-container/40"
        />
      </div>

      {/* Catégories — la liste vient du référentiel et peut largement dépasser
          la largeur de l'écran. */}
      <ScrollRow
        aria-label="Catégories de formation"
        activeKey={categorieId}
        className="border-b border-outline-variant"
      >
        {tabs.map((c) => {
          const actif = categorieId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategorieId(c.id)}
              aria-current={actif ? "true" : undefined}
              // Lu par `ScrollRow` pour ramener l'onglet actif dans le champ.
              data-active={actif ? "true" : undefined}
              className={cn(
                "group relative min-h-12 shrink-0 whitespace-nowrap px-4 text-sm font-bold transition-colors duration-200",
                actif ? "text-primary" : "text-on-surface-variant hover:text-primary",
              )}
            >
              {c.nom}
              {/*
                UN filet partagé (`layoutId`) qui glisse d'une catégorie à
                l'autre : on voit d'où l'on part et où l'on arrive, au lieu
                d'une bordure qui s'éteint ici et s'allume là.
              */}
              {actif ? (
                <motion.span
                  layoutId={filetId}
                  transition={glisse}
                  className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-primary"
                />
              ) : (
                // Amorce au survol : on devine où le filet irait.
                <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-outline-variant opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              )}
            </button>
          );
        })}
      </ScrollRow>

      {/* Niveau + certifiante. Chaque niveau porte sa pastille — la même
          couleur que l'étiquette des cartes ; « Certifiante » s'allume en or,
          la couleur de ce qui est ACQUIS. */}
      <div className="flex flex-wrap items-center gap-2">
        {NIVEAUX.map((n) => (
          <FilterPill
            key={n}
            active={niveau === n}
            point={pointNiveau(n)}
            onClick={() => setNiveau((current) => (current === n ? "" : n))}
          >
            {n}
          </FilterPill>
        ))}
        <FilterPill
          active={certifiante}
          onClick={() => setCertifiante((v) => !v)}
          activeClassName="border-secondary-container bg-secondary-container text-on-secondary-container shadow-level-1"
        >
          <Icon name="workspace_premium" className="text-[16px]" /> Certifiante
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
          <span className="font-bold text-primary">
            {meta.total} formation{meta.total > 1 ? "s" : ""}
          </span>
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
          {/* Clé sur les filtres : chaque nouveau résultat rejoue l'apparition
              en cascade, et l'œil voit que la grille a changé. */}
          <div
            key={`${categorieId}|${q}|${niveau}|${certifiante}|${page}`}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {formations.map((f, rang) => (
              <div
                key={f.id}
                className="apparition"
                style={{ "--rang": rang } as React.CSSProperties}
              >
                <FormationCard formation={f} href={hrefFor(f.id)} />
              </div>
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
