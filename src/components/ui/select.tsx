"use client";

/**
 * Liste déroulante, bâtie sur react-select.
 *
 * Ce que le `<select>` natif ne savait pas faire et qui justifie la dépendance :
 *  • **filtrer au clavier** — onze filières, neuf catégories, bientôt plus : on
 *    tape trois lettres au lieu de dérouler ;
 *  • **s'afficher hors du flux** — un menu natif dans une modale ou dans un
 *    tableau à `overflow-x-auto` se retrouvait rogné ; le menu est ici porté
 *    par `document.body` ;
 *  • **se styler** — l'apparence d'un `<select>` reste dictée par le système.
 *
 * `unstyled` + `classNames` plutôt que le thème par défaut : react-select
 * conserve son enveloppe Emotion (des classes `css-…` restent dans le DOM) mais
 * n'applique plus aucune apparence — couleurs, bordures et espacements viennent
 * tous des tokens Tailwind du projet, donc d'une seule source.
 *
 * Accessibilité : react-select implémente le motif ARIA combobox (rôles, focus,
 * annonces). On y ajoute le rattachement au libellé, `aria-invalid` et le lien
 * vers le message d'erreur — que le composant ne connaît pas.
 */
import { useId } from "react";
import ReactSelect, { components, type Props as ReactSelectProps } from "react-select";
import ReactSelectCreatable from "react-select/creatable";
import { cn } from "@/lib/utils";
import { Z_LAYERS } from "@/lib/z-layers";
import { Field, FIELD_HEIGHT } from "./field";
import { Icon, type IconName } from "./icon";

export interface SelectOption {
  value: string;
  label: string;
  /** Choix affiché mais non sélectionnable (valeur historique, par exemple). */
  isDisabled?: boolean;
}

/**
 * Au-delà de ce nombre d'options, la saisie de recherche s'active d'elle-même.
 *
 * En-dessous, un champ de saisie ne ferait qu'ajouter du bruit : la liste tient
 * à l'écran.
 */
const SEARCH_THRESHOLD = 8;

/**
 * Clé de comparaison d'un libellé : minuscules, sans accents, espaces réduits.
 *
 * Reprend la règle appliquée par le serveur pour rapprocher les doublons. Sans
 * elle, taper « informatique » alors que « Informatique » existe ferait
 * apparaître « Ajouter » — une proposition trompeuse, puisque le serveur
 * renverrait de toute façon l'entrée existante.
 */
function cleDeComparaison(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s-]+/g, " ")
    .trim();
}

export interface SelectProps {
  options: readonly SelectOption[];
  /** Valeur courante ; chaîne vide = aucun choix. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Force la recherche, sinon automatique au-delà de 8 options. */
  searchable?: boolean;
  /** Ajoute une croix pour revenir à « aucun choix ». */
  clearable?: boolean;
  /** `sm` pour les barres de filtres et la pagination. */
  size?: "md" | "sm";
  /**
   * Options encore en cours de chargement.
   *
   * Sans cela, une liste alimentée par l'API s'affiche vide pendant l'appel —
   * et le reste si l'appel échoue, sans que rien ne le dise. Le champ annonce
   * « Chargement… » et refuse la saisie tant qu'il ne sait pas quoi proposer.
   */
  loading?: boolean;
  /** Message quand la liste est vide, une fois le chargement terminé. */
  emptyMessage?: string;
  /**
   * Autorise une valeur absente de la liste.
   *
   * Le nom saisi est remonté tel quel ; c'est à l'appelant de l'enregistrer et
   * de repasser l'identifiant obtenu en `value`. Le composant ne devine pas ce
   * qu'« ajouter » veut dire côté métier.
   */
  onCreate?: (nom: string) => void;
  /**
   * Texte de l'option de création. Reçoit ce que l'utilisateur a tapé.
   *
   * Une chaîne, pas un nœud : la mise en forme — icône, couleur d'accent — est
   * appliquée ici pour que cette option se distingue partout de la même façon
   * des valeurs existantes.
   */
  createLabel?: (saisie: string) => string;
  /**
   * Icône affichée en tête du champ.
   *
   * Rendue en dehors de react-select, en position absolue : la lui confier
   * imposerait un composant `Control` recalculé à chaque rendu, donc un
   * remontage des sous-composants et la perte du focus en cours de frappe.
   */
  icon?: IconName;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

/**
 * Gabarits alignés sur `fieldBase` (`input.tsx`).
 *
 * `md` reprend exactement la boîte d'un `<input>` : bordure 1 + `py-2.5` +
 * interligne 24px = 46px, et le même retrait horizontal `px-4`. Sans cette
 * égalité, un `Select` et un `Input` voisins dans une grille — « Filière » à
 * côté de « Niveau d'études » — ne s'alignent ni en hauteur ni en texte.
 */
const CONTROL_SIZE = {
  md: `${FIELD_HEIGHT} px-4 py-1 text-body-md`,
  sm: "min-h-9 px-2.5 py-0.5 text-sm",
} as const;

export function Select({
  options,
  value,
  onChange,
  label,
  hint,
  error,
  required,
  disabled,
  placeholder = "Sélectionnez…",
  searchable,
  clearable = false,
  size = "md",
  loading = false,
  emptyMessage,
  onCreate,
  createLabel = (saisie) => `Ajouter « ${saisie} »`,
  icon,
  className,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  // `null` et non `undefined` : react-select distingue « pas de valeur » d'un
  // composant non contrôlé.
  const selected = options.find((option) => option.value === value) ?? null;

  /*
   * `Creatable` est un composant distinct de react-select, choisi ici plutôt
   * que passé en props : leurs types diffèrent, et un seul rendu conditionnel
   * évite de traîner des props inertes dans le cas courant.
   */
  const Composant = onCreate ? ReactSelectCreatable : ReactSelect;

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      errorId={errorId}
    >
      <div className="relative">
        {icon && (
          <Icon
            name={icon}
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[20px]",
              disabled || loading ? "text-on-surface-variant/50" : "text-on-surface-variant",
            )}
          />
        )}
        <Composant<SelectOption>
          inputId={inputId}
          // Stabilise les identifiants internes entre le rendu serveur et le
          // rendu client : sans cela, React signale un écart d'hydratation.
          instanceId={inputId}
          options={options as SelectOption[]}
          value={selected}
          onChange={(option) => onChange(option?.value ?? "")}
          isDisabled={disabled || loading}
          isLoading={loading}
          isClearable={clearable}
          isSearchable={searchable ?? options.length > SEARCH_THRESHOLD}
          placeholder={loading ? "Chargement…" : placeholder}
          required={required}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-errormessage={error ? errorId : undefined}
          loadingMessage={() => "Chargement…"}
          noOptionsMessage={() => emptyMessage ?? "Aucun résultat"}
          components={COMPONENTS}
          // Ignorés par `ReactSelect` : seul `Creatable` les lit.
          onCreateOption={onCreate}
          formatCreateLabel={(saisie) => (
            <span className="flex items-center gap-1.5 font-semibold text-secondary">
              <Icon name="add" className="text-[16px]" />
              {createLabel(saisie)}
            </span>
          )}
          // En tête : c'est le recours quand rien ne correspond, on le cherche
          // donc en premier plutôt qu'après une liste qu'on vient de parcourir.
          createOptionPosition="first"
          // Proposition masquée dès qu'un libellé équivalent existe : le contrôle
          // par défaut de react-select est sensible à la casse et aux accents, il
          // proposerait « Ajouter Informatique » à côté de « Informatique ».
          isValidNewOption={(saisie, _selection, liste) => {
            const cle = cleDeComparaison(saisie);
            return (
              cle.length >= 2 &&
              !liste.some((option) => cleDeComparaison((option as SelectOption).label) === cle)
            );
          }}
          // Le menu sort du flux : il n'est plus rogné par une modale ni par un
          // conteneur qui défile horizontalement.
          menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
          menuPosition="fixed"
          menuPlacement="auto"
          unstyled
          styles={STYLES}
          classNames={CLASSES(size, Boolean(error), Boolean(icon))}
          className={className}
        />
      </div>
    </Field>
  );
}

/**
 * Indicateurs redessinés avec les icônes du projet.
 *
 * `unstyled` retire l'apparence de react-select mais garde ses SVG maison — un
 * chevron et une croix qui ne ressemblent à rien d'autre dans l'application, et
 * un indicateur de chargement à trois points qui, privé de ses styles, ne
 * s'anime plus. Défini au niveau du module : recréer cet objet à chaque rendu
 * remonterait les sous-composants et ferait perdre le focus.
 */
const COMPONENTS: ReactSelectProps<SelectOption>["components"] = {
  IndicatorSeparator: () => null,

  DropdownIndicator: (props) => (
    <components.DropdownIndicator {...props}>
      <Icon
        name="expand_more"
        // Le chevron se retourne à l'ouverture : c'est ce qui distingue une
        // liste ouverte d'une liste fermée sans avoir à regarder le menu.
        className={cn(
          "text-[20px] transition-transform duration-150",
          props.selectProps.menuIsOpen && "rotate-180",
        )}
      />
    </components.DropdownIndicator>
  ),

  ClearIndicator: (props) => (
    <components.ClearIndicator {...props}>
      <Icon name="close" className="text-[16px]" />
    </components.ClearIndicator>
  ),

  LoadingIndicator: () => (
    <Icon name="progress_activity" className="animate-spin text-[18px]" aria-hidden />
  ),

  /** Coche à droite de l'option retenue, plutôt qu'un aplat de couleur. */
  Option: (props) => (
    <components.Option {...props}>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{props.children}</span>
        {props.isSelected && <Icon name="check" className="shrink-0 text-[18px] text-secondary" />}
      </span>
    </components.Option>
  ),
};

/**
 * Neutralise les styles de STRUCTURE que `unstyled` laisse passer.
 *
 * `unstyled` retire l'apparence, pas la mise en boîte : react-select injecte
 * encore, via Emotion, `min-height: 38px` sur le contrôle et des marges sur la
 * saisie. Ces règles arrivent dans le `<head>` APRÈS la feuille Tailwind, à
 * spécificité égale — elles gagnent donc, et nos classes de hauteur et de
 * retrait n'avaient aucun effet. D'où ce dernier mot, donné en `styles`.
 */
const STYLES: ReactSelectProps<SelectOption>["styles"] = {
  /*
   * Empilement du menu porté par `body`.
   *
   * À passer IMPÉRATIVEMENT par `styles` et non par `classNames` : contrairement
   * à `menuCSS`, react-select n'exclut pas `menuPortalCSS` du mode `unstyled`
   * (voir `index-*.esm.js`, `menuPortalCSS`) et lui applique donc toujours
   * `zIndex: 1`. Une classe Tailwind arrivait à spécificité égale mais AVANT la
   * règle Emotion dans le `<head>` : elle perdait, et le menu ouvert depuis une
   * modale (`z-index: 100`) restait caché derrière son voile.
   */
  menuPortal: (base) => ({ ...base, zIndex: Z_LAYERS.selectMenu }),
  control: (base) => ({ ...base, minHeight: 0 }),
  valueContainer: (base) => ({ ...base, padding: 0 }),
  // La marge et le remplissage de la saisie décalaient le texte d'un ou deux
  // pixels par rapport à la valeur affichée : au clic, la ligne « sautait ».
  input: (base) => ({ ...base, margin: 0, paddingTop: 0, paddingBottom: 0 }),
  indicatorsContainer: (base) => ({ ...base, padding: 0 }),
};

/** Traduction des états de react-select en classes du design system. */
const CLASSES = (
  size: keyof typeof CONTROL_SIZE,
  hasError: boolean,
  hasIcon: boolean,
): ReactSelectProps<SelectOption>["classNames"] => ({
  control: ({ isFocused, isDisabled }) =>
    cn(
      "flex w-full cursor-pointer items-center gap-2 rounded-lg border transition-colors",
      CONTROL_SIZE[size],
      // Place laissée à l'icône rendue par-dessus.
      hasIcon && (size === "md" ? "pl-11" : "pl-9"),
      isDisabled
        ? "cursor-not-allowed border-outline-variant bg-surface-container text-on-surface-variant"
        : "bg-surface-container-lowest text-on-surface",
      isFocused ? "border-secondary ring-1 ring-secondary" : "border-outline-variant",
      hasError && "border-error",
      hasError && isFocused && "ring-error",
    ),
  // Sans écart : la liste est à choix unique, la zone de saisie suit
  // immédiatement la valeur. Un `gap` détachait le curseur du texte, ce qui se
  // lisait comme un trait posé à droite de la valeur.
  valueContainer: () => "flex flex-nowrap items-center overflow-hidden",
  // Sans atténuation : à `/60` le texte d'invite passait sous le rapport de
  // contraste minimal, et une invite illisible ne guide personne.
  placeholder: () => "truncate text-on-surface-variant",
  singleValue: () => "truncate",
  input: () => "text-on-surface",
  indicatorsContainer: () => "flex shrink-0 items-center gap-0.5 text-on-surface-variant",
  clearIndicator: () =>
    "cursor-pointer rounded-full p-1 transition-colors hover:bg-surface-container hover:text-error",
  dropdownIndicator: () => "p-0.5",
  // Pas de `menuPortal` ici : son empilement est réglé dans `STYLES`, seul
  // endroit où il l'emporte sur react-select (voir le commentaire là-bas).
  menu: () =>
    "mt-1.5 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2",
  // `scroll-py-1` : une option atteinte au clavier ne colle pas au bord.
  menuList: () => "max-h-64 scroll-py-1 overflow-y-auto p-1.5",
  option: ({ isSelected, isFocused, isDisabled }) =>
    cn(
      "cursor-pointer rounded-lg px-3 py-2.5 text-sm transition-colors",
      // Sélection signalée par la teinte de conteneur et une coche, pas par un
      // aplat plein : dans une liste, un bloc de couleur saturé écrase tout ce
      // qui l'entoure et se lit comme un survol.
      isSelected
        ? "bg-secondary-container font-semibold text-on-secondary-container"
        : isFocused
          ? "bg-surface-container text-on-surface"
          : "text-on-surface",
      isDisabled && "cursor-not-allowed text-on-surface-variant opacity-50",
    ),
  noOptionsMessage: () => "px-3 py-6 text-center text-sm text-on-surface-variant",
  loadingMessage: () => "px-3 py-6 text-center text-sm text-on-surface-variant",
  groupHeading: () =>
    "px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant",
});

/** Raccourci : options depuis une liste de libellés, la valeur EST le libellé. */
export function optionsFromLabels(labels: readonly string[]): SelectOption[] {
  return labels.map((label) => ({ value: label, label }));
}
