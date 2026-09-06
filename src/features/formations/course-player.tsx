"use client";

/**
 * Lecteur de cours, chapitre par chapitre.
 *
 * Reprend le modèle des LMS (LearnDash, Tutor) : un sommaire toujours visible,
 * UN chapitre à l'écran, et une barre d'action « Marquer terminé → suivant ».
 *
 * Ce que cela change par rapport à une page unique déroulante :
 *  - l'avancement devient EXPLICITE (le lecteur décide), au lieu d'être déduit
 *    du défilement — un long chapitre survolé ne comptait pas moins qu'un
 *    chapitre lu ;
 *  - le sommaire est connu AVANT de commencer, donc l'effort est prévisible ;
 *  - la reprise retombe sur le premier chapitre non terminé, pas sur une
 *    position de scroll approximative.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ButtonLink, Card, CardBody, Icon, ProgressBar, RichText } from "@/components/ui";
import { completedFromProgress, splitIntoChapters } from "./chapters";
import { FormationQuiz } from "./formation-quiz";
import { useProfileOptional } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import type { ApiFormation } from "@/lib/api/types";
import { POINTS_FORMATION_LUE, POINTS_FORMATION_VALIDEE } from "@/lib/score";
import { cn } from "@/lib/utils";

export function CoursePlayer({ formation }: { formation: ApiFormation }) {
  const chapters = useMemo(
    () => splitIntoChapters(formation.contenuHtml),
    [formation.contenuHtml],
  );
  const total = chapters.length;

  const [completed, setCompleted] = useState(() =>
    completedFromProgress(formation.progression, total),
  );
  // Reprise : le premier chapitre non terminé, borné au dernier existant.
  const [index, setIndex] = useState(() =>
    Math.min(completedFromProgress(formation.progression, total), Math.max(0, total - 1)),
  );
  const [outlineOpen, setOutlineOpen] = useState(false);

  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const done = total > 0 && completed >= total;
  const chapter = chapters[index];

  const topRef = useRef<HTMLDivElement>(null);

  /* ── Enregistrement de la progression ─────────────────────────────────── */

  // Dernière valeur transmise : la progression est monotone côté serveur, mais
  // rejouer la même valeur ne ferait qu'ajouter des requêtes.
  const savedRef = useRef(formation.progression);

  useEffect(() => {
    if (progress <= savedRef.current) return;
    savedRef.current = progress;
    // Un échec ne doit pas interrompre la lecture : le prochain chapitre
    // terminé renverra de toute façon une valeur plus élevée.
    void api.formations.saveProgression(formation.id, progress).catch(() => undefined);
  }, [progress, formation.id]);

  /* ── Score : lecture terminée ─────────────────────────────────────────── */

  const profile = useProfileOptional();
  const dejaLue = profile?.jeune.formationsLues?.includes(formation.id) ?? false;
  const dejaValidee = profile?.jeune.formationsValidees?.includes(formation.id) ?? false;

  useEffect(() => {
    if (!done || !profile || dejaLue) return;
    // Marque la lecture côté serveur puis recharge le profil : le score se met
    // à jour dans toute l'application.
    void profile.markFormationLue(formation.id);
  }, [done, profile, dejaLue, formation.id]);

  /* ── Navigation ───────────────────────────────────────────────────────── */

  const goTo = useCallback((next: number) => {
    setIndex(next);
    setOutlineOpen(false);
    // Le chapitre change sans que la page bouge : sans ce recalage, on arrive
    // au milieu du nouveau texte.
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  const completeCurrent = useCallback(() => {
    setCompleted((current) => Math.max(current, index + 1));
    if (index + 1 < total) goTo(index + 1);
  }, [index, total, goTo]);

  const currentDone = index < completed;
  const isLast = index === total - 1;

  const scrollToQuiz = () => {
    document.getElementById("quiz")?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  if (total === 0) {
    return (
      <Card>
        <CardBody>
          <RichText html={formation.contenuHtml} />
        </CardBody>
      </Card>
    );
  }

  /* ── Sommaire, partagé entre le rail latéral et le repli mobile ───────── */

  const outline = (
    <nav aria-label="Contenu du cours" className="space-y-0.5">
      {chapters.map((c, i) => {
        const chapterDone = i < completed;
        const current = i === index;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => goTo(i)}
            aria-current={current ? "step" : undefined}
            className={cn(
              // min-h-11 : cible tactile de 44px, la liste se parcourt au pouce.
              "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
              current
                ? "bg-surface-container font-semibold text-primary"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
            )}
          >
            <Icon
              name={chapterDone ? "check_circle" : current ? "play_arrow" : "radio_button_unchecked"}
              filled={chapterDone || current}
              className={cn(
                "shrink-0 text-[18px]",
                chapterDone ? "text-success" : current ? "text-secondary" : "text-outline",
              )}
            />
            <span className="flex-1 leading-snug">{c.title}</span>
            <span className="sr-only">
              {chapterDone ? "(terminé)" : current ? "(en cours)" : ""}
            </span>
          </button>
        );
      })}

      {formation.quiz && (
        <div
          className={cn(
            "mt-1 flex min-h-11 items-center gap-2.5 rounded-lg border-t border-outline-variant px-2.5 py-2 pt-3 text-sm",
            done ? "text-primary" : "text-on-surface-variant",
          )}
        >
          <Icon
            name={done ? "quiz" : "lock"}
            className={cn("shrink-0 text-[18px]", done ? "text-secondary" : "text-outline")}
          />
          <span className="flex-1 font-semibold">Test de la formation</span>
        </div>
      )}
    </nav>
  );

  return (
    <div ref={topRef}>
      {/* Barre de cours — colle sous l'en-tête applicatif (h-14). */}
      <div className="sticky top-14 z-30 -mx-margin-mobile mb-5 border-b border-outline-variant bg-surface-container-lowest/95 px-margin-mobile py-2.5 backdrop-blur lg:-mx-6 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-primary">{formation.titre}</p>
            <p className="text-xs text-on-surface-variant">
              {completed}/{total} chapitres · {progress}%
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOutlineOpen((open) => !open)}
            aria-expanded={outlineOpen}
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-primary hover:bg-surface-container-low lg:hidden"
          >
            <Icon name="format_list_bulleted" className="text-[20px]" />
            Sommaire
          </button>
        </div>
        <ProgressBar value={progress} className="mt-2 h-1" />
      </div>

      {/* Sommaire mobile, replié par défaut. */}
      {outlineOpen && (
        <Card className="mb-5 lg:hidden">
          <CardBody className="p-2">{outline}</CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Chapitre courant */}
        <div className="min-w-0">
          <Card>
            <CardBody>
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Chapitre {index + 1} sur {total}
              </p>
              <h2 className="mt-1 font-headline text-2xl font-bold text-primary">
                {chapter!.title}
              </h2>
              <RichText html={chapter!.html} className="mt-4" />
            </CardBody>
          </Card>

          {/* Barre d'action — le geste central du lecteur. */}
          <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="justify-center"
            >
              <Icon name="arrow_back" className="text-[18px]" /> Chapitre précédent
            </Button>

            {currentDone && !isLast ? (
              <Button onClick={() => goTo(index + 1)} className="justify-center">
                Chapitre suivant <Icon name="arrow_forward" className="text-[18px]" />
              </Button>
            ) : currentDone && isLast ? (
              <span className="flex items-center justify-center gap-1.5 text-sm font-semibold text-success">
                <Icon name="check_circle" filled className="text-[18px]" /> Cours terminé
              </span>
            ) : (
              <Button variant="secondary" onClick={completeCurrent} className="justify-center">
                <Icon name="check" className="text-[18px]" />
                {isLast ? "Terminer la formation" : "Marquer terminé"}
              </Button>
            )}
          </div>

          {/* Fin de parcours */}
          {done && (
            <Card className="mt-6 bg-success-container">
              <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
                <Icon name="celebration" className="text-4xl text-success" />
                <h3 className="font-headline text-xl font-bold text-primary">Formation terminée</h3>
                <p className="max-w-md text-sm text-on-surface-variant">
                  Vous avez parcouru l&apos;intégralité du cours. Validez le test pour obtenir votre
                  certificat nominatif.
                </p>
                {profile && (
                  <p className="flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                    <Icon name="bolt" filled className="text-[15px]" />
                    {dejaValidee
                      ? `Formation validée · +${POINTS_FORMATION_VALIDEE} points de score`
                      : `+${POINTS_FORMATION_LUE} points de score · +${POINTS_FORMATION_LUE} de plus en réussissant le test`}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  {formation.quiz && (
                    <Button variant="secondary" onClick={scrollToQuiz}>
                      <Icon name="quiz" className="text-[18px]" /> Passer le test
                    </Button>
                  )}
                  <ButtonLink href="/espace-jeune/documents" variant="outline">
                    <Icon name="workspace_premium" className="text-[18px]" /> Mon certificat
                  </ButtonLink>
                </div>
              </CardBody>
            </Card>
          )}

          {formation.quiz && (
            <div id="quiz" className="mt-6">
              <FormationQuiz formationId={formation.id} quiz={formation.quiz} unlocked={done} />
            </div>
          )}
        </div>

        {/* Rail — sommaire + contenu de la formation */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-4">
            <Card>
              <CardBody className="space-y-3 p-3">
                <div className="flex items-baseline justify-between px-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    Contenu du cours
                  </p>
                  <span className="text-xs font-semibold text-primary">
                    {completed}/{total}
                  </span>
                </div>
                {outline}
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
                      ? `Test de la formation (${formation.quiz.questions.length} questions)`
                      : "Test de la formation"}
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
    </div>
  );
}
