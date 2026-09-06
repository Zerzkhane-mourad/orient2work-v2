"use client";

/**
 * Pagination — navigation entre les pages d'une liste.
 *
 * Trois partis pris d'ergonomie :
 *  • les numéros sont cliquables, pas seulement « précédent / suivant » : sauter
 *    à la dernière page ne doit pas demander vingt clics ;
 *  • la fenêtre de numéros garde une largeur CONSTANTE quelle que soit la page
 *    courante — sinon les boutons se déplacent sous le curseur d'un clic à
 *    l'autre, et on rate la page visée ;
 *  • sur mobile les numéros s'effacent au profit d'un simple « Page 3 / 9 » : la
 *    cible tactile des flèches reste large plutôt que d'entasser dix boutons.
 *
 * Accessibilité : `<nav>` étiqueté, page courante marquée `aria-current="page"`,
 * et le décompte des résultats vit dans une région live — un lecteur d'écran
 * annonce donc « 21–40 sur 87 résultats » après un changement de page, alors que
 * rien n'a pris le focus.
 */
import { Icon } from "./icon";
import { Select } from "./select";
import type { ApiMeta } from "@/lib/api/types";
import { PER_PAGE_OPTIONS } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";

/** Nombre de pages affichées de part et d'autre de la page courante. */
const SIBLINGS = 1;

/**
 * Nombre d'éléments affichés au total : première page, dernière page, la fenêtre
 * autour de la page courante, et les deux ellipses possibles.
 */
const MAX_VISIBLE = 2 * SIBLINGS + 5;

/**
 * Numéros affichés d'affilée quand la page courante est collée à un bord : une
 * ellipse disparaît, la place gagnée est rendue à des numéros.
 */
const EDGE_RUN = 2 * SIBLINGS + 3;

type PageItem = number | "gap";

/** Suite d'entiers de `from` à `to`, bornes comprises. */
function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/**
 * Numéros à afficher : première et dernière page toujours présentes, une fenêtre
 * autour de la page courante, des ellipses pour le reste.
 *
 * Le nombre d'éléments rendus est TOUJOURS `MAX_VISIBLE` dès que la liste est
 * assez longue : près d'un bord, la fenêtre s'élargit d'autant que l'ellipse
 * économise. Sans cette compensation, les boutons se décaleraient d'un cran
 * entre la page 1 et la page 2, sous le curseur.
 */
export function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= MAX_VISIBLE) return range(1, totalPages);

  if (page <= SIBLINGS + 2) {
    return [...range(1, EDGE_RUN), "gap", totalPages];
  }

  if (page >= totalPages - (SIBLINGS + 1)) {
    return [1, "gap", ...range(totalPages - EDGE_RUN + 1, totalPages)];
  }

  return [1, "gap", ...range(page - SIBLINGS, page + SIBLINGS), "gap", totalPages];
}

export interface PaginationProps {
  meta: ApiMeta;
  onPageChange: (page: number) => void;
  /**
   * Change la taille de page. Fourni ⇒ le sélecteur « Lignes par page »
   * apparaît ; omis ⇒ la taille est imposée par l'écran.
   */
  onPerPageChange?: (perPage: number) => void;
  /** Tailles proposées. */
  perPageOptions?: readonly number[];
  /**
   * Requête en cours : les contrôles sont neutralisés le temps de la réponse.
   * Sans cela, deux clics rapides enchaînent deux sauts de page.
   */
  busy?: boolean;
  /** Nom de l'élément listé, au singulier — « offre », « talent »… */
  unit?: string;
  className?: string;
}

export function Pagination({
  meta,
  onPageChange,
  onPerPageChange,
  perPageOptions = PER_PAGE_OPTIONS,
  busy = false,
  unit = "résultat",
  className,
}: PaginationProps) {
  const { page, perPage, total, totalPages } = meta;

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const plural = total > 1 ? "s" : "";

  // Une seule page : le décompte total suffit, la position n'apprend rien.
  const summary =
    totalPages <= 1 ? `${total} ${unit}${plural}` : `${from}–${to} sur ${total} ${unit}${plural}`;

  // Le sélecteur ne sert à rien tant que tout tient sur une page à la plus
  // petite taille proposée : on ne montre pas un réglage sans effet.
  const showPerPage = Boolean(onPerPageChange) && total > Math.min(...perPageOptions);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col items-center justify-between gap-3 sm:flex-row",
        totalPages <= 1 && !showPerPage && "sm:justify-center",
        className,
      )}
    >
      {/* `role="status"` : annoncé après coup, sans voler le focus au bouton cliqué. */}
      <p role="status" className="text-sm text-on-surface-variant">
        {summary}
      </p>

      <div className="flex items-center gap-4">
        {showPerPage && onPerPageChange && (
          <PerPageSelect
            value={perPage}
            options={perPageOptions}
            disabled={busy}
            onChange={onPerPageChange}
          />
        )}

        {totalPages > 1 && (
          <ul className="flex items-center gap-1">
            <li>
              <ArrowButton
                direction="previous"
                disabled={busy || page <= 1}
                onClick={() => onPageChange(page - 1)}
              />
            </li>

            {/* Numéros : masqués sur petit écran au profit du compteur ci-dessous. */}
            {buildPageItems(page, totalPages).map((item, index) =>
              item === "gap" ? (
                <li
                  key={`gap-${index}`}
                  aria-hidden="true"
                  className="hidden select-none px-1 text-on-surface-variant sm:block"
                >
                  …
                </li>
              ) : (
                <li key={item} className="hidden sm:block">
                  <PageButton
                    page={item}
                    current={item === page}
                    disabled={busy}
                    onClick={() => onPageChange(item)}
                  />
                </li>
              ),
            )}

            <li aria-hidden="true" className="px-2 text-sm text-on-surface-variant sm:hidden">
              Page {page} / {totalPages}
            </li>

            <li>
              <ArrowButton
                direction="next"
                disabled={busy || page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              />
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
}

/**
 * Sélecteur de densité.
 *
 * Le libellé visible s'efface sur petit écran ; l'`aria-label` prend le relais
 * pour que le nom accessible reste complet. Pas de recherche : quatre valeurs
 * numériques se parcourent plus vite qu'elles ne se tapent.
 *
 * Exporté à part pour les écrans qui empilent PLUSIEURS listes : un seul
 * sélecteur les pilote toutes, plutôt qu'un par section.
 */
export function PerPageSelect({
  value,
  options = PER_PAGE_OPTIONS,
  disabled = false,
  label = "Lignes par page",
  onChange,
}: {
  value: number;
  options?: readonly number[];
  disabled?: boolean;
  /** Adapté au contenu — « Par section », par exemple. */
  label?: string;
  onChange: (perPage: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
      <span className="hidden whitespace-nowrap md:inline">{label}</span>
      <Select
        size="sm"
        className="w-[5.5rem]"
        aria-label={label}
        value={String(value)}
        disabled={disabled}
        searchable={false}
        onChange={(next) => onChange(Number(next))}
        options={options.map((option) => ({ value: String(option), label: String(option) }))}
      />
    </div>
  );
}

/**
 * Base commune aux boutons : cible tactile de 36px minimum et anneau de focus
 * visible au clavier.
 */
const buttonBase =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40";

function PageButton({
  page,
  current,
  disabled,
  onClick,
}: {
  page: number;
  current: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      // Le libellé visible est un chiffre nu : hors contexte, « 4 » ne veut rien
      // dire pour un lecteur d'écran.
      aria-label={`Page ${page}`}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        buttonBase,
        current
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container",
      )}
    >
      {page}
    </button>
  );
}

const ARROWS = {
  previous: { icon: "arrow_back", label: "Page précédente" },
  next: { icon: "arrow_forward", label: "Page suivante" },
} as const;

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: keyof typeof ARROWS;
  disabled: boolean;
  onClick: () => void;
}) {
  const { icon, label } = ARROWS[direction];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        buttonBase,
        "border border-outline-variant text-on-surface-variant hover:bg-surface-container",
      )}
    >
      <Icon name={icon} className="text-[18px]" />
    </button>
  );
}
