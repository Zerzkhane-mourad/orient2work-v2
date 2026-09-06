"use client";

import { Suspense } from "react";
import Image from "next/image";
import {
  ButtonLink,
  Card,
  CardBody,
  Icon,
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
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-inverse-surface to-primary text-white">
        <CardBody className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-headline text-2xl font-bold">Mes formations</h1>
              <p className="max-w-md text-sm text-white/70">
                Chaque formation validée rapporte {POINTS_FORMATION_VALIDEE} points de score
                d&apos;employabilité, et rend votre profil plus visible auprès des recruteurs.
              </p>
            </div>

            <div className="shrink-0 rounded-xl bg-white/10 p-4 backdrop-blur sm:min-w-56">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-white/80">Score d&apos;employabilité</span>
                <span className="font-bold text-secondary-fixed-dim">{score}/100</span>
              </div>
              <ProgressBar value={score} className="mt-1.5 bg-white/20" />
              {pointsFormations && (
                <p className="mt-2 text-xs text-white/70">
                  Formations : {pointsFormations.points}/{pointsFormations.max} pts
                </p>
              )}
            </div>
          </div>

          {/* Trois chiffres, pas quatre : « suivies » était la somme des deux
              autres et n'apprenait rien de plus. */}
          <div className="grid grid-cols-3 divide-x divide-white/15 rounded-xl bg-white/5">
            <Chiffre valeur={totalEnCours} label="En cours" />
            <Chiffre valeur={lues} label="Terminées" />
            <Chiffre valeur={validees} label="Certificats" objectif={FORMATIONS_OBJECTIF} accent />
          </div>
        </CardBody>
      </Card>

      {/* ── Reprendre ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-headline text-lg font-bold text-primary">
            Continuer l&apos;apprentissage
          </h2>
          {totalEnCours > enCours.length && (
            <span className="text-sm text-on-surface-variant">
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
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
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
            <ButtonLink href="/espace-jeune/documents" variant="outline" size="sm">
              Voir mes certificats
            </ButtonLink>
          </CardBody>
        </Card>
      )}

      {/* ── Catalogue ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-headline text-lg font-bold text-primary">Catalogue de formations</h2>
          <p className="text-sm text-on-surface-variant">
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

function Chiffre({
  valeur,
  label,
  objectif,
  accent,
}: {
  valeur: number;
  label: string;
  objectif?: number;
  /** Or : réservé à ce qui est ACQUIS, cohérent avec la carte certificats. */
  accent?: boolean;
}) {
  return (
    <div className="px-3 py-3 text-center">
      <p
        className={cn(
          "font-headline text-2xl font-bold leading-tight",
          accent && "text-secondary-fixed-dim",
        )}
      >
        {valeur}
        {/* `/60` et non `/50` : à 50 % le rapport tombait à 4,53:1 sur le point
            clair du dégradé, sans marge sous le minimum AA. */}
        {objectif !== undefined && <span className="text-base text-white/60">/{objectif}</span>}
      </p>
      <p className="text-xs text-white/70">{label}</p>
    </div>
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
    <Card className="overflow-hidden border-0 bg-primary-fixed transition-shadow hover:shadow-level-2">
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
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <Icon name="play_arrow" filled className="text-3xl text-white" />
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
          <span className="flex items-center gap-1 text-xs font-semibold text-primary">
            Reprendre <Icon name="arrow_forward" className="text-[14px]" />
          </span>
        </span>
      </ButtonLink>
    </Card>
  );
}
