/**
 * Habillage commun d'un contrôle de formulaire : libellé, aide, erreur.
 *
 * Extrait de `input.tsx` pour être partagé avec le `Select` (qui vit dans son
 * propre fichier, react-select imposant un composant client).
 */
export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  /** Identifiant du message d'erreur, à rattacher au contrôle. */
  errorId?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, error, required, htmlFor, errorId, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-on-surface">
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        // `role="alert"` : une bordure rouge ne dit rien à un lecteur d'écran,
        // et le message apparaît APRÈS le rendu initial — il doit être annoncé.
        <p id={errorId} role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Hauteur d'un contrôle de formulaire.
 *
 * Partagée par `Input`, `Textarea` et `Select` : côte à côte dans une grille —
 * « Structure / Entreprise » à côté de « Type » — deux contrôles calculés
 * séparément finissent par diverger d'un ou deux pixels, et l'écart se voit.
 * Le `min-h` fixe le plancher, le remplissage vertical ne fait plus foi.
 */
export const FIELD_HEIGHT = "min-h-[46px]";

/** Base visuelle commune aux champs de saisie. */
export const fieldBase =
  `w-full ${FIELD_HEIGHT} rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-60`;
