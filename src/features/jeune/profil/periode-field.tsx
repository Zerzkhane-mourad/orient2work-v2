"use client";

/**
 * Saisie d'une période d'expérience : début, fin, et « toujours en poste ».
 *
 * Deux champs `month` plutôt qu'un champ libre. Le mois est la bonne granularité
 * — personne ne retient le jour exact où un stage a commencé — et le navigateur
 * fournit son propre sélecteur, donc aucun format à deviner.
 *
 * Note de compatibilité : Firefox ne gère pas `type="month"` et rend un champ
 * texte. D'où le `placeholder`, le `pattern` et l'aide sous le groupe : la
 * saisie reste possible et guidée là où le sélecteur natif manque.
 */
import { useId } from "react";
import { Icon } from "@/components/ui";
import { fieldBase } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { moisCourant, type Periode } from "./periode";

interface PeriodeFieldProps {
  value: Periode;
  onChange: (periode: Periode) => void;
  /** Message de validation, affiché sous le groupe. */
  error?: string | null;
  /**
   * Texte non relisible d'une expérience saisie avant ce champ. Affiché pour
   * que le candidat retrouve ce qu'il avait écrit au lieu de le chercher.
   */
  ancienneValeur?: string;
}

export function PeriodeField({ value, onChange, error, ancienneValeur }: PeriodeFieldProps) {
  const groupId = useId();
  const debutId = `${groupId}-debut`;
  const finId = `${groupId}-fin`;
  const erreurId = `${groupId}-erreur`;
  const aideId = `${groupId}-aide`;

  // Une expérience ne se termine pas dans le futur ; le début non plus.
  const max = moisCourant(new Date());

  const champ = cn(fieldBase, error && "border-error focus:border-error focus:ring-error");

  return (
    // `fieldset`/`legend` : deux champs pour UNE donnée. Sans regroupement, un
    // lecteur d'écran annonce « Début » et « Fin » sans dire de quoi.
    <fieldset aria-describedby={error ? erreurId : aideId}>
      <legend className="mb-1.5 text-sm font-semibold text-on-surface">
        Période <span className="text-error">*</span>
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={debutId} className="mb-1 block text-xs text-on-surface-variant">
            Début
          </label>
          <input
            id={debutId}
            type="month"
            required
            max={max}
            placeholder="AAAA-MM"
            pattern="\d{4}-\d{2}"
            value={value.debut}
            onChange={(event) => onChange({ ...value, debut: event.target.value })}
            aria-invalid={error ? true : undefined}
            className={champ}
          />
        </div>

        <div>
          <label
            htmlFor={finId}
            className={cn(
              "mb-1 block text-xs",
              value.enCours ? "text-on-surface-variant/50" : "text-on-surface-variant",
            )}
          >
            Fin
          </label>
          <input
            id={finId}
            type="month"
            // Désactivé plutôt que masqué : le champ garde sa place, la grille
            // ne se réorganise pas au clic sur la case.
            disabled={value.enCours}
            min={value.debut || undefined}
            max={max}
            placeholder={value.enCours ? "En cours" : "AAAA-MM"}
            pattern="\d{4}-\d{2}"
            value={value.enCours ? "" : value.fin}
            onChange={(event) => onChange({ ...value, fin: event.target.value })}
            aria-invalid={error ? true : undefined}
            className={cn(champ, value.enCours && "cursor-not-allowed opacity-60")}
          />
        </div>
      </div>

      <label className="mt-2.5 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-on-surface">
        <input
          type="checkbox"
          checked={value.enCours}
          // La fin est effacée en même temps : la conserver ferait réapparaître
          // une date périmée si la case est décochée plus tard.
          onChange={(event) => onChange({ ...value, enCours: event.target.checked, fin: "" })}
          className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary"
        />
        J&apos;occupe toujours ce poste
      </label>

      {error ? (
        <p id={erreurId} role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      ) : (
        <p id={aideId} className="mt-1 text-xs text-on-surface-variant">
          Mois et année suffisent.
        </p>
      )}

      {ancienneValeur && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
          <Icon name="info" className="mt-px shrink-0 text-[14px]" />
          <span>
            Période saisie précédemment : « {ancienneValeur} ». Choisissez les mois correspondants.
          </span>
        </p>
      )}
    </fieldset>
  );
}
