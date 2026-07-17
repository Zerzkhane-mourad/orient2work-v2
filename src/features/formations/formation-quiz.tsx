"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink, Card, CardBody, Icon, ProgressRing } from "@/components/ui";
import type { FormationQuiz as Quiz } from "@/lib/types";
import { cn } from "@/lib/utils";

const bestScoreKey = (id: string) => `o2w:formation:${id}:quiz-best`;

type Phase = "intro" | "running" | "result";

interface FormationQuizProps {
  formationId: string;
  quiz: Quiz;
  /** The quiz only opens once the course has been read through. */
  unlocked: boolean;
}

/**
 * Validation quiz of a formation.
 *
 * One question at a time: the learner picks an answer, validates it, and gets the
 * correction plus the explanation immediately — then moves on. The final screen
 * scores the attempt and lets the learner review every question. The best score is
 * kept per formation in localStorage (a real backend can replace that later).
 */
export function FormationQuiz({ formationId, quiz, unlocked }: FormationQuizProps) {
  const total = quiz.questions.length;

  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  /** Index of the option being considered, before validation. */
  const [pending, setPending] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);

  const question = quiz.questions[current];

  const correctCount = useMemo(
    () => answers.filter((a, i) => a !== null && a === quiz.questions[i].bonneReponse).length,
    [answers, quiz.questions],
  );
  const score = Math.round((correctCount / total) * 100);
  const passed = score >= quiz.scoreMinimum;

  // Restore the best score once on mount.
  useEffect(() => {
    const saved = window.localStorage.getItem(bestScoreKey(formationId));
    if (saved !== null && !Number.isNaN(Number(saved))) setBestScore(Number(saved));
  }, [formationId]);

  // Persist the best score when an attempt ends.
  useEffect(() => {
    if (phase !== "result") return;
    setBestScore((prev) => {
      const next = prev === null ? score : Math.max(prev, score);
      window.localStorage.setItem(bestScoreKey(formationId), String(next));
      return next;
    });
  }, [phase, score, formationId]);

  const restart = () => {
    setAnswers(quiz.questions.map(() => null));
    setCurrent(0);
    setPending(null);
    setRevealed(false);
    setReviewing(null);
    setPhase("running");
  };

  const validate = () => {
    if (pending === null) return;
    setAnswers((prev) => prev.map((a, i) => (i === current ? pending : a)));
    setRevealed(true);
  };

  const next = () => {
    if (current === total - 1) {
      setPhase("result");
      return;
    }
    setCurrent((c) => c + 1);
    setPending(null);
    setRevealed(false);
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
            Terminez la lecture du cours pour débloquer le quiz de validation
            {" "}({total} questions · {quiz.scoreMinimum}% requis).
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
    return (
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-outline-variant bg-secondary-container/30 px-5 py-3">
          <Icon name="quiz" className="text-xl text-secondary" filled />
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-secondary">
              Quiz de validation
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
            {[
              { icon: "help", label: `${total} questions`, hint: "QCM et vrai/faux" },
              { icon: "flag", label: `${quiz.scoreMinimum}% requis`, hint: "pour valider" },
              { icon: "replay", label: "Illimité", hint: "tentatives possibles" },
            ].map((item) => (
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
              {bestScore === null ? "Commencer le quiz" : "Refaire le quiz"}
            </Button>
            <p className="text-xs text-on-surface-variant">
              La correction s&apos;affiche après chaque réponse.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- result */

  if (phase === "result") {
    return (
      <Card className="mt-6 overflow-hidden">
        <CardBody className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full",
                passed ? "bg-success-container text-success" : "bg-error-container text-on-error-container",
              )}
            >
              <Icon name={passed ? "workspace_premium" : "refresh"} className="text-3xl" filled />
            </span>
            <ProgressRing value={score} size={112} strokeWidth={9} />
            <div>
              <h3 className="font-headline text-xl font-bold text-primary">
                {passed ? "Quiz validé 🎉" : "Score insuffisant"}
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                {correctCount} bonne{correctCount > 1 ? "s" : ""} réponse
                {correctCount > 1 ? "s" : ""} sur {total}
                {passed
                  ? " — votre certificat est disponible."
                  : ` — il en faut ${Math.ceil((quiz.scoreMinimum / 100) * total)} pour valider.`}
              </p>
              {bestScore !== null && bestScore > score && (
                <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                  Votre meilleur score reste {bestScore}%.
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant={passed ? "outline" : "secondary"} onClick={restart}>
                <Icon name="replay" className="text-[18px]" /> Recommencer
              </Button>
              {passed && (
                <ButtonLink href="/espace-jeune/documents" variant="secondary">
                  <Icon name="workspace_premium" className="text-[18px]" /> Mon certificat
                </ButtonLink>
              )}
            </div>
          </div>

          {/* Answer review */}
          <div className="border-t border-outline-variant pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Revoir mes réponses
            </p>
            <div className="space-y-2">
              {quiz.questions.map((q, i) => {
                const given = answers[i];
                const ok = given === q.bonneReponse;
                const open = reviewing === i;
                return (
                  <div key={q.id} className="overflow-hidden rounded-lg border border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setReviewing(open ? null : i)}
                      className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-container-low"
                    >
                      <Icon
                        name={ok ? "check_circle" : "cancel"}
                        filled
                        className={cn("mt-0.5 text-[18px]", ok ? "text-success" : "text-error")}
                      />
                      <span className="flex-1 text-sm font-medium text-on-surface">
                        <span className="text-on-surface-variant">{i + 1}.</span> {q.enonce}
                      </span>
                      <Icon
                        name={open ? "expand_less" : "expand_more"}
                        className="mt-0.5 text-[18px] text-on-surface-variant"
                      />
                    </button>
                    {open && (
                      <div className="space-y-2 border-t border-outline-variant bg-surface-container-low px-3 py-3 text-sm">
                        {!ok && given !== null && (
                          <p className="text-on-surface-variant">
                            <span className="font-semibold text-error">Votre réponse :</span>{" "}
                            {q.options[given]}
                          </p>
                        )}
                        <p className="text-on-surface-variant">
                          <span className="font-semibold text-success">Bonne réponse :</span>{" "}
                          {q.options[q.bonneReponse]}
                        </p>
                        <p className="text-on-surface-variant">{q.explication}</p>
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

  const answered = answers[current];
  const isCorrect = revealed && answered === question.bonneReponse;

  return (
    <Card className="mt-6 overflow-hidden">
      {/* Header: progress + question dots */}
      <div className="space-y-3 border-b border-outline-variant bg-surface-container-low px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-secondary">
            <Icon name="quiz" className="text-[16px]" filled /> Quiz de validation
          </span>
          <span className="text-sm font-semibold text-on-surface-variant">
            Question {current + 1} / {total}
          </span>
        </div>
        <div className="flex gap-1.5">
          {quiz.questions.map((q, i) => {
            const a = answers[i];
            const done = a !== null && (i < current || revealed);
            return (
              <span
                key={q.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  done
                    ? a === q.bonneReponse
                      ? "bg-success"
                      : "bg-error"
                    : i === current
                      ? "bg-secondary"
                      : "bg-surface-variant",
                )}
              />
            );
          })}
        </div>
      </div>

      <CardBody className="space-y-5">
        <h3 className="font-headline text-lg font-bold text-primary">{question.enonce}</h3>

        <div className="space-y-2.5">
          {question.options.map((option, i) => {
            const isPending = !revealed && pending === i;
            const isRight = revealed && i === question.bonneReponse;
            const isWrongPick = revealed && answered === i && i !== question.bonneReponse;

            return (
              <button
                key={option}
                type="button"
                disabled={revealed}
                onClick={() => setPending(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  isRight && "border-success bg-success-container/40",
                  isWrongPick && "border-error bg-error-container/40",
                  isPending && "border-secondary bg-secondary-container/40",
                  !revealed && !isPending && "border-outline-variant hover:bg-surface-container-low",
                  revealed && !isRight && !isWrongPick && "border-outline-variant opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    isRight && "border-success bg-success text-white",
                    isWrongPick && "border-error bg-error text-white",
                    isPending && "border-secondary bg-secondary text-white",
                    !isRight && !isWrongPick && !isPending && "border-outline text-on-surface-variant",
                  )}
                >
                  {isRight ? (
                    <Icon name="check" className="text-[14px]" />
                  ) : isWrongPick ? (
                    <Icon name="close" className="text-[14px]" />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="font-medium text-on-surface">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Correction + explanation, shown once the answer is validated */}
        {revealed && (
          <div
            className={cn(
              "space-y-1.5 rounded-lg border-l-4 px-4 py-3",
              isCorrect
                ? "border-success bg-success-container/30"
                : "border-error bg-error-container/30",
            )}
          >
            <p
              className={cn(
                "flex items-center gap-2 text-sm font-bold",
                isCorrect ? "text-success" : "text-error",
              )}
            >
              <Icon name={isCorrect ? "check_circle" : "cancel"} filled className="text-[18px]" />
              {isCorrect ? "Bonne réponse !" : "Réponse incorrecte"}
            </p>
            <p className="text-sm text-on-surface-variant">{question.explication}</p>
            {question.chapitre && (
              <p className="text-xs italic text-on-surface-variant">
                Chapitre : « {question.chapitre} »
              </p>
            )}
          </div>
        )}
      </CardBody>

      <div className="flex items-center justify-between border-t border-outline-variant px-5 py-3">
        <Button variant="ghost" onClick={() => setPhase("intro")}>
          Quitter
        </Button>
        {revealed ? (
          <Button variant="secondary" onClick={next}>
            {current === total - 1 ? "Voir mon résultat" : "Question suivante"}
            <Icon name="arrow_forward" className="text-[18px]" />
          </Button>
        ) : (
          <Button onClick={validate} disabled={pending === null}>
            Valider ma réponse
          </Button>
        )}
      </div>
    </Card>
  );
}
