"use client";

/**
 * Création ou modification d'un test de validation (§5.3).
 *
 * À la CRÉATION, les questions se composent ici même : l'API les accepte dans
 * le même appel, et un test livré vide n'a aucune utilité — c'est justement le
 * détour qu'on veut éviter (créer, puis aller le remplir ailleurs).
 *
 * À la MODIFICATION, seules les métadonnées se saisissent : les questions
 * portent des identifiants auxquels les tentatives passées font référence, et
 * se gèrent une par une depuis la fiche du test.
 *
 * `test` absent = création.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { useFilieres } from "@/features/admin/use-referentiel";
import { api } from "@/lib/api";
import type { ApiTest } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { QUIZ_MIN_QUESTIONS } from "@/lib/constants";
import {
  problemeQuestion,
  QuizQuestionForm,
  questionVide,
  TYPE_LABELS,
  type QuestionDraft,
} from "./quiz-question-form";

/** Titre proposé par défaut, aligné sur celui des tests déjà en base. */
const titreParDefaut = (filiere?: string) =>
  filiere ? `Test de validation — ${filiere}` : "Test de validation — commun";

export function TestEditor({ test }: { test?: ApiTest }) {
  const router = useRouter();
  const { filieres } = useFilieres();

  const [titre, setTitre] = useState(test?.titre ?? "");
  const [description, setDescription] = useState(test?.description ?? "");
  const [filiereId, setFiliereId] = useState(test?.filiereId ?? "");
  const [active, setActive] = useState(test?.active ?? true);

  // Le titre suit la filière tant que l'utilisateur ne l'a pas écrit lui-même :
  // le lui faire retaper à chaque fois serait une corvée, l'écraser une trahison.
  const [titrePersonnalise, setTitrePersonnalise] = useState(Boolean(test));

  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [draft, setDraft] = useState<QuestionDraft>(questionVide);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [probleme, setProbleme] = useState<string | null>(null);

  /*
   * Les filières déjà pourvues sont désactivées dans la liste plutôt que
   * refusées après coup : découvrir un conflit par un 409, formulaire rempli,
   * est le pire moment pour l'apprendre.
   *
   * Une page suffit — il y a au plus un test par filière, et les filières sont
   * un référentiel de quelques dizaines d'entrées. Le serveur reste de toute
   * façon le garde-fou : c'est lui qui refuse le doublon.
   */
  const { data: existants } = useApi(() => api.admin.tests({ perPage: 100 }), []);
  const prises = new Map(
    (existants?.items ?? [])
      .filter((autre) => autre.id !== test?.id)
      .map((autre) => [autre.filiereId ?? "", autre.titre]),
  );

  const creer = useMutation(api.admin.createTest);
  const modifier = useMutation(api.admin.updateTest);

  const pending = creer.pending || modifier.pending;
  const error = test ? modifier.error : creer.error;

  const filiereChoisie = filieres.find((f) => f.id === filiereId);
  const incomplet = !test && questions.length < QUIZ_MIN_QUESTIONS;

  const changerFiliere = (valeur: string) => {
    setFiliereId(valeur);
    if (!titrePersonnalise) {
      setTitre(titreParDefaut(filieres.find((f) => f.id === valeur)?.nom));
    }
  };

  const fermerQuestion = () => {
    setComposing(false);
    setEditingIndex(null);
    setProbleme(null);
  };

  const enregistrerQuestion = (continuer: boolean) => {
    /*
     * Contrôlée AVANT d'entrer dans la liste : ces questions ne partent au
     * serveur qu'à la création du test, et un 422 sur le lot ne dirait pas
     * laquelle est en cause. Le serveur reste seul juge, il revalidera.
     */
    const refus = problemeQuestion(draft);
    if (refus) {
      setProbleme(refus);
      return;
    }

    setQuestions((liste) =>
      editingIndex === null
        ? [...liste, draft]
        : liste.map((q, i) => (i === editingIndex ? draft : q)),
    );

    if (continuer && editingIndex === null) {
      setDraft(questionVide());
      setProbleme(null);
      return;
    }
    fermerQuestion();
  };

  const enregistrer = async () => {
    const enregistre = test
      ? // `null` détache explicitement la filière et rend le test commun ;
        // omettre le champ laisserait le ciblage inchangé.
        await modifier.run(test.id, { titre, description, filiereId: filiereId || null, active })
      : await creer.run({
          titre,
          description,
          // À la création, un test commun se dit en omettant le champ.
          ...(filiereId ? { filiereId } : {}),
          active,
          questions: questions.map((q) => ({
            enonce: q.enonce,
            type: q.type,
            options: q.options,
            bonnesReponses: q.bonnesReponses,
          })),
        });

    // Vers la fiche : on relit ce qu'on vient d'écrire, tel que la base le voit.
    if (enregistre) router.push(`/admin/quiz/${enregistre.id}`);
  };

  const retour = test ? `/admin/quiz/${test.id}` : "/admin/quiz";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-28">
      <Link
        href={retour}
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        {test ? "Retour au test" : "Retour aux tests"}
      </Link>

      <PageHeader
        title={test ? "Modifier le test" : "Nouveau test"}
        subtitle={
          test
            ? "Les questions se gèrent depuis la fiche du test."
            : "Une filière ne peut avoir qu'un seul test ; sans filière, il est commun à toutes."
        }
      />

      <form
        id="test-form"
        onSubmit={(event) => {
          event.preventDefault();
          void enregistrer();
        }}
        noValidate
        className="space-y-6"
      >
        {error && <ErrorBanner error={error} />}

        <Card>
          <CardHeader>
            <CardTitle>À qui s&apos;adresse ce test</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Select
              label="Filière ciblée"
              value={filiereId}
              onChange={changerFiliere}
              options={[
                {
                  value: "",
                  label: prises.has("")
                    ? "Aucune — test commun (déjà pris)"
                    : "Aucune — test commun",
                  isDisabled: prises.has(""),
                },
                ...filieres.map((f) => ({
                  value: f.id,
                  label: prises.has(f.id) ? `${f.nom} — déjà pris` : f.nom,
                  isDisabled: prises.has(f.id),
                })),
              ]}
              error={error?.issueFor("filiereId")}
              hint={
                filiereChoisie
                  ? `Servi aux candidats de la filière ${filiereChoisie.nom}.`
                  : "Le test commun sert aux candidats dont la filière n'a pas le sien."
              }
            />

            <Input
              label="Titre"
              required
              value={titre}
              onChange={(e) => {
                setTitre(e.target.value);
                setTitrePersonnalise(true);
              }}
              error={error?.issueFor("titre")}
              placeholder={titreParDefaut(filiereChoisie?.nom)}
              hint={
                titrePersonnalise ? undefined : "Proposé d'après la filière — modifiable librement."
              }
            />

            <Textarea
              label="Consigne"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={error?.issueFor("description")}
              hint="Affichée au candidat avant qu'il commence."
            />

            <label className="flex items-start gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-secondary"
              />
              <span>
                Test actif
                <span className="block text-xs text-on-surface-variant">
                  Un test inactif n&apos;est plus servi ; les tentatives passées sont conservées.
                </span>
              </span>
            </label>
          </CardBody>
        </Card>

        {/* Les questions ne se composent qu'à la création : ensuite elles portent
            des identifiants, et se modifient une par une depuis la fiche. */}
        {!test && (
          <Card>
            <CardHeader>
              <CardTitle>
                Questions
                <span className="ml-2 text-sm font-normal text-on-surface-variant">
                  {questions.length} / {QUIZ_MIN_QUESTIONS} minimum
                </span>
              </CardTitle>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => {
                  setDraft(questionVide());
                  setEditingIndex(null);
                  setComposing(true);
                }}
              >
                <Icon name="add" className="text-[18px]" /> Ajouter une question
              </Button>
            </CardHeader>

            <CardBody className="space-y-3">
              {questions.length === 0 ? (
                <p className="rounded-lg bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
                  Aucune question. Vous pouvez enregistrer le test et le remplir ensuite, mais il
                  restera incomplet — aucun candidat ne pourra valider son compte.
                </p>
              ) : (
                <ul className="space-y-2">
                  {questions.map((question, index) => (
                    <li
                      key={index}
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
                            {question.options.length} options · {question.bonnesReponses.length}{" "}
                            bonne(s) réponse(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(question);
                            setEditingIndex(index);
                            setComposing(true);
                          }}
                          aria-label={`Modifier la question ${index + 1}`}
                          title="Modifier"
                          className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container"
                        >
                          <Icon name="edit" className="text-[18px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQuestions((liste) => liste.filter((_, i) => i !== index))
                          }
                          aria-label={`Retirer la question ${index + 1}`}
                          title="Retirer"
                          className="rounded-full p-2 text-error hover:bg-error-container"
                        >
                          <Icon name="close" className="text-[18px]" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {incomplet && questions.length > 0 && (
                <p className="flex items-start gap-2 rounded-lg bg-warning-container px-4 py-3 text-sm text-warning">
                  <Icon name="warning" className="mt-0.5 shrink-0 text-[18px]" />
                  <span>
                    Avec une seule question, le score ne peut valoir que 0 % ou 100 % : le seuil de
                    réussite ne veut plus rien dire.
                  </span>
                </p>
              )}
            </CardBody>
          </Card>
        )}
      </form>

      {/*
        Barre d'action fixée en bas : le formulaire dépasse l'écran dès qu'on
        ajoute des questions, et le bouton d'enregistrement ne doit pas s'éloigner.

        `lg:left-64` reprend la largeur de la barre latérale du back-office
        (`app-shell`), sinon la barre passerait dessous. `z-30` la place sous
        l'en-tête (z-40), le tiroir mobile (z-50) et les modales (z-100).
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-on-surface-variant">
            {test ? (
              <>Modification de « {test.titre} »</>
            ) : (
              <>
                {filiereChoisie ? filiereChoisie.nom : "Test commun"} ·{" "}
                <span className={incomplet ? "font-semibold text-warning" : "text-success"}>
                  {questions.length} question{questions.length > 1 ? "s" : ""}
                </span>
              </>
            )}
          </p>

          <div className="flex gap-3">
            <Button variant="ghost" type="button" onClick={() => router.push(retour)}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              form="test-form"
              type="submit"
              disabled={pending || titre.trim().length === 0}
            >
              {pending ? "Enregistrement…" : test ? "Enregistrer" : "Créer le test"}
            </Button>
          </div>
        </div>
      </div>

      <QuizQuestionForm
        open={composing}
        draft={draft}
        pending={false}
        error={null}
        avertissement={probleme}
        title={editingIndex === null ? "Nouvelle question" : "Modifier la question"}
        enchainable={editingIndex === null}
        withExplication={false}
        onChange={setDraft}
        onSubmit={enregistrerQuestion}
        onClose={fermerQuestion}
      />
    </div>
  );
}
