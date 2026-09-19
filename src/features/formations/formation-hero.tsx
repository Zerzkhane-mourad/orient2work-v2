"use client";

/**
 * En-tête d'une formation, sur le modèle des pages de cours Udemy : un bandeau
 * sombre qui dit DE QUOI il s'agit (titre, promesse, note, auteur, niveau), et
 * une carte qui dit OÙ en est le jeune et QUOI faire ensuite — une seule action
 * principale, qui change avec l'avancement.
 */
import Image from "next/image";
import {
  Badge,
  Button,
  Icon,
  ProgressBar,
  StarRating,
  type IconName,
} from "@/components/ui";
import type { ApiFormation } from "@/lib/api/types";
import { mediaUrl } from "@/lib/api/urls";
import { cn } from "@/lib/utils";
import { CertificatButton } from "./certificat-button";

interface FormationHeroProps {
  formation: ApiFormation;
  /** Avancement courant (%), tenu à jour par le lecteur. */
  progress: number;
  lue: boolean;
  validee: boolean;
  onShowAvis: () => void;
}

export function FormationHero({
  formation,
  progress,
  lue,
  validee,
  onShowAvis,
}: FormationHeroProps) {
  const cover = mediaUrl(formation.image);
  const hasRating =
    typeof formation.note === "number" && formation.nombreAvis > 0;

  const meta: { icon: IconName; label: string }[] = [
    { icon: "schedule", label: `${formation.tempsLectureMin} min de lecture` },
    { icon: "menu_book", label: `${formation.nombreChapitres} chapitres` },
    ...(formation.niveau
      ? [{ icon: "bar_chart" as const, label: formation.niveau }]
      : []),
    { icon: "translate", label: "Français" },
  ];

  return (
    <section className="-mx-margin-mobile -mt-6 bg-primary text-white sm:mx-0 sm:mt-0 sm:rounded-2xl">
      <div className="grid gap-8 px-margin-mobile py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:px-10 lg:py-10">
        {/* ── Présentation ───────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          <nav
            aria-label="Fil d'Ariane"
            className="text-sm font-semibold text-secondary-fixed-dim"
          >
            Formations <span className="mx-1.5 text-white/40">›</span>{" "}
            {formation.categorie}
            {formation.filiere && (
              <>
                <span className="mx-1.5 text-white/40">›</span>{" "}
                {formation.filiere}
              </>
            )}
          </nav>

          <h1 className="font-headline text-headline-lg-mobile text-white lg:text-headline-lg">
            {formation.titre}
          </h1>
          {(formation.sousTitre || formation.description) && (
            <p className="max-w-2xl text-base leading-relaxed text-white/85 lg:text-lg">
              {formation.sousTitre ?? formation.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {formation.populaire && (
              <Badge tone="gold" icon="trending_up">
                Populaire
              </Badge>
            )}
            {formation.certifiante && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/30 px-2.5 py-0.5 text-xs font-semibold text-white">
                <Icon name="workspace_premium" className="text-[14px]" />{" "}
                Certifiante
              </span>
            )}
            {hasRating && (
              <button
                type="button"
                onClick={onShowAvis}
                className="rounded text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <StarRating
                  value={formation.note!}
                  className="[&>span:first-child]:text-secondary-fixed-dim"
                />
                <span className="ml-1 text-white/70 underline-offset-2">
                  ({formation.nombreAvis} avis)
                </span>
              </button>
            )}
          </div>

          {formation.instructeur && (
            <p className="text-sm text-white/80">
              Créée par{" "}
              <span className="font-semibold text-secondary-fixed-dim">
                {formation.instructeur}
              </span>
            </p>
          )}

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
            {meta.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <Icon name={item.icon} className="text-[17px] text-white/60" />
                {item.label}
              </li>
            ))}
          </ul>

          <div className="hidden max-w-xl rounded-xl border border-white/15 bg-white/5 p-5 lg:block">
            <Comprend formation={formation} tone="dark" />
          </div>
        </div>

        {/* ── Carte d'action ─────────────────────────────────────────────── */}
        <aside className="overflow-hidden rounded-xl bg-surface-container-lowest text-on-surface shadow-xl ring-1 ring-black/5">
          <div className="relative aspect-video bg-gradient-to-br from-primary-container to-primary">
            {cover ? (
              <Image
                src={cover}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 340px, 100vw"
                className="object-cover"
              />
            ) : (
              <Icon
                name="school"
                className="absolute inset-0 m-auto text-6xl text-white/30"
              />
            )}
            {validee && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-success-container px-2.5 py-1 text-xs font-bold text-on-success-container shadow">
                <Icon name="verified" filled className="text-[15px]" />{" "}
                Formation validée
              </span>
            )}
          </div>

          <div className="space-y-5 p-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-on-surface">
                  Votre progression
                </span>
                <span className="font-bold text-primary">{progress}%</span>
              </div>
              <ProgressBar value={progress} className="h-2" />
              <p className="text-xs text-on-surface-variant">
                {statusLine(progress, lue, validee, Boolean(formation.quiz))}
              </p>
            </div>

            <PrimaryAction
              formation={formation}
              progress={progress}
              lue={lue}
              validee={validee}
            />

            <div className="border-t border-outline-variant pt-4 lg:hidden">
              <Comprend formation={formation} tone="light" />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PrimaryAction({
  formation,
  progress,
  lue,
  validee,
}: Pick<FormationHeroProps, "formation" | "progress" | "lue" | "validee">) {
  if (validee) {
    return (
      <div className="flex flex-col gap-2 [&>span]:w-full [&_button]:w-full">
        <CertificatButton
          formationId={formation.id}
          formation={formation.titre}
          variant="secondary"
          size="lg"
        />
        <Button variant="outline" fullWidth onClick={() => scrollToId("cours")}>
          <Icon name="replay" className="text-[18px]" /> Revoir le cours
        </Button>
      </div>
    );
  }

  if ((lue || progress >= 100) && formation.quiz) {
    return (
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        onClick={() => scrollToId("quiz")}
      >
        <Icon name="quiz" className="text-[20px]" /> Passer le test final
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      fullWidth
      onClick={() => scrollToId("cours")}
    >
      <Icon name="play_arrow" filled className="text-[20px]" />
      {progress > 0 ? "Reprendre le cours" : "Commencer la formation"}
    </Button>
  );
}

function statusLine(
  progress: number,
  lue: boolean,
  validee: boolean,
  hasQuiz: boolean,
): string {
  if (validee) return "Bravo ! Test réussi, votre certificat est disponible.";
  if ((lue || progress >= 100) && hasQuiz)
    return "Cours terminé — il ne reste que le test.";
  if (progress > 0) return "Reprenez là où vous vous êtes arrêté.";
  return "Pas encore commencée.";
}

/** Contenu inclus : sur fond clair dans la carte (mobile), sur le bandeau sombre (desktop). */
function Comprend({
  formation,
  tone,
}: {
  formation: ApiFormation;
  tone: "light" | "dark";
}) {
  const items: { icon: IconName; label: string }[] = [
    {
      icon: "auto_stories",
      label: `${formation.nombreChapitres} chapitres · ${formation.tempsLectureMin} min de lecture`,
    },
    ...(formation.quiz
      ? [
          {
            icon: "quiz" as const,
            label: `Test final · ${formation.quiz.questions.length} questions`,
          },
        ]
      : []),
    { icon: "all_inclusive", label: "Accès illimité, à votre rythme" },
    ...(formation.certifiante && formation.quiz
      ? [
          {
            icon: "workspace_premium" as const,
            label: "Certificat de réussite nominatif",
          },
        ]
      : []),
  ];

  return (
    <>
      <p
        className={cn(
          "mb-2.5 text-sm font-bold",
          tone === "dark" ? "text-white" : "text-on-surface",
        )}
      >
        Cette formation comprend :
      </p>
      <ul
        className={cn(
          "grid gap-2 text-sm",
          tone === "dark"
            ? "text-white/80 sm:grid-cols-2 sm:gap-x-6"
            : "text-on-surface-variant",
        )}
      >
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5">
            <Icon
              name={item.icon}
              className={cn(
                "shrink-0 text-[18px]",
                tone === "dark" ? "text-secondary-fixed-dim" : "text-primary",
              )}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </>
  );
}

export function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
