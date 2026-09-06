"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  ErrorBanner,
  Icon,
  type IconName,
  ProgressRing,
} from "@/components/ui";
import { useProfileOptional } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import type { ApiFormation, ApiFormationQuizResult } from "@/lib/api/types";
import { useMutation } from "@/lib/api/use-api";
import { POINTS_FORMATION_VALIDEE } from "@/lib/score";
import { cn } from "@/lib/utils";

type Quiz = NonNullable<ApiFormation["quiz"]>;
type Phase = "intro" | "running" | "result";

interface FormationQuizProps {
  formationId: string;
  quiz: Quiz;
  /** The quiz only opens once the course has been read through. */
  unlocked: boolean;
}

/**
 * Quiz de validation d'une formation (§5.4).
 *
 * La correction est calculée par le SERVEUR : le navigateur ne reçoit jamais les
 * bonnes réponses avant d'avoir soumis. C'est ce qui change par rapport à la
 * maquette, où la correction s'affichait après chaque question — impossible sans
 * envoyer le corrigé au client, donc sans rendre le quiz contournable.
 *
 * Le parcours devient : répondre à tout → soumettre → correction détaillée,
 * question par question, avec les explications.
 */
export function FormationQuiz({ formationId, quiz, unlocked }: FormationQuizProps) {
  const total = quiz.questions.length;

  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  // Un tableau d'index cochés par question : la forme ne dépend pas du type,
  // seul le nombre de cases autorisées change.
  const [answers, setAnswers] = useState<number[][]>(() => quiz.questions.map(() => []));
  const [result, setResult] = useState<ApiFormationQuizResult | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);

  const { run, pending, error } = useMutation(api.formations.submitQuiz);

  const profile = useProfileOptional();
  // Meilleur score conservé côté serveur, exposé sur le profil du jeune.
  const bestScore = profile?.jeune.scoresFormations?.[formationId] ?? null;
  const dejaValidee = profile?.jeune.formationsValidees?.includes(formationId) ?? false;

  const question = quiz.questions[current]!;
  const answeredCount = answers.filter((selection) => selection.length > 0).length;
  const repondu = (index: number) => (answers[index]?.length ?? 0) > 0;

  /**
   * Coche ou décoche une option.
   *
   * Choix unique : la sélection est remplacée. Choix multiples : on bascule,
   * et recliquer retire — c'est le seul moyen de corriger une erreur.
   */
  const toggle = (optionIndex: number) => {
    setAnswers((prev) =>
      prev.map((selection, i) => {
        if (i !== current) return selection;
        if (question.type !== "choix_multiples") return [optionIndex];
        return selection.includes(optionIndex)
          ? selection.filter((value) => value !== optionIndex)
          : [...selection, optionIndex].sort((a, b) => a - b);
      }),
    );
  };

  const restart = () => {
    setAnswers(quiz.questions.map(() => []));
    setCurrent(0);
    setResult(null);
    setReviewing(null);
    setPhase("running");
  };

  const submit = async () => {
    const payload = quiz.questions
      .map((q, i) => ({ questionId: q.id, reponses: answers[i] ?? [] }))
      .filter((entry) => entry.reponses.length > 0);

    const graded = await run(formationId, payload);
    if (!graded) return;

    setResult(graded);
    setPhase("result");
    // Le score d'employabilité vient de changer : on recharge le profil.
    if (graded.reussi) void profile?.validerFormation(formationId, graded.score);
  };

  /* ---------------------------------------------------------------- locked */

  if (!unlocked) {
    return (
      <Card className="mt-6 border-dashed">
        <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-variant">
            <Icon name="lock" className="text-2xl text-on-surface-variant" />
          </span>
          <h3 className="font-headline text-lg font-bold text-primary">{quiz.titre}</h3>
          <p className="max-w-md text-sm text-on-surface-variant">
            Terminez la lecture du cours pour débloquer le test de la formation ({total} questions ·{" "}
            {quiz.scoreMinimum}% requis).
          </p>
          {bestScore !== null && (
            <p className="text-xs font-semibold text-on-surface-variant">
              Meilleur score précédent : {bestScore}%
            </p>
          )}
        </CardBody>
      </Card>
    );
  }

  /* ----------------------------------------------------------------- intro */

  if (phase === "intro") {
    // Déclarés à part et typés : dans le JSX, l'inférence élargissait `icon` en
    // `string`, ce que `Icon` n'accepte plus — il exige un nom du registre.
    const reperes: { icon: IconName; label: string; hint: string }[] = [
      { icon: "help", label: `${total} questions`, hint: "QCM et vrai/faux" },
      { icon: "flag", label: `${quiz.scoreMinimum}% requis`, hint: "pour valider" },
      profile
        ? {
            icon: "bolt",
            label: `+${POINTS_FORMATION_VALIDEE} points`,
            hint: dejaValidee ? "déjà acquis" : "sur votre score",
          }
        : { icon: "replay", label: "Illimité", hint: "tentatives possibles" },
    ];

    return (
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-outline-variant bg-secondary-container/30 px-5 py-3">
          <Icon name="quiz" className="text-xl text-secondary" filled />
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-secondary">
              Test de la formation
            </p>
            <h3 className="font-headline font-bold text-primary">{quiz.titre}</h3>
          </div>
          {bestScore !== null && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                bestScore >= quiz.scoreMinimum
                  ? "bg-success-container text-success"
                  : "bg-surface-variant text-on-surface-variant",
              )}
            >
              Meilleur : {bestScore}%
            </span>
          )}
        </div>

        <CardBody className="space-y-5">
          <p className="text-sm text-on-surface-variant">{quiz.description}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            {reperes.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-3"
              >
                <Icon name={item.icon} className="text-[20px] text-primary" />
                <div>
                  <p className="text-sm font-bold text-on-surface">{item.label}</p>
                  <p className="text-xs text-on-surface-variant">{item.hint}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="lg" onClick={restart}>
              <Icon name="play_arrow" className="text-[18px]" />
              {bestScore === null ? "Commencer le test" : "Refaire le test"}
            </Button>
            <p className="text-xs text-on-surface-variant">
              La correction détaillée s&apos;affiche à la fin du test.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- result */

  if (phase === "result" && result) {
    const correctCount = result.corrections.filter((c) => c.correcte).length;
    // Indexé par id : l'ordre des corrections suit celui du serveur.
    const byQuestion = new Map(result.corrections.map((c) => [c.questionId, c]));

    return (
      <Card className="mt-6 overflow-hidden">
        <CardBody className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full",
                result.reussi
                  ? "bg-success-container text-success"
                  : "bg-error-container text-on-error-container",
              )}
            >
              <Icon
                name={result.reussi ? "workspace_premium" : "refresh"}
                className="text-3xl"
                filled
              />
            </span>
            <ProgressRing value={result.score} size={112} strokeWidth={9} />
            <div>
              <h3 className="font-headline text-xl font-bold text-primary">
                {result.reussi ? "Test validé 🎉" : "Score insuffisant"}
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                {correctCount} bonne{correctCount > 1 ? "s" : ""} réponse
                {correctCount > 1 ? "s" : ""} sur {total}
                {result.reussi
                  ? " — formation validée."
                  : ` — il en faut ${Math.ceil((result.scoreMinimum / 100) * total)} pour valider.`}
              </p>
              {bestScore !== null && bestScore > result.score && (
                <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                  Votre meilleur score reste {bestScore}%.
                </p>
              )}
              {profile && result.reussi && (
                <p className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                  <Icon name="bolt" filled className="text-[15px]" />+{POINTS_FORMATION_VALIDEE}{" "}
                  points · score d&apos;employabilité {profile.score}/100
                </p>
              )}
            </div>
            <Button variant={result.reussi ? "outline" : "secondary"} onClick={restart}>
              <Icon name="replay" className="text-[18px]" /> Recommencer
            </Button>
          </div>

          {/* Correction détaillée, renvoyée par le serveur */}
          <div className="border-t border-outline-variant pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Correction
            </p>
            <div className="space-y-2">
              {quiz.questions.map((q, i) => {
                const correction = byQuestion.get(q.id);
                const given = answers[i] ?? [];
                const ok = correction?.correcte ?? false;
                const open = reviewing === i;

                return (
                  <div
                    key={q.id}
                    className="overflow-hidden rounded-lg border border-outline-variant"
                  >
                    <button
                      type="button"
                      onClick={() => setReviewing(open ? null : i)}
                      className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-container-low"
                    >
                      <Icon
                        name={ok ? "check_circle" : "close"}
                        filled
                        className={cn("mt-0.5 text-[18px]", ok ? "text-success" : "text-error")}
                      />
                      <span className="flex-1 text-sm font-medium text-on-surface">
                        <span className="text-on-surface-variant">{i + 1}.</span> {q.enonce}
                      </span>
                      <Icon
                        name="chevron_right"
                        className={cn(
                          "mt-0.5 text-[18px] text-on-surface-variant transition-transform",
                          open && "rotate-90",
                        )}
                      />
                    </button>
                    {open && correction && (
                      <div className="space-y-2 border-t border-outline-variant bg-surface-container-low px-3 py-3 text-sm">
                        {!ok && given.length > 0 && (
                          <p className="text-on-surface-variant">
                            <span className="font-semibold text-error">
                              Votre réponse{given.length > 1 ? "s" : ""} :
                            </span>{" "}
                            {given.map((index) => q.options[index]).join(", ")}
                          </p>
                        )}
                        <p className="text-on-surface-variant">
                          <span className="font-semibold text-success">
                            Bonne{correction.bonnesReponses.length > 1 ? "s" : ""} réponse
                            {correction.bonnesReponses.length > 1 ? "s" : ""} :
                          </span>{" "}
                          {correction.bonnesReponses.map((index) => q.options[index]).join(", ")}
                        </p>
                        {correction.explication && (
                          <p className="text-on-surface-variant">{correction.explication}</p>
                        )}
                        {q.chapitre && (
                          <p className="text-xs italic text-on-surface-variant">
                            À revoir dans « {q.chapitre} »
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  /* --------------------------------------------------------------- running */

  const isLast = current === total - 1;

  return (
    <Card className="mt-6 overflow-hidden">
      {/* Header: progress + question dots */}
      <div className="space-y-3 border-b border-outline-variant bg-surface-container-low px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-secondary">
            <Icon name="quiz" className="text-[16px]" filled /> Test de la formation
          </span>
          <span className="text-sm font-semibold text-on-surface-variant">
            Question {current + 1} / {total}
          </span>
        </div>
        <div className="flex gap-1.5">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Aller à la question ${i + 1}`}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                repondu(i)
                  ? "bg-secondary"
                  : i === current
                    ? "bg-secondary/50"
                    : "bg-surface-variant",
              )}
            />
          ))}
        </div>
      </div>

      <CardBody className="space-y-5">
        <div className="space-y-1">
          <h3 className="font-headline text-lg font-bold text-primary">{question.enonce}</h3>
          {/* La consigne est explicite : la forme des cases seule ne suffit pas
              à faire comprendre qu'on attend plusieurs réponses. */}
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {question.type === "choix_multiples"
              ? "Plusieurs réponses attendues"
              : "Une seule réponse"}
          </p>
        </div>

        <div className="space-y-2.5">
          {question.options.map((option, i) => {
            const multiple = question.type === "choix_multiples";
            const selected = (answers[current] ?? []).includes(i);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(i)}
                role={multiple ? "checkbox" : "radio"}
                aria-checked={selected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-secondary bg-secondary-container/40"
                    : "border-outline-variant hover:bg-surface-container-low",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center border text-xs font-bold",
                    // Rond = un seul choix, carré = plusieurs : convention que
                    // les formulaires natifs ont installée depuis longtemps.
                    multiple ? "rounded" : "rounded-full",
                    selected
                      ? "border-secondary bg-secondary text-white"
                      : "border-outline text-on-surface-variant",
                  )}
                >
                  {selected && multiple ? (
                    <Icon name="check" className="text-[14px]" />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="font-medium text-on-surface">{option}</span>
              </button>
            );
          })}
        </div>

        {error && <ErrorBanner error={error} />}
      </CardBody>

      <div className="flex items-center justify-between border-t border-outline-variant px-5 py-3">
        <Button variant="ghost" onClick={() => setPhase("intro")}>
          Quitter
        </Button>
        <div className="flex items-center gap-2">
          {current > 0 && (
            <Button variant="ghost" onClick={() => setCurrent((c) => c - 1)}>
              Précédent
            </Button>
          )}
          {isLast ? (
            <Button
              variant="secondary"
              onClick={() => void submit()}
              disabled={answeredCount < total || pending}
            >
              {pending ? "Correction…" : "Terminer et voir la correction"}
            </Button>
          ) : (
            <Button onClick={() => setCurrent((c) => c + 1)} disabled={!repondu(current)}>
              Question suivante
              <Icon name="arrow_forward" className="text-[18px]" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
