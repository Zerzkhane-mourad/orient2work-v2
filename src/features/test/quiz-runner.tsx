"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink, Card, CardBody, EmptyState, ErrorBanner, Icon } from "@/components/ui";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import type { ApiTestQuestion, ApiTestResult } from "@/lib/api/types";
import { useMutation } from "@/lib/api/use-api";
import { celebrate } from "@/lib/celebrate";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { clearProgress, readProgress, writeProgress } from "./quiz-progress";
import { ScoreGauge } from "./score-gauge";

interface QuizRunnerProps {
  /** Identifiant du test servi — clé de la reprise locale. */
  testId: string;
  questions: ApiTestQuestion[];
  filiere: string;
}

type Phase = "running" | "review" | "result";

/**
 * Test de validation (§5.3).
 *
 * Mise en page en deux volets : la question et l'avancement à gauche, les
 * réponses à droite. Le volet de gauche ne bouge pas d'une question à l'autre —
 * l'énoncé reste sous les yeux pendant qu'on parcourt les options.
 *
 * Trois temps : on répond, on RELIT, puis on envoie. L'envoi direct depuis la
 * dernière question rendait définitif un clic qui pouvait être accidentel, sur
 * une épreuve qui conditionne l'accès aux candidatures.
 *
 * Point capital : le navigateur ne connaît PAS les bonnes réponses et ne calcule
 * aucun score. Il transmet les réponses, le serveur corrige et renvoie le
 * résultat — sinon il suffirait d'ouvrir les outils de développement pour se
 * valider soi-même.
 */
export function QuizRunner({ testId, questions, filiere }: QuizRunnerProps) {
  const { refetch: refetchProfile } = useProfile();
  const [phase, setPhase] = useState<Phase>("running");

  // Reprise éventuelle : lue une seule fois, à l'initialisation de l'état.
  const [reprise] = useState(() => readProgress(testId, questions.length));
  const [current, setCurrent] = useState(() => reprise?.current ?? 0);
  // Un tableau d'index cochés par question : même forme quel que soit le type,
  // seul le nombre de cases autorisées change.
  const [answers, setAnswers] = useState<number[][]>(
    () => reprise?.answers ?? questions.map(() => []),
  );
  const [result, setResult] = useState<ApiTestResult | null>(null);
  const [sommaireOuvert, setSommaireOuvert] = useState(false);

  const { run, pending, error } = useMutation(api.test.submit);

  const question = questions[current];
  const multiple = question?.type === "choix_multiples";

  /*
   * Une question est répondue quand au moins une option est cochée.
   *
   * Le test précédent — `a !== null` — portait sur un tableau initialisé à `[]`
   * pour chaque question : il était donc TOUJOURS vrai, et les garde-fous qu'il
   * alimentait ne bloquaient plus rien.
   */
  const estRepondue = (index: number) => (answers[index] ?? []).length > 0;
  const answeredCount = answers.filter((selection) => selection.length > 0).length;
  const toutRepondu = questions.length > 0 && answeredCount === questions.length;
  const premiereManquante = answers.findIndex((selection) => selection.length === 0);
  const restantes = questions.length - answeredCount;
  const envoye = phase === "result";

  /* ── Reprise et garde-fous de sortie ──────────────────────────────────── */

  useEffect(() => {
    if (envoye) return;
    writeProgress(testId, { answers, current });
  }, [testId, answers, current, envoye]);

  useEffect(() => {
    // Rien à protéger tant que rien n'est saisi, ni une fois la copie envoyée.
    if (envoye || answeredCount === 0) return;

    const avertir = (event: BeforeUnloadEvent) => {
      // Le navigateur impose son propre libellé ; `preventDefault` suffit à
      // déclencher la demande de confirmation.
      event.preventDefault();
    };
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [envoye, answeredCount]);

  /*
   * La salve accompagne l'ARRIVÉE du résultat, pas son rendu : sans cette
   * garde, chaque re-rendu de l'écran de score en relancerait une.
   */
  useEffect(() => {
    if (phase === "result" && result?.reussi) void celebrate();
  }, [phase, result?.reussi]);

  /* ── Sélection ────────────────────────────────────────────────────────── */

  /**
   * Coche ou décoche une option.
   *
   * Choix unique : la sélection est remplacée. Choix multiples : on bascule, et
   * recliquer retire — c'est le seul moyen de corriger une erreur.
   */
  const select = useCallback(
    (optionIndex: number) => {
      setAnswers((prev) =>
        prev.map((selection, i) => {
          if (i !== current) return selection;
          if (!multiple) return [optionIndex];
          return selection.includes(optionIndex)
            ? selection.filter((value) => value !== optionIndex)
            : [...selection, optionIndex].sort((a, b) => a - b);
        }),
      );
    },
    [current, multiple],
  );

  /* ── Clavier ──────────────────────────────────────────────────────────── */

  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Navigation au clavier dans le groupe d'options.
   *
   * Exigée par `role="radiogroup"` : sans les flèches, le clavier traversait le
   * groupe sans jamais changer la sélection. Sur un choix unique la sélection
   * suit le focus, comme un `<input type="radio">` natif ; sur un choix
   * multiples elle ne bouge qu'à l'espace, sans quoi survoler une option la
   * cocherait.
   */
  const onOptionKeyDown = (event: React.KeyboardEvent, index: number) => {
    const total = question?.options.length ?? 0;
    if (total === 0) return;

    const suivant = ["ArrowDown", "ArrowRight"].includes(event.key);
    const precedent = ["ArrowUp", "ArrowLeft"].includes(event.key);
    if (!suivant && !precedent) return;

    event.preventDefault();
    const cible = (index + (suivant ? 1 : -1) + total) % total;
    optionRefs.current[cible]?.focus();
    if (!multiple) select(cible);
  };

  /**
   * Chiffres 1–9 : raccourci vers l'option correspondante.
   *
   * Sur une épreuve de plusieurs questions, atteindre la bonne case à la souris
   * à chaque fois est le geste le plus répété de l'écran.
   */
  useEffect(() => {
    if (phase !== "running" || !question) return;

    const onKey = (event: KeyboardEvent) => {
      // Jamais capté pendant une saisie : le raccourci ne doit pas voler une
      // frappe destinée à un champ.
      const cible = event.target as HTMLElement | null;
      if (cible && ["INPUT", "TEXTAREA", "SELECT"].includes(cible.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const rang = Number(event.key);
      if (!Number.isInteger(rang) || rang < 1 || rang > question.options.length) return;

      event.preventDefault();
      select(rang - 1);
      optionRefs.current[rang - 1]?.focus();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, question, select]);

  /* ── Envoi ────────────────────────────────────────────────────────────── */

  const ouvrirRelecture = () => {
    // Renvoie sur la première question sans réponse au lieu de proposer une
    // copie incomplète — que le serveur compterait comme autant d'erreurs.
    if (premiereManquante !== -1) {
      setCurrent(premiereManquante);
      return;
    }
    setPhase("review");
  };

  const submit = async () => {
    // Toutes les questions sont transmises : le barème serveur porte sur le test
    // entier, filtrer ici ne masquerait rien.
    const payload = questions.map((q, i) => ({ questionId: q.id, reponses: answers[i] ?? [] }));

    const submitted = await run(payload);
    if (!submitted) return; // Erreur affichée sous le récapitulatif.

    clearProgress(testId);
    setResult(submitted);
    setPhase("result");
    // Le statut du compte et le score d'employabilité viennent de changer.
    refetchProfile();
  };

  /* ── Rendu ────────────────────────────────────────────────────────────── */

  if (questions.length === 0 || !question) {
    return (
      <EmptyState
        icon="quiz"
        title="Aucune question disponible"
        description="Le référentiel de questions pour votre filière n'est pas encore alimenté. Revenez plus tard."
        action={
          <ButtonLink href="/espace-jeune/test" variant="secondary">
            Retour
          </ButtonLink>
        }
      />
    );
  }

  if (phase === "result" && result) {
    return (
      <ResultatTest
        result={result}
        onRetry={() => {
          setAnswers(questions.map(() => []));
          setCurrent(0);
          setResult(null);
          setPhase("running");
        }}
      />
    );
  }

  if (phase === "review") {
    return (
      <Relecture
        questions={questions}
        answers={answers}
        pending={pending}
        error={error}
        onEdit={(index) => {
          setCurrent(index);
          setPhase("running");
        }}
        onBack={() => setPhase("running")}
        onSubmit={() => void submit()}
      />
    );
  }

  const isLast = current === questions.length - 1;
  /** A, B, C… — le repère par lequel on désigne une option à l'oral. */
  const lettre = (index: number) => String.fromCharCode(65 + index);

  return (
    // `pb-28` : réserve la hauteur de la barre d'action fixée en bas, sinon
    // elle recouvre la dernière option d'une liste longue.
    <div className="mx-auto max-w-3xl pb-28">
      {/*
        En-tête d'épreuve, collé sous l'en-tête applicatif (h-14).

        Position ET avancement restent visibles pendant qu'on fait défiler une
        question longue : c'est la seule information dont on a besoin en
        permanence, tout le reste peut sortir de l'écran.
      */}
      <header className="sticky top-14 z-30 -mx-margin-mobile mb-8 border-b border-outline-variant bg-background/95 px-margin-mobile py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/espace-jeune/test"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-primary"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            <span className="hidden sm:inline">Quitter</span>
          </Link>

          <p className="text-sm font-bold text-primary">
            Question {current + 1} sur {questions.length}
          </p>

          <button
            type="button"
            onClick={() => setSommaireOuvert((ouvert) => !ouvert)}
            aria-expanded={sommaireOuvert}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-on-surface-variant hover:text-primary"
          >
            <Icon name="format_list_bulleted" className="text-[18px]" />
            <span className="tabular-nums">
              {answeredCount}/{questions.length}
            </span>
          </button>
        </div>

        {/* Avancement RÉEL : la barre suivait la position dans le test, elle
            était donc pleine à la dernière question sans rien avoir coché. */}
        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-variant"
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-label="Questions répondues"
        >
          <div
            className="h-full rounded-full bg-secondary-container transition-[width] duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>

        {/*
          Sommaire replié par défaut : sans lui, une question sautée ne se
          découvrait qu'au moment d'envoyer. Déplié, il ne doit pas pour autant
          disputer l'attention à l'énoncé.
        */}
        {sommaireOuvert && (
          <nav aria-label="Questions du test" className="flex flex-wrap gap-1.5 pt-3">
            {questions.map((q, i) => {
              const repondue = estRepondue(i);
              const active = i === current;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setCurrent(i);
                    setSommaireOuvert(false);
                  }}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Question ${i + 1}${repondue ? ", répondue" : ", sans réponse"}`}
                  className={cn(
                    "h-9 w-9 rounded-lg border text-xs font-bold transition-colors",
                    active
                      ? "border-primary bg-primary text-on-primary"
                      : repondue
                        ? "border-secondary/40 bg-secondary-container text-on-secondary-container"
                        : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary",
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* ── Énoncé ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* La consigne est explicite : la forme des cases seule ne suffit pas à
            faire comprendre qu'on attend plusieurs réponses. */}
        <p className="text-xs font-bold uppercase tracking-wide text-secondary">
          {multiple ? "Plusieurs réponses attendues" : "Une seule réponse"}
        </p>

        {/* `key` : rejoue l'apparition à chaque énoncé, ce qui signale le
            changement même quand deux questions se ressemblent. */}
        <h1
          key={question.id}
          className="animate-fade-in font-headline text-2xl font-bold leading-snug text-primary lg:text-3xl"
        >
          {question.enonce}
        </h1>
      </div>

      {/* ── Options ────────────────────────────────────────────────────── */}
      <div
        role={multiple ? "group" : "radiogroup"}
        aria-label={question.enonce}
        className="mt-6 space-y-3"
      >
        {question.options.map((option, i) => {
          const selected = (answers[current] ?? []).includes(i);
          return (
            <button
              // Index et non libellé : deux options peuvent porter le même texte
              // (« Vrai », « Aucune »), et React perdrait la trace de la
              // sélection sur des clés en double.
              key={i}
              type="button"
              ref={(node) => {
                optionRefs.current[i] = node;
              }}
              onClick={() => select(i)}
              onKeyDown={(event) => onOptionKeyDown(event, i)}
              role={multiple ? "checkbox" : "radio"}
              aria-checked={selected}
              // Un seul arrêt de tabulation pour le groupe : le clavier entre
              // dans la liste, puis la parcourt aux flèches.
              tabIndex={multiple || selected || (answers[current] ?? []).length === 0 ? 0 : -1}
              className={cn(
                "group flex w-full items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
                selected
                  ? "border-primary bg-primary/[0.04]"
                  : "border-outline-variant hover:border-primary hover:bg-surface-container-low",
              )}
            >
              {/*
                La pastille porte la LETTRE de l'option et devient l'indicateur
                de sélection : deux repères au même endroit plutôt qu'une case à
                cocher et une lettre qui se disputent le bord gauche. Ronde pour
                un choix unique, carrée pour un choix multiples — la convention
                installée par les formulaires natifs.
              */}
              <span
                aria-hidden
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center border-2 text-sm font-bold transition-colors",
                  multiple ? "rounded-lg" : "rounded-full",
                  selected
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant text-on-surface-variant group-hover:border-primary group-hover:text-primary",
                )}
              >
                {selected ? <Icon name="check" className="text-[18px]" /> : lettre(i)}
              </span>

              <span
                className={cn(
                  "flex-1 text-base leading-snug",
                  selected ? "font-semibold text-primary" : "text-on-surface",
                )}
              >
                {option}
              </span>

              {/* Rappel du raccourci, masqué au tactile où il n'a aucun sens. */}
              <kbd
                aria-hidden
                className="hidden h-6 w-6 shrink-0 items-center justify-center rounded border border-outline-variant text-[11px] font-semibold text-on-surface-variant sm:flex"
              >
                {i + 1}
              </kbd>
            </button>
          );
        })}
      </div>

      {reprise && (
        <p className="mt-5 flex items-start gap-1.5 rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
          <Icon name="info" className="mt-px shrink-0 text-[14px]" />
          Vos réponses précédentes ont été retrouvées sur cet appareil.
        </p>
      )}

      {error && <ErrorBanner error={error} className="mt-5" />}

      {/*
        Barre d'action fixée en bas.

        L'action suivante reste atteignable au pouce quel que soit le défilement :
        sur une liste d'options longue, il fallait auparavant redescendre
        jusqu'au bas de la page pour trouver « Suivant ».
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest/95 pb-safe backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-margin-mobile py-3 lg:px-6">
          <Button
            variant="ghost"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            <Icon name="arrow_back" className="text-[18px]" /> Précédent
          </Button>

          <span className="hidden truncate text-xs text-on-surface-variant sm:block">
            {APP_NAME} · Test {filiere}
          </span>

          {isLast ? (
            <Button onClick={ouvrirRelecture}>
              {toutRepondu
                ? "Relire mes réponses"
                : `Compléter (${restantes} restante${restantes > 1 ? "s" : ""})`}
            </Button>
          ) : (
            // Jamais désactivé : passer une question et y revenir fait partie de
            // la façon dont on compose un test. Le sommaire signale les manques,
            // et l'envoi les refuse.
            <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
              Suivant <Icon name="arrow_forward" className="text-[18px]" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Relecture ────────────────────────────────────────────────────────── */

/**
 * Récapitulatif avant envoi.
 *
 * Dernier moment où une réponse peut encore être changée : la copie part
 * ensuite au serveur, qui la corrige et met le compte à jour. On y montre ce
 * qui a été coché — jamais si c'est juste, la correction n'appartient pas au
 * navigateur.
 */
function Relecture({
  questions,
  answers,
  pending,
  error,
  onEdit,
  onBack,
  onSubmit,
}: {
  questions: ApiTestQuestion[];
  answers: number[][];
  pending: boolean;
  error: ReturnType<typeof useMutation>["error"];
  onEdit: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-headline text-2xl font-bold text-primary">Relisez vos réponses</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Vous pouvez encore revenir sur chaque question. Une fois envoyée, la copie est corrigée
          et ne peut plus être modifiée.
        </p>
      </div>

      <ol className="space-y-2">
        {questions.map((question, index) => {
          const choisies = answers[index] ?? [];
          return (
            <li
              key={question.id}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    Question {index + 1}
                  </p>
                  <p className="mt-0.5 font-semibold text-primary">{question.enonce}</p>
                  <ul className="mt-2 space-y-1">
                    {choisies.map((option) => (
                      <li
                        key={option}
                        className="flex items-start gap-1.5 text-sm text-on-surface"
                      >
                        <Icon
                          name="check"
                          className="mt-0.5 shrink-0 text-[15px] text-secondary"
                        />
                        {question.options[option]}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button variant="ghost" size="sm" onClick={() => onEdit(index)}>
                  <Icon name="edit" className="text-[16px]" /> Modifier
                </Button>
              </div>
            </li>
          );
        })}
      </ol>

      {error && <ErrorBanner error={error} />}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack} disabled={pending}>
          <Icon name="arrow_back" className="text-[18px]" /> Revenir au test
        </Button>
        <Button onClick={onSubmit} disabled={pending} size="lg">
          {pending ? "Correction…" : "Envoyer mes réponses"}
        </Button>
      </div>
    </div>
  );
}

/* ── Résultat ─────────────────────────────────────────────────────────── */

/** Écran de score, affiché une fois la copie corrigée par le serveur. */
function ResultatTest({ result, onRetry }: { result: ApiTestResult; onRetry: () => void }) {
  const { reussi, score, scoreMinimum } = result;

  return (
    <Card className="mx-auto max-w-lg overflow-hidden text-center">
      <CardBody className="flex flex-col items-center gap-5 py-10">
        <span
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full",
            reussi ? "bg-success-container text-success" : "bg-error-container text-error",
          )}
        >
          <Icon name={reussi ? "celebration" : "sentiment_dissatisfied"} className="text-4xl" />
        </span>

        <div className="flex w-full justify-center">
          <ScoreGauge score={score} seuil={scoreMinimum} />
        </div>

        <div>
          <h2 className="font-headline text-2xl font-bold text-primary">
            {reussi ? "Félicitations, test réussi !" : "Test non validé"}
          </h2>
          <p className="mt-2 text-on-surface-variant">
            {reussi
              ? "Votre profil est désormais validé. Vous pouvez candidater aux offres."
              : "Suivez quelques formations pour consolider vos acquis, puis retentez votre chance."}
          </p>
        </div>

        {reussi ? (
          <ButtonLink href="/espace-jeune/offres" size="lg">
            Découvrir les offres
          </ButtonLink>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/espace-jeune/formations" variant="outline">
              Voir les formations
            </ButtonLink>
            <Button onClick={onRetry}>Recommencer</Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
