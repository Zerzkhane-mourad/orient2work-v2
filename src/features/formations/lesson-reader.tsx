"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Card, CardBody, Icon, ProgressRing, RichText } from "@/components/ui";
import { FormationQuiz } from "./formation-quiz";
import type { Formation } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Progress is considered "finished" past this threshold (the last lines are rarely scrolled to). */
const COMPLETE_AT = 98;

const storageKey = (id: string) => `o2w:formation:${id}:progress`;

interface Heading {
  id: string;
  text: string;
}

/**
 * Text-course reader with automatic progression detection.
 *
 * The body is admin-authored rich HTML; its `<h2>` headings are turned into the
 * chapter list. Progress is derived from how far the learner has scrolled and only
 * ever increases, then persisted per formation in localStorage (a real backend can
 * replace that later).
 */
export function LessonReader({ formation }: { formation: Formation }) {
  const articleRef = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [progress, setProgress] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Restore saved progress once on mount.
  useEffect(() => {
    const saved = Number(window.localStorage.getItem(storageKey(formation.id)) ?? 0);
    if (!Number.isNaN(saved)) setProgress(saved);
    setHydrated(true);
  }, [formation.id]);

  // Persist whenever progress advances.
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey(formation.id), String(progress));
  }, [progress, hydrated, formation.id]);

  // Build the table of contents from the rendered <h2> headings.
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll("h2"));
    nodes.forEach((node, i) => {
      if (!node.id) node.id = `chapitre-${i + 1}`;
      node.classList.add("scroll-mt-24");
    });
    setHeadings(nodes.map((n) => ({ id: n.id, text: n.textContent ?? "" })));
  }, [formation.contenuHtml]);

  const recompute = useCallback(() => {
    const el = articleRef.current;
    if (!el) return;

    // How far the article has been scrolled through the viewport.
    const top = el.offsetTop;
    const readable = el.offsetHeight - window.innerHeight * 0.5;
    const scrolled = window.scrollY + window.innerHeight * 0.5 - top;
    const pct = readable <= 0 ? 100 : (scrolled / readable) * 100;
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));

    // Progress only moves forward.
    setProgress((prev) => (clamped > prev ? clamped : prev));

    // Active chapter = the last heading above the middle of the viewport.
    const mid = window.scrollY + window.innerHeight * 0.35;
    let current = 0;
    headings.forEach((h, i) => {
      const node = document.getElementById(h.id);
      if (node && node.offsetTop <= mid) current = i;
    });
    setActiveChapter(current);
  }, [headings]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(recompute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    recompute();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [recompute]);

  const done = progress >= COMPLETE_AT;
  const readChapters = done ? headings.length : activeChapter;

  const scrollToChapter = (id: string) => {
    const node = document.getElementById(id);
    if (node) window.scrollTo({ top: node.offsetTop - 80, behavior: "smooth" });
  };

  const scrollToQuiz = () => scrollToChapter("quiz");

  return (
    <>
      {/* Reading progress bar — pinned under the app header */}
      <div className="fixed left-0 right-0 top-14 z-30 h-1 bg-surface-variant">
        <div
          className="h-full bg-secondary-container transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Article */}
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              <div ref={articleRef}>
                <RichText html={formation.contenuHtml} />
              </div>
            </CardBody>
          </Card>

          {/* Completion */}
          <Card className={cn("mt-6", done ? "bg-success-container" : "bg-surface-container-low")}>
            <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
              <Icon
                name={done ? "celebration" : "auto_stories"}
                className={cn("text-4xl", done ? "text-success" : "text-on-surface-variant")}
              />
              {done ? (
                <>
                  <h3 className="font-headline text-xl font-bold text-primary">
                    Formation terminée 🎉
                  </h3>
                  <p className="max-w-md text-sm text-on-surface-variant">
                    Vous avez lu l&apos;intégralité du cours. Validez le quiz pour obtenir votre
                    certificat nominatif.
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {formation.quiz && (
                      <Button variant="secondary" onClick={scrollToQuiz}>
                        <Icon name="quiz" className="text-[18px]" /> Passer le quiz de validation
                      </Button>
                    )}
                    <ButtonLink href="/espace-jeune/documents" variant="outline">
                      <Icon name="workspace_premium" className="text-[18px]" /> Mon certificat
                    </ButtonLink>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-headline text-lg font-bold text-primary">
                    Continuez votre lecture
                  </h3>
                  <p className="max-w-md text-sm text-on-surface-variant">
                    Votre progression est enregistrée automatiquement. Terminez le cours pour
                    débloquer le quiz et votre certificat.
                  </p>
                </>
              )}
            </CardBody>
          </Card>

          {/* Validation quiz — unlocked once the course has been read */}
          {formation.quiz && (
            <div id="quiz" className="scroll-mt-24">
              <FormationQuiz formationId={formation.id} quiz={formation.quiz} unlocked={done} />
            </div>
          )}
        </div>

        {/* Sticky progress + chapters */}
        <aside>
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center gap-4">
                  <ProgressRing value={progress} size={64} strokeWidth={7} />
                  <div>
                    <p className="font-bold text-primary">
                      {done ? "Terminé" : progress > 0 ? "En cours" : "Pas encore commencé"}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {readChapters}/{headings.length} chapitres · {formation.tempsLectureMin} min
                    </p>
                  </div>
                </div>

                {headings.length > 0 && (
                  <div className="space-y-0.5 border-t border-outline-variant pt-3">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      Chapitres
                    </p>
                    {headings.map((h, i) => {
                      const read = i < activeChapter || done;
                      const current = i === activeChapter && !done;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => scrollToChapter(h.id)}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-surface-container-low",
                            current ? "font-semibold text-primary" : "text-on-surface-variant",
                          )}
                        >
                          <Icon
                            name={
                              read ? "check_circle" : current ? "play_arrow" : "radio_button_unchecked"
                            }
                            filled={read}
                            className={cn(
                              "mt-0.5 text-[16px]",
                              read ? "text-success" : current ? "text-secondary" : "text-outline",
                            )}
                          />
                          <span className="flex-1">{h.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-2">
                <p className="font-bold text-primary">Cette formation comprend :</p>
                <ul className="space-y-2 text-sm text-on-surface-variant">
                  <li className="flex items-center gap-2">
                    <Icon name="auto_stories" className="text-[18px] text-primary" />
                    {formation.tempsLectureMin} min de lecture
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="picture_as_pdf" className="text-[18px] text-primary" />
                    Cours téléchargeable (PDF)
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="quiz" className="text-[18px] text-primary" />
                    {formation.quiz
                      ? `Quiz de validation (${formation.quiz.questions.length} questions)`
                      : "Quiz de validation"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="workspace_premium" className="text-[18px] text-primary" />
                    Certificat de fin de formation
                  </li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </aside>
      </div>
    </>
  );
}
