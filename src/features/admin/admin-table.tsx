"use client";

/**
 * Briques partagées par les tables d'administration.
 *
 * Chaque page admin liste, filtre, pagine et agit ligne par ligne — autant
 * factoriser la barre de filtres, la pagination et l'enveloppe d'états.
 */
import { EmptyState, Icon, Select, Skeleton, TBody, TD, TR, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Barre d'outils d'un écran de liste.
 *
 * ── Pourquoi un panneau et non des contrôles posés sur la page ──────────────
 *
 * Champ, sélecteurs et pastilles flottaient jusqu'ici directement sur le fond,
 * au-dessus d'un tableau encadré : trois plans pour un seul geste. Réunis dans
 * un panneau de même facture que le tableau, ils se lisent comme ce qu'ils
 * sont — les commandes de la liste qui suit.
 */
export function AdminToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-level-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminFilters({
  query,
  onQueryChange,
  placeholder = "Rechercher…",
  onReset,
  children,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  /**
   * Remise à zéro de TOUS les filtres de l'écran.
   *
   * Fournie seulement quand quelque chose est effectivement filtré : un bouton
   * « réinitialiser » toujours présent est un bouton qui ne dit rien de l'état
   * courant. Sa présence EST l'indication qu'un filtre est actif — ce que trois
   * contrôles dispersés ne montrent pas d'un coup d'œil.
   */
  onReset?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <AdminToolbar>
      <div className="relative min-w-56 flex-1">
        <Icon
          name="search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
        />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-4 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>
      {children}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary"
        >
          <Icon name="close" className="text-[18px]" />
          Réinitialiser
        </button>
      )}
    </AdminToolbar>
  );
}

/**
 * Pastilles de filtre exclusives — catégories, onglets d'état.
 *
 * Deux écrans les redessinaient chacun de leur côté, avec des tailles et des
 * couleurs différentes : même geste, deux apparences. Elles sont des BOUTONS et
 * non des onglets ARIA — rien n'est masqué puis révélé, c'est la même liste qui
 * se restreint —, d'où `aria-pressed` plutôt qu'un `role="tab"` qui promettrait
 * une navigation aux flèches inexistante.
 */
export function FiltrePastilles<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  /** Nom du groupe, annoncé aux lecteurs d'écran. */
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => {
        const actif = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={actif}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              actif
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Select de statut, avec une option « tous ». */
export function StatusFilter<T extends string>({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (value: T | "") => void;
  options: readonly { value: T; label: string }[];
  allLabel: string;
}) {
  return (
    <Select
      size="sm"
      className="min-w-48"
      aria-label={allLabel}
      value={value}
      onChange={(next) => onChange(next as T | "")}
      // L'option « tous » porte la chaîne vide : c'est l'absence de filtre.
      options={[{ value: "", label: allLabel }, ...options]}
    />
  );
}

/** Lignes de squelette, au nombre de colonnes de la table. */
export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <TBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TR key={rowIndex}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <TD key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TD>
          ))}
        </TR>
      ))}
    </TBody>
  );
}

/**
 * Table vide.
 *
 * Une phrase grise centrée sur une largeur de tableau se lit comme une erreur
 * de chargement. Le même bloc vide que partout ailleurs dans l'application —
 * icône, titre, et le cas échéant ce qu'il reste à faire — dit au contraire que
 * la requête a abouti et n'a rien trouvé.
 */
export function TableEmpty({
  columns,
  message,
  hint,
  icon = "search_off",
}: {
  columns: number;
  message: string;
  /** Ce qui débloquerait la situation : élargir le filtre, créer le premier élément. */
  hint?: string;
  icon?: IconName;
}) {
  return (
    <TBody>
      <TR className="hover:bg-transparent">
        <TD colSpan={columns} className="py-6">
          <EmptyState plain icon={icon} title={message} description={hint} />
        </TD>
      </TR>
    </TBody>
  );
}

// La pagination était définie ici ; elle est devenue un composant d'interface à
// part entière (`@/components/ui`), partagé avec les listes publiques. Réexportée
// pour que les pages admin gardent un import unique.
export { Pagination } from "@/components/ui";
