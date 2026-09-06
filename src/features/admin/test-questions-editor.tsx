"use client";

/**
 * Questions d'un test de validation, une par une.
 *
 * Même parti pris que pour le test d'une formation : chaque opération part
 * immédiatement à l'API plutôt que d'attendre un « Enregistrer » global. Ces
 * questions portent des identifiants auxquels les tentatives passées font
 * référence ; réécrire le lot à chaque sauvegarde les renouvellerait et
 * briserait ce lien.
 *
 * L'API renvoie le test rechargé à chaque appel : l'écran reste le reflet exact
 * de la base sans second aller-retour.
 */
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorBanner,
  Icon,
  Modal,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { ApiQuizQuestion, ApiTest } from "@/lib/api/types";
import { useMutation } from "@/lib/api/use-api";
import { QUIZ_MIN_QUESTIONS } from "@/lib/constants";
import {
  QuizQuestionForm,
  questionVide,
  TYPE_LABELS,
  type QuestionDraft,
} from "./quiz-question-form";

export function TestQuestionsEditor({
  test,
  onChange,
}: {
  test: ApiTest;
  /** Remonte le test rechargé après chaque opération. */
  onChange: (test: ApiTest) => void;
}) {
  const questions = test.questions ?? [];

  const [editing, setEditing] = useState<ApiQuizQuestion | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ApiQuizQuestion | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(questionVide);

  const ajouter = useMutation(api.admin.addTestQuestion);
  const modifier = useMutation(api.admin.updateTestQuestion);
  const supprimer = useMutation(api.admin.removeTestQuestion);

  const pending = ajouter.pending || modifier.pending || supprimer.pending;
  const erreurFormulaire = creating ? ajouter.error : modifier.error;

  const incomplet = questions.length < QUIZ_MIN_QUESTIONS;
  // Au minimum, retirer une question ferait tomber le test sous le seuil : le
  // serveur refuse, autant ne pas proposer le geste.
  const retraitPossible = questions.length > QUIZ_MIN_QUESTIONS;

  const fermer = () => {
    setCreating(false);
    setEditing(null);
    ajouter.reset();
    modifier.reset();
  };

  const ouvrirCreation = () => {
    setDraft(questionVide());
    ajouter.reset();
    setCreating(true);
  };

  const ouvrirEdition = (question: ApiQuizQuestion) => {
    setDraft({
      enonce: question.enonce,
      type: question.type,
      options: question.options,
      bonnesReponses: question.bonnesReponses,
      // Ce test ne montre jamais la correction : le champ n'existe pas.
      explication: "",
    });
    modifier.reset();
    setEditing(question);
  };

  /**
   * `continuer` laisse la modale ouverte sur une question vierge : un test se
   * remplit par lots, et chaque question ayant son propre type, on enchaîne
   * volontiers un vrai/faux après un choix multiples.
   */
  const enregistrer = async (continuer: boolean) => {
    // Repris champ par champ : l'API refuse tout champ qu'elle ne connaît pas.
    const payload = {
      enonce: draft.enonce,
      type: draft.type,
      options: draft.options,
      bonnesReponses: draft.bonnesReponses,
    };

    const maj = editing
      ? await modifier.run(test.id, editing.id, payload)
      : await ajouter.run(test.id, payload);

    if (!maj) return;
    onChange(maj);

    if (continuer) {
      setDraft(questionVide());
      return;
    }
    fermer();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Questions
          <span className="ml-2 text-sm font-normal text-on-surface-variant">
            {questions.length}
          </span>
        </CardTitle>
        <Button variant="secondary" size="sm" onClick={ouvrirCreation} disabled={pending}>
          <Icon name="add" className="text-[18px]" /> Ajouter une question
        </Button>
      </CardHeader>

      <CardBody className="space-y-4">
        {supprimer.error && <ErrorBanner error={supprimer.error} />}

        {/* Un test en cours de composition passe forcément par là : ce n'est pas
            une faute, mais il ne doit pas rester dans cet état sans qu'on le voie. */}
        {incomplet && (
          <p className="flex items-start gap-2 rounded-lg bg-warning-container px-4 py-3 text-sm text-warning">
            <Icon name="warning" className="mt-0.5 shrink-0 text-[18px]" />
            <span>
              Test incomplet : {questions.length} question sur {QUIZ_MIN_QUESTIONS} minimum. Avec
              une seule question, le score ne peut valoir que 0 % ou 100 % et le seuil de réussite
              ne veut plus rien dire.
            </span>
          </p>
        )}

        {questions.length === 0 ? (
          <p className="rounded-lg bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
            Aucune question. Tant que ce test est vide, aucun candidat de cette filière ne peut
            valider son compte.
          </p>
        ) : (
          <ul className="space-y-2">
            {questions.map((question, index) => (
              <li
                key={question.id}
                className="flex items-start gap-3 rounded-lg border border-outline-variant px-3 py-2.5"
              >
                <span className="mt-0.5 text-xs font-bold text-on-surface-variant">
                  {index + 1}.
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-on-surface">{question.enonce}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{TYPE_LABELS[question.type]}</Badge>
                    <span className="text-xs text-on-surface-variant">
                      {question.options.length} options · {question.bonnesReponses.length} bonne(s)
                      réponse(s)
                    </span>
                    {!question.active && <Badge tone="neutral">Désactivée</Badge>}
                  </div>
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => ouvrirEdition(question)}
                    aria-label={`Modifier la question ${index + 1}`}
                    title="Modifier"
                    className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                  >
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      void modifier
                        .run(test.id, question.id, { active: !question.active })
                        .then((maj) => maj && onChange(maj));
                    }}
                    aria-label={question.active ? "Désactiver" : "Réactiver"}
                    title={question.active ? "Désactiver" : "Réactiver"}
                    className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                  >
                    <Icon
                      name={question.active ? "visibility_off" : "visibility"}
                      className="text-[18px]"
                    />
                  </button>
                  <button
                    type="button"
                    disabled={pending || !retraitPossible}
                    onClick={() => {
                      supprimer.reset();
                      setDeleting(question);
                    }}
                    aria-label={`Supprimer la question ${index + 1}`}
                    title={
                      retraitPossible
                        ? "Supprimer"
                        : `Un test garde au moins ${QUIZ_MIN_QUESTIONS} questions — supprimez le test entier pour l'enlever.`
                    }
                    className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-40"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <QuizQuestionForm
        open={creating || editing !== null}
        draft={draft}
        pending={pending}
        error={erreurFormulaire}
        title={editing ? "Modifier la question" : "Nouvelle question"}
        enchainable={!editing}
        withExplication={false}
        onChange={setDraft}
        onSubmit={(continuer) => void enregistrer(continuer)}
        onClose={fermer}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Supprimer cette question ?"
        description={deleting?.enonce}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (!deleting) return;
                void supprimer.run(test.id, deleting.id).then((maj) => {
                  if (maj) {
                    onChange(maj);
                    setDeleting(null);
                  }
                });
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          Les scores déjà obtenus ne sont pas recalculés. Pour la retirer des passages à venir en
          gardant l&apos;historique lisible, préférez la désactiver.
        </p>
      </Modal>
    </Card>
  );
}
