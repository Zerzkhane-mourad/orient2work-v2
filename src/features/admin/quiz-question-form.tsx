"use client";

/**
 * Saisie d'une question de quiz.
 *
 * Partagée par les deux quiz du projet — validation d'une formation et test
 * général — qui ont exactement la même forme de question. Les champs qui leur
 * sont propres (chapitre, filière, activation) sont passés en `extras`.
 *
 * Trois types, calqués sur ceux d'Udemy :
 *  • **choix unique** — une bonne réponse, cases rondes ;
 *  • **choix multiples** — au moins deux, cases carrées ;
 *  • **vrai / faux** — choix unique à exactement deux options.
 *
 * Deux emballages, selon le contexte :
 *  • `QuizQuestionFields` — les champs nus, pour une page dédiée ;
 *  • `QuizQuestionForm` — la même chose en modale, pour l'éditeur de formation
 *    où quitter la page ferait perdre le reste du cours en cours d'écriture.
 *
 * La saisie applique les mêmes règles que le serveur pour guider l'utilisateur,
 * mais ne s'y substitue pas : c'est `domain/quiz.ts` qui fait foi, et ses
 * erreurs 422 sont affichées sur le bon champ.
 */
import { useEffect } from "react";
import { Button, ErrorBanner, Icon, Input, Modal, Select, Textarea } from "@/components/ui";
import type { ApiError } from "@/lib/api/errors";
import type { QuestionType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface QuestionDraft {
  enonce: string;
  type: QuestionType;
  options: string[];
  bonnesReponses: number[];
  explication: string;
  chapitre?: string;
}

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "qcm", label: "Choix unique" },
  { value: "choix_multiples", label: "Choix multiples" },
  { value: "vrai_faux", label: "Vrai / Faux" },
];

/** Libellé lisible d'un type, partagé par les listes et les fiches. */
export const TYPE_LABELS: Record<QuestionType, string> = {
  qcm: "Choix unique",
  choix_multiples: "Choix multiples",
  vrai_faux: "Vrai / Faux",
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

/** Question vierge : deux options, aucune réponse cochée. */
export function questionVide(): QuestionDraft {
  return { enonce: "", type: "qcm", options: ["", ""], bonnesReponses: [], explication: "" };
}

/**
 * Ce qui empêche d'enregistrer la question, ou `null` si elle est valide.
 *
 * Reprend les règles de `domain/quiz.ts`, qui reste seul juge : ce contrôle
 * n'existe que pour les écrans qui composent plusieurs questions AVANT de les
 * envoyer, où une erreur 422 n'arriverait qu'à la sauvegarde du lot — trop tard
 * pour savoir laquelle est en cause.
 */
export function problemeQuestion(draft: QuestionDraft): string | null {
  if (draft.enonce.trim().length === 0) return "L'énoncé est obligatoire.";
  if (draft.options.some((option) => option.trim().length === 0)) {
    return "Chaque option doit être renseignée.";
  }
  if (draft.bonnesReponses.length === 0) return "Cochez au moins une bonne réponse.";

  if (draft.type === "choix_multiples" && draft.bonnesReponses.length < 2) {
    return "Une question à choix multiples attend au moins deux bonnes réponses.";
  }
  if (draft.type !== "choix_multiples" && draft.bonnesReponses.length !== 1) {
    return "Une question à choix unique attend exactement une bonne réponse.";
  }
  return null;
}

interface FieldsProps {
  draft: QuestionDraft;
  error: ApiError | null;
  /**
   * Refus local, sans aller-retour serveur — voir `problemeQuestion`. Affiché
   * au même endroit qu'une erreur d'API : pour l'utilisateur, c'est la même
   * chose, seul le moment change.
   */
  avertissement?: string | null;
  /** Champs propres au quiz appelant (filière, activation…). */
  extras?: React.ReactNode;
  /**
   * Le test de validation ne renvoie au candidat que son score, jamais la
   * correction : y saisir une explication n'aurait nulle part où s'afficher.
   */
  withExplication?: boolean;
  onChange: (draft: QuestionDraft) => void;
}

export function QuizQuestionFields({
  draft,
  error,
  avertissement,
  extras,
  withExplication = true,
  onChange,
}: FieldsProps) {
  const multiple = draft.type === "choix_multiples";

  // Vrai/Faux impose ses deux options : les saisir serait une corvée inutile,
  // et le serveur refuserait tout autre nombre.
  useEffect(() => {
    if (draft.type === "vrai_faux" && draft.options.join("|") !== "Vrai|Faux") {
      onChange({ ...draft, options: ["Vrai", "Faux"], bonnesReponses: [] });
    }
  }, [draft, onChange]);

  const setOption = (index: number, valeur: string) => {
    onChange({ ...draft, options: draft.options.map((o, i) => (i === index ? valeur : o)) });
  };

  const addOption = () => {
    if (draft.options.length >= MAX_OPTIONS) return;
    onChange({ ...draft, options: [...draft.options, ""] });
  };

  /** Retirer une option décale les index : les réponses cochées suivent. */
  const removeOption = (index: number) => {
    if (draft.options.length <= MIN_OPTIONS) return;
    onChange({
      ...draft,
      options: draft.options.filter((_, i) => i !== index),
      bonnesReponses: draft.bonnesReponses
        .filter((position) => position !== index)
        .map((position) => (position > index ? position - 1 : position)),
    });
  };

  const toggleReponse = (index: number) => {
    if (!multiple) {
      onChange({ ...draft, bonnesReponses: [index] });
      return;
    }
    onChange({
      ...draft,
      bonnesReponses: draft.bonnesReponses.includes(index)
        ? draft.bonnesReponses.filter((position) => position !== index)
        : [...draft.bonnesReponses, index].sort((a, b) => a - b),
    });
  };

  const changerType = (type: QuestionType) => {
    // Passer en choix unique ne peut garder qu'une réponse ; l'inverse conserve
    // ce qui était coché, l'utilisateur complétera.
    onChange({
      ...draft,
      type,
      bonnesReponses:
        type === "choix_multiples" ? draft.bonnesReponses : draft.bonnesReponses.slice(0, 1),
    });
  };

  return (
    <>
      {error && <ErrorBanner error={error} />}

      {avertissement && (
        <p
          className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error"
          role="alert"
        >
          <Icon name="warning" className="mt-0.5 shrink-0 text-[18px]" />
          <span>{avertissement}</span>
        </p>
      )}

      <Textarea
        label="Énoncé"
        required
        rows={2}
        value={draft.enonce}
        onChange={(e) => onChange({ ...draft, enonce: e.target.value })}
        error={error?.issueFor("enonce")}
        placeholder="Quels formats d'image sont acceptés ?"
      />

      <Select
        label="Type de question"
        value={draft.type}
        onChange={(value) => changerType(value as QuestionType)}
        options={TYPES}
        searchable={false}
        hint={
          multiple
            ? "Au moins deux bonnes réponses ; le candidat doit toutes les trouver, sans se tromper."
            : "Une seule bonne réponse."
        }
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">
            Options <span className="text-error">*</span>
          </span>
          <span className="text-xs text-on-surface-variant">
            {multiple ? "Cochez les bonnes réponses" : "Cochez la bonne réponse"}
          </span>
        </div>

        {error?.issueFor("bonnesReponses") && (
          <p className="text-xs text-error">{error.issueFor("bonnesReponses")}</p>
        )}
        {error?.issueFor("options") && (
          <p className="text-xs text-error">{error.issueFor("options")}</p>
        )}

        {draft.options.map((option, index) => {
          const coche = draft.bonnesReponses.includes(index);
          return (
            <div key={index} className="flex items-center gap-2">
              <button
                type="button"
                role={multiple ? "checkbox" : "radio"}
                aria-checked={coche}
                aria-label={`Marquer l'option ${index + 1} comme bonne réponse`}
                onClick={() => toggleReponse(index)}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center border transition-colors",
                  // Rond = un seul choix, carré = plusieurs : convention que les
                  // formulaires natifs ont installée depuis longtemps.
                  multiple ? "rounded-lg" : "rounded-full",
                  coche
                    ? "border-success bg-success-container text-success"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container",
                )}
              >
                <Icon
                  name={
                    coche
                      ? "check"
                      : multiple
                        ? "check_box_outline_blank"
                        : "radio_button_unchecked"
                  }
                  className="text-[18px]"
                />
              </button>

              <Input
                className="flex-1"
                aria-label={`Option ${index + 1}`}
                value={option}
                disabled={draft.type === "vrai_faux"}
                onChange={(e) => setOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
              />

              <button
                type="button"
                onClick={() => removeOption(index)}
                disabled={draft.type === "vrai_faux" || draft.options.length <= MIN_OPTIONS}
                aria-label={`Supprimer l'option ${index + 1}`}
                title="Supprimer l'option"
                className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-30"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
          );
        })}

        {draft.type !== "vrai_faux" && draft.options.length < MAX_OPTIONS && (
          <Button variant="ghost" size="sm" onClick={addOption} type="button">
            <Icon name="add" className="text-[18px]" /> Ajouter une option
          </Button>
        )}
      </div>

      {withExplication && (
        <Textarea
          label="Explication"
          rows={2}
          value={draft.explication}
          onChange={(e) => onChange({ ...draft, explication: e.target.value })}
          error={error?.issueFor("explication")}
          hint="Affichée au candidat APRÈS sa soumission, dans la correction."
        />
      )}

      {extras}
    </>
  );
}

/**
 * Les mêmes champs en modale.
 *
 * Réservé au quiz d'une formation : l'éditeur du cours a un état non
 * enregistré, une navigation le perdrait.
 */
export function QuizQuestionForm({
  open,
  pending,
  title,
  enchainable = false,
  onSubmit,
  onClose,
  ...fields
}: FieldsProps & {
  open: boolean;
  pending: boolean;
  title: string;
  /**
   * Propose « Ajouter et continuer ». Réservé à la création : un quiz se
   * construit par lots, et chaque question ayant son propre type, il faut
   * pouvoir enchaîner un vrai/faux après un choix multiples sans repasser par
   * la liste.
   */
  enchainable?: boolean;
  /** `continuer` : rester sur une question vierge au lieu de refermer. */
  onSubmit: (continuer: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Les bonnes réponses ne sont jamais envoyées au candidat avant sa soumission."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          {enchainable && (
            // `type="button"` : le formulaire est en `noValidate`, il n'y a donc
            // aucune validation native à déclencher — le serveur fait foi.
            <Button
              variant="outline"
              type="button"
              disabled={pending}
              onClick={() => onSubmit(true)}
            >
              Ajouter et continuer
            </Button>
          )}
          <Button variant="secondary" form="question-form" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <form
        id="question-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(false);
        }}
        className="space-y-4"
        noValidate
      >
        <QuizQuestionFields {...fields} />
      </form>
    </Modal>
  );
}
