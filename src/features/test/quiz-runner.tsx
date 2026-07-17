"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, ButtonLink, Card, CardBody, Icon, ProgressBar, ProgressRing } from "@/components/ui";
import { QUIZ_PASS_SCORE } from "@/lib/constants";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

interface QuizRunnerProps {
  questions: QuizQuestion[];
  filiere: string;
}

type Phase = "running" | "result";

/** Interactive quiz with per-question navigation and a pass/fail result (§5.3). */
export function QuizRunner({ questions, filiere }: QuizRunnerProps) {
  const [phase, setPhase] = useState<Phase>("running");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));

  const question = questions[current];
  const isLast = current === questions.length - 1;
  const answeredCount = answers.filter((a) => a !== null).length;

  const select = (optionIndex: number) => {
    setAnswers((prev) => prev.map((a, i) => (i === current ? optionIndex : a)));
  };

  const score = Math.round(
    (answers.filter((a, i) => a === questions[i].bonneReponse).length / questions.length) * 100,
  );
  const passed = score >= QUIZ_PASS_SCORE;

  if (phase === "result") {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardBody className="flex flex-col items-center gap-5 py-10">
          <span
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full",
              passed ? "bg-success-container text-success" : "bg-error-container text-on-error-container",
            )}
          >
            <Icon name={passed ? "celebration" : "sentiment_dissatisfied"} className="text-4xl" />
          </span>
          <ProgressRing value={score} size={120} strokeWidth={10} />
          <div>
            <h2 className="font-headline text-2xl font-bold text-primary">
              {passed ? "Félicitations, test réussi !" : "Test non validé"}
            </h2>
            <p className="mt-2 text-on-surface-variant">
              {passed
                ? "Votre profil est désormais validé. Vous pouvez accéder aux formations et candidater aux offres."
                : `Le score minimum est de ${QUIZ_PASS_SCORE}%. Révisez et retentez votre chance après 48h.`}
            </p>
          </div>
          {passed ? (
            <ButtonLink href="/espace-jeune" size="lg">
              Accéder à mon espace
            </ButtonLink>
          ) : (
            <div className="flex gap-3">
              <ButtonLink href="/espace-jeune/formations" variant="outline">
                Voir les formations
              </ButtonLink>
              <Button
                onClick={() => {
                  setAnswers(questions.map(() => null));
                  setCurrent(0);
                  setPhase("running");
                }}
              >
                Recommencer
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/espace-jeune/test" className="text-sm text-on-surface-variant hover:text-primary">
          ← Quitter
        </Link>
        <span className="text-sm font-semibold text-on-surface-variant">
          Question {current + 1} / {questions.length}
        </span>
      </div>

      <ProgressBar value={((current + 1) / questions.length) * 100} />

      <Card>
        <CardBody className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-secondary">
            <Icon name="quiz" className="text-[16px]" /> Test {filiere}
          </div>
          <h2 className="font-headline text-xl font-bold text-primary">{question.enonce}</h2>

          <div className="space-y-3">
            {question.options.map((option, i) => {
              const selected = answers[current] === i;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => select(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    selected
                      ? "border-secondary bg-secondary-container/40"
                      : "border-outline-variant hover:bg-surface-container-low",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                      selected ? "border-secondary bg-secondary text-white" : "border-outline",
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-medium text-on-surface">{option}</span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
          Précédent
        </Button>
        {isLast ? (
          <Button
            variant="secondary"
            onClick={() => setPhase("result")}
            disabled={answeredCount < questions.length}
          >
            Terminer le test
          </Button>
        ) : (
          <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} disabled={answers[current] === null}>
            Suivant
          </Button>
        )}
      </div>
    </div>
  );
}
