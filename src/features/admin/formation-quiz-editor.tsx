"use client";

/**
 * Gestion du quiz d'une formation, question par question.
 *
 * Chaque opération part immédiatement à l'API plutôt que d'attendre un
 * « Enregistrer » global : le quiz appartient à une formation qui existe déjà,
 * et surtout ces questions portent des identifiants auxquels les tentatives
 * passées font référence. Réécrire le lot à chaque sauvegarde les renouvellerait
 * et briserait ce lien.
 *
 * L'API renvoie la formation rechargée à chaque appel : l'écran reste donc le
 * reflet exact de la base, sans recharger la page.
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
  Input,
  Modal,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { ApiFormation, ApiFormationQuizQuestion } from "@/lib/api/types";
import { useMutation } from "@/lib/api/use-api";
import { QUIZ_MIN_QUESTIONS } from "@/lib/constants";
import {
  QuizQuestionForm,
  questionVide,
  TYPE_LABELS,
  type QuestionDraft,
} from "./quiz-question-form";

export function FormationQuizEditor({
  formation,
  onChange,
}: {
  formation: ApiFormation;
  /** Remonte la formation rechargée après chaque opération. */
  onChange: (formation: ApiFormation) => void;
}) {
  const quiz = formation.quiz;

  const [editing, setEditing] = useState<ApiFormationQuizQuestion | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ApiFormationQuizQuestion | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(questionVide);
  const [scoreMinimum, setScoreMinimum] = useState(String(quiz?.scoreMinimum ?? 80));

  const [suppressionQuiz, setSuppressionQuiz] = useState(false);

  const ajouter = useMutation(api.admin.addFormationQuizQuestion);
  const modifier = useMutation(api.admin.updateFormationQuizQuestion);
  const supprimer = useMutation(api.admin.removeFormationQuizQuestion);
  const supprimerQuiz = useMutation(api.admin.removeFormationQuiz);
  const majQuiz = useMutation(api.admin.updateFormationQuiz);

  const pending =
    ajouter.pending ||
    modifier.pending ||
    supprimer.pending ||
    supprimerQuiz.pending ||
    majQuiz.pending;

  const erreurFormulaire = creating ? ajouter.error : modifier.error;
  const erreurGlobale = supprimer.error ?? supprimerQuiz.error ?? majQuiz.error;

  const nombre = quiz?.questions.length ?? 0;
  const incomplet = quiz !== undefined && nombre > 0 && nombre < QUIZ_MIN_QUESTIONS;
  // Au minimum, retirer une question ferait tomber le quiz sous le seuil : le
  // serveur refuse, autant ne pas proposer le geste.
  const retraitPossible = nombre > QUIZ_MIN_QUESTIONS;

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

  const ouvrirEdition = (question: ApiFormationQuizQuestion) => {
    setDraft({
      enonce: question.enonce,
      type: question.type,
      options: question.options,
      // Le corrigé n'est servi qu'à un administrateur : il est bien là.
      bonnesReponses: question.bonnesReponses ?? [],
      explication: question.explication ?? "",
      ...(question.chapitre ? { chapitre: question.chapitre } : {}),
    });
    modifier.reset();
    setEditing(question);
  };

  /**
   * `continuer` laisse la modale ouverte sur une question vierge : un quiz se
   * construit par lots, et chaque question ayant son propre type, on enchaîne
   * volontiers un vrai/faux après un choix multiples.
   */
  const enregistrer = async (continuer: boolean) => {
    const payload = { ...draft, chapitre: draft.chapitre || undefined };
    const maj = editing
      ? await modifier.run(formation.id, editing.id, payload)
      : await ajouter.run(formation.id, payload);

    if (!maj) return;

    onChange(maj);

    if (continuer) {
      // Le chapitre est reconduit : on saisit en général plusieurs questions
      // d'affilée sur la même partie du cours.
      setDraft({ ...questionVide(), ...(draft.chapitre ? { chapitre: draft.chapitre } : {}) });
      return;
    }

    fermer();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Test de la formation
          {nombre > 0 && (
            <span className="ml-2 text-sm font-normal text-on-surface-variant">
              {nombre} question{nombre > 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {quiz && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                supprimerQuiz.reset();
                setSuppressionQuiz(true);
              }}
            >
              <Icon name="delete" className="text-[18px]" /> Supprimer le test
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={ouvrirCreation} disabled={pending}>
            <Icon name="add" className="text-[18px]" /> Ajouter une question
          </Button>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {erreurGlobale && <ErrorBanner error={erreurGlobale} />}

        {/* Un quiz existant mais incomplet est un état transitoire normal : on
            ajoute les questions une à une. Il faut juste que ça se voie. */}
        {incomplet && (
          <p className="flex items-start gap-2 rounded-lg bg-warning-container px-4 py-3 text-sm text-warning">
            <Icon name="warning" className="mt-0.5 shrink-0 text-[18px]" />
            <span>
              Test incomplet : {nombre} question sur {QUIZ_MIN_QUESTIONS} minimum. Avec une seule
              question, le score ne peut valoir que 0 % ou 100 % et le seuil de réussite ne veut
              plus rien dire.
            </span>
          </p>
        )}

        {!quiz || nombre === 0 ? (
          <p className="rounded-lg bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
            Aucune question. Sans test, la formation se valide à la simple lecture.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="Score minimum (%)"
                type="number"
                min={0}
                max={100}
                className="w-40"
                value={scoreMinimum}
                onChange={(e) => setScoreMinimum(e.target.value)}
                hint={`${Math.ceil(((Number(scoreMinimum) || 0) / 100) * quiz.questions.length)} bonne(s) réponse(s) sur ${quiz.questions.length}`}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={pending || Number(scoreMinimum) === quiz.scoreMinimum}
                onClick={() => {
                  void majQuiz
                    .run(formation.id, { scoreMinimum: Number(scoreMinimum) })
                    .then((maj) => maj && onChange(maj));
                }}
              >
                Appliquer
              </Button>
            </div>

            <ul className="space-y-2">
              {quiz.questions.map((question, index) => (
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
                        {question.options.length} options · {question.bonnesReponses?.length ?? 0}{" "}
                        bonne(s) réponse(s)
                      </span>
                      {question.chapitre && (
                        <span className="text-xs italic text-on-surface-variant">
                          {question.chapitre}
                        </span>
                      )}
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
          </>
        )}
      </CardBody>

      <QuizQuestionForm
        open={creating || editing !== null}
        draft={draft}
        pending={pending}
        error={erreurFormulaire}
        title={editing ? "Modifier la question" : "Nouvelle question"}
        enchainable={!editing}
        onChange={setDraft}
        onSubmit={(continuer) => void enregistrer(continuer)}
        onClose={fermer}
        extras={
          <Input
            label="Chapitre concerné"
            value={draft.chapitre ?? ""}
            onChange={(e) => setDraft({ ...draft, chapitre: e.target.value })}
            hint="Facultatif — indiqué au candidat quand il se trompe, pour savoir quoi relire."
          />
        }
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
                void supprimer.run(formation.id, deleting.id).then((maj) => {
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
          Les scores déjà obtenus sur cette formation ne sont pas recalculés : la suppression ne
          vaut que pour les tentatives à venir.
        </p>
      </Modal>

      <Modal
        open={suppressionQuiz}
        onClose={() => setSuppressionQuiz(false)}
        title="Supprimer le test ?"
        description={`${nombre} question${nombre > 1 ? "s" : ""} seront supprimées.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuppressionQuiz(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                void supprimerQuiz.run(formation.id).then((maj) => {
                  if (maj) {
                    onChange(maj);
                    setSuppressionQuiz(false);
                  }
                });
              }}
            >
              Supprimer le test
            </Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          La formation se validera alors à la simple lecture. Les scores déjà obtenus ne sont pas
          recalculés.
        </p>
      </Modal>
    </Card>
  );
}
