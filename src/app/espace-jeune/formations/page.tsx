"use client";

import { Suspense } from "react";
import Image from "next/image";
import {
  ButtonLink,
  Card,
  CardBody,
  Icon,
  type IconName,
  ProgressBar,
  Skeleton,
  SkeletonCard,
} from "@/components/ui";
import { FormationsCatalog } from "@/features/formations/formations-catalog";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import type { ApiFormationSummary } from "@/lib/api/types";
import { mediaUrl } from "@/lib/api/urls";
import { useApi } from "@/lib/api/use-api";
import { FORMATIONS_OBJECTIF, POINTS_FORMATION_VALIDEE, scoreParts } from "@/lib/score";
import { cn } from "@/lib/utils";

/** Nombre de reprises proposées ; au-delà, le catalogue prend le relais. */
const REPRISES_VISIBLES = 4;

/** Repère de lecture : chapitre courant et minutes restantes, depuis la progression. */
function readingPosition(formation: ApiFormationSummary) {
  const ratio = Math.min(100, Math.max(0, formation.progression)) / 100;
  const chapitre =
    formation.nombreChapitres > 0
      ? Math.min(formation.nombreChapitres, Math.floor(ratio * formation.nombreChapitres) + 1)
      : 0;
  const restant = Math.max(1, Math.round(formation.tempsLectureMin * (1 - ratio)));
  return { chapitre, restant };
}

export default function MesFormationsPage() {
  const { jeune, score } = useProfile();

  /*
   * Filtrage côté SERVEUR.
   *
   * L'écran rapatriait auparavant cent formations pour n'en afficher que deux ou
   * trois, et un cours commencé au-delà de la centième disparaissait purement et
   * simplement de la reprise. `enCours` fait ce tri en base.
   */
  const reprises = useApi(
    () => api.formations.list({ enCours: true, perPage: REPRISES_VISIBLES }),
    [],
  );

  const enCours = reprises.data?.items ?? [];
  const totalEnCours = reprises.data?.meta.total ?? 0;

  // Le profil fait foi pour « lue » et « validée » : la progression seule ne
  // distingue pas un cours parcouru d'un cours dont le test a été réussi.
  const lues = jeune.formationsLues?.length ?? 0;
  const validees = jeune.formationsValidees?.length ?? 0;
  const pointsFormations = scoreParts(jeune).find((part) => part.key === "formations");

  return (
    <div className="space-y-8">
      {/*
        En-tête unique.

        L'écran empilait auparavant une bannière PUIS une rangée de compteurs
        qui redisaient la même chose sous une autre forme. Tout est réuni ici :
        l'objectif, l'avancement vers cet objectif, et les trois chiffres qui le
        composent.
      */}
      {/*
        Trois accents, chacun porteur d'un sens — et non trois décorations :
        le navi ancre le contexte, le bleu clair signale ce qui est EN COURS,
        l'or ce qui est ACQUIS. Le catalogue reste neutre, pour que ces trois
        états ressortent.

        Dégradé `inverse-surface → primary` : `primary-container` valant la même
        couleur que `primary`, l'ancien dégradé était un aplat.
      */}
      {/*
        Même bandeau que les offres et la candidature spontanée : les écrans de
        l'espace jeune se reconnaissent d'un coup d'œil. `primary-container`
        reste profond dans tous les thèmes — le dégradé vers `primary`
        virait au bleu pâle en thème sombre, sous un texte blanc.
      */}
      <section className="relative overflow-hidden rounded-2xl bg-primary-container px-5 py-6 text-white shadow-level-1 sm:px-8 sm:py-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-secondary-container/20 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-white/10 blur-3xl"
        />
        <Icon
          name="school"
          className="pointer-events-none absolute -bottom-6 right-6 hidden text-[140px] text-white/[0.05] sm:block"
        />

        <div className="relative space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
                <Icon name="school" className="text-[16px]" /> Formations
              </p>
              <h1 className="text-balance font-headline text-2xl font-bold leading-tight sm:text-3xl">
                Mes formations
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
                Chaque formation validée rapporte{" "}
                <span className="font-semibold text-secondary-fixed-dim">
                  {POINTS_FORMATION_VALIDEE} points
                </span>{" "}
                de score d&apos;employabilité, et rend votre profil plus visible auprès des
                recruteurs.
              </p>
            </div>

            <div className="shrink-0 rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur lg:min-w-64">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Score d&apos;employabilité
                </span>
                <span className="font-headline text-xl font-bold text-secondary-fixed-dim">
                  {score}
                  <span className="text-sm text-white/60">/100</span>
                </span>
              </div>
              <ProgressBar value={score} className="mt-2 h-2 bg-white/15" />
              {pointsFormations && (
                <p className="mt-2 text-xs text-white/70">
                  dont formations : {pointsFormations.points}/{pointsFormations.max} pts
                </p>
              )}
            </div>
          </div>

          {/* Trois chiffres, pas quatre : « suivies » était la somme des deux
              autres et n'apprenait rien de plus. */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Chiffre valeur={totalEnCours} label="En cours" icon="play_arrow" ton="encours" />
            <Chiffre valeur={lues} label="Terminées" icon="check_circle" ton="termine" />
            <Chiffre
              valeur={validees}
              label="Certificats"
              objectif={FORMATIONS_OBJECTIF}
              icon="workspace_premium"
              ton="acquis"
            />
          </div>
        </div>
      </section>

      {/* ── Reprendre ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <TitreSection icon="play_arrow" titre="Continuer l'apprentissage" />
          {totalEnCours > enCours.length && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {totalEnCours} au total
            </span>
          )}
        </div>

        {reprises.loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : enCours.length === 0 ? (
          /* Section conservée même vide : elle disparaissait entièrement, si
             bien qu'un nouvel arrivant n'avait aucune idée de ce qui viendrait
             s'y afficher. */
          <Card className="border-dashed">
            <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="auto_stories" />
              </span>
              <p className="text-sm text-on-surface-variant">
                Aucune formation en cours. Les cours commencés apparaîtront ici, à l&apos;endroit
                exact où vous les avez laissés.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {enCours.map((formation) => (
              <CarteReprise key={formation.id} formation={formation} />
            ))}
          </div>
        )}
      </section>

      {/* ── Certificats ────────────────────────────────────────────────── */}
      {validees > 0 && (
        /*
          Or « acquis ». Le couple d'origine — `on-secondary-container` sur
          `secondary-container` — plafonnait à 4,58:1, et son sous-titre en /80
          tombait à 3,19:1, sous le minimum AA. Les tokens `fixed` montent à
          13,3:1 pour le titre et 7,2:1 pour le sous-titre, à teinte quasi
          identique.
        */
        <Card className="border-0 bg-secondary-fixed">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-secondary">
                <Icon name="workspace_premium" />
              </span>
              <div>
                <p className="font-bold text-on-secondary-fixed">
                  {validees} certificat{validees > 1 ? "s" : ""} obtenu
                  {validees > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-on-secondary-fixed-variant">
                  Téléchargeables depuis vos documents, à joindre à vos candidatures.
                </p>
              </div>
            </div>
            <ButtonLink href="/espace-jeune/documents#certificats" variant="outline" size="sm">
              Voir mes certificats
            </ButtonLink>
          </CardBody>
        </Card>
      )}

      {/* ── Catalogue ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="space-y-1">
          <TitreSection icon="menu_book" titre="Catalogue de formations" />
          <p className="pl-11 text-sm text-on-surface-variant">
            Formations communes et de spécialité selon votre filière.
          </p>
        </div>
        {/* Le catalogue lit l'URL (`?q=`) : sans frontière de suspense, cette
            page cesserait d'être prérendue. */}
        <Suspense fallback={<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>}>
          <FormationsCatalog detailBase="/espace-jeune/formations" />
        </Suspense>
      </section>
    </div>
  );
}

/* ── Blocs ────────────────────────────────────────────────────────────── */

/**
 * Trois états, trois teintes — les mêmes que dans le reste de l'écran : bleu
 * clair pour ce qui est EN COURS (les cartes de reprise), vert pour ce qui est
 * TERMINÉ (la barre pleine des cartes), or pour ce qui est ACQUIS (la carte
 * certificats).
 */
const TON_CHIFFRE = {
  encours: "bg-primary-fixed text-primary",
  termine: "bg-success text-white",
  acquis: "bg-secondary-container text-on-secondary-container",
} as const;

function Chiffre({
  valeur,
  label,
  objectif,
  icon,
  ton,
}: {
  valeur: number;
  label: string;
  objectif?: number;
  icon: IconName;
  ton: keyof typeof TON_CHIFFRE;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.07] px-2 py-3 ring-1 ring-white/10 sm:flex-row sm:gap-3 sm:px-4">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10",
          TON_CHIFFRE[ton],
        )}
      >
        <Icon name={icon} className="text-[20px]" />
      </span>
      <div className="text-center sm:text-left">
        <p
          className={cn(
            "font-headline text-2xl font-bold leading-tight",
            ton === "acquis" && "text-secondary-fixed-dim",
          )}
        >
          {valeur}
          {objectif !== undefined && <span className="text-base text-white/60">/{objectif}</span>}
        </p>
        <p className="text-xs text-white/75">{label}</p>
      </div>
    </div>
  );
}

/** Titre de section précédé de sa tuile d'icône — repère de lecture en défilant. */
function TitreSection({ icon, titre }: { icon: IconName; titre: string }) {
  return (
    <h2 className="flex items-center gap-3 font-headline text-lg font-bold text-primary">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon name={icon} className="text-[18px]" />
      </span>
      {titre}
    </h2>
  );
}

/**
 * Carte de reprise.
 *
 * Porte la COUVERTURE du cours : une vignette générique obligeait à relire le
 * titre pour reconnaître ce qu'on avait commencé, alors que l'image est la
 * chose qu'on retient d'un cours parcouru la veille.
 */
function CarteReprise({ formation }: { formation: ApiFormationSummary }) {
  const { chapitre, restant } = readingPosition(formation);
  const cover = mediaUrl(formation.image);

  return (
    /*
      Fond teinté : une reprise n'est pas une carte de catalogue. Sans cette
      distinction, les cours commencés se confondaient avec la grille neutre
      juste en dessous. `primary-fixed` porte le texte `primary` à 12,8:1 et
      les méta à 7,2:1 — largement au-dessus du minimum.
    */
    <Card className="group overflow-hidden border-0 bg-primary-fixed transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-level-2">
      <ButtonLink
        href={`/espace-jeune/formations/${formation.id}`}
        variant="ghost"
        className="flex w-full items-stretch gap-0 rounded-xl p-0 text-left"
      >
        <span className="relative flex w-28 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-inverse-surface to-primary">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <Icon name="auto_stories" className="text-3xl text-white/80" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors duration-200 group-hover:bg-black/35">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-level-1 transition-transform duration-200 group-hover:scale-110">
              <Icon name="play_arrow" filled className="text-2xl" />
            </span>
          </span>
        </span>

        <span className="min-w-0 flex-1 space-y-1.5 p-4">
          <span className="block truncate font-bold text-primary">{formation.titre}</span>
          <span className="block text-xs text-on-primary-fixed-variant">
            {formation.nombreChapitres > 0
              ? `Chapitre ${chapitre}/${formation.nombreChapitres} · ~${restant} min restantes`
              : `~${restant} min restantes`}
          </span>
          {/* Rail assombri : la piste `surface-variant` par défaut se confondait
              avec le fond teinté de la carte, la barre semblait pleine. */}
          <ProgressBar value={formation.progression} className="h-1.5 bg-primary/15" />
          <span className="flex items-center gap-1 text-xs font-bold text-primary transition-[gap] duration-200 group-hover:gap-2">
            Reprendre <Icon name="arrow_forward" className="text-[14px]" />
          </span>
        </span>
      </ButtonLink>
    </Card>
  );
}
