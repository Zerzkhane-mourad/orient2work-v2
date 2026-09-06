"use client";

import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  ErrorState,
  Icon,
  type IconName,
  Skeleton,
} from "@/components/ui";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { ScoreGauge } from "@/features/test/score-gauge";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/api/adapters";
import type { ApiTestAttempt } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { QUIZ_PASS_SCORE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Page de préparation au test de validation (§5.3).
 *
 * Elle répond à trois situations distinctes — jamais passé, échoué, réussi — et
 * non à une seule. La version précédente affichait le même bloc de consignes
 * dans tous les cas : un candidat qui venait d'échouer y relisait « Commencer le
 * test » sans savoir ce qui lui avait manqué, ni quoi faire d'ici la prochaine
 * tentative.
 */
export default function TestPreparationPage() {
  const { jeune } = useProfile();

  // L'historique vient du serveur : c'est lui qui garde la trace des tentatives.
  const attempts = useApi(() => api.test.attempts(), []);

  /*
   * Le test est chargé ICI, avant de le commencer.
   *
   * Il ne contient jamais les bonnes réponses — la correction est serveur — mais
   * il porte le nombre réel de questions et la filière servie. Sans lui, la page
   * annonçait « 20 minutes » en dur, et un candidat dont la filière n'a pas de
   * test ne le découvrait qu'après avoir cliqué sur « Commencer ».
   */
  const test = useApi(() => api.test.questions(), []);

  const valide = jeune.status === "valide";
  const echoue = jeune.status === "test_echoue";
  const meilleurScore = jeune.scoreQuiz ?? 0;
  const tentatives = attempts.data ?? [];

  // 404 attendu : la filière n'a pas encore de test et il n'y a pas de test
  // commun. Ce n'est pas une panne, c'est un état à expliquer.
  const testIndisponible = test.error?.isNotFound === true;
  const nombreQuestions = test.data?.questions.length ?? 0;
  const testTitre = test.data?.test.titre;
  const testFiliere = test.data?.test.filiere;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Bandeau d'état ─────────────────────────────────────────────── */}
      <EtatDuTest
        valide={valide}
        echoue={echoue}
        meilleurScore={meilleurScore}
        tentatives={tentatives.length}
        indisponible={testIndisponible}
        chargement={test.loading || attempts.loading}
        prete={nombreQuestions > 0}
      />

      {/* ── Ce que contient le test ────────────────────────────────────── */}
      {!testIndisponible && (
        <Card>
          <CardBody className="space-y-5">
            <div>
              <h2 className="font-headline text-lg font-bold text-primary">
                {testTitre ?? "Votre test de validation"}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {testFiliere
                  ? `Test de la filière ${testFiliere}.`
                  : "Test commun, servi aux filières qui n'ont pas le leur."}
              </p>
            </div>

            {/* Panne autre qu'un 404 : le bouton est inerte, il faut dire
                pourquoi et offrir de réessayer plutôt que laisser un bouton
                grisé sans explication. */}
            {test.error && !testIndisponible && (
              <ErrorState error={test.error} onRetry={test.refetch} />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {test.loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
                ))
              ) : (
                <>
                  {/* Chiffre RÉEL, tiré du test servi — plus de durée inventée. */}
                  <Fait
                    icon="quiz"
                    valeur={`${nombreQuestions} question${nombreQuestions > 1 ? "s" : ""}`}
                    detail="QCM, choix multiples et vrai/faux"
                  />
                  <Fait
                    icon="target"
                    valeur={`${QUIZ_PASS_SCORE}% requis`}
                    detail="Seuil de validation du compte"
                  />
                  <Fait
                    icon="replay"
                    valeur="Repassable"
                    detail="Le meilleur score est conservé"
                  />
                  {/* Aucune limite n'est appliquée, ni côté écran ni côté
                      serveur : l'ancienne mention « 20 minutes » annonçait une
                      contrainte qui n'existait pas. */}
                  <Fait
                    icon="schedule"
                    valeur="Sans limite de temps"
                    detail="Vous pouvez revenir sur vos réponses"
                  />
                </>
              )}
            </div>

            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="flex items-center gap-2 font-semibold text-primary">
                <Icon name="lock" className="text-[18px]" />
                Ce que le test débloque
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Un score d&apos;au moins {QUIZ_PASS_SCORE}% valide votre profil et ouvre l&apos;accès
                aux candidatures. Sans lui, les offres restent consultables mais vous ne pouvez pas
                postuler.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Historique ─────────────────────────────────────────────────── */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-headline text-lg font-bold text-primary">Mes tentatives</h2>
            {tentatives.length > 0 && (
              <span className="text-sm text-on-surface-variant">
                {tentatives.length} tentative{tentatives.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {attempts.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : attempts.error ? (
            <ErrorState error={attempts.error} onRetry={attempts.refetch} />
          ) : tentatives.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Aucune tentative pour l&apos;instant. Votre premier essai apparaîtra ici.
            </p>
          ) : (
            <Historique tentatives={tentatives} meilleurScore={meilleurScore} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ── Bandeau d'état ───────────────────────────────────────────────────── */

interface EtatProps {
  valide: boolean;
  echoue: boolean;
  meilleurScore: number;
  tentatives: number;
  indisponible: boolean;
  chargement: boolean;
  prete: boolean;
}

function EtatDuTest({
  valide,
  echoue,
  meilleurScore,
  tentatives,
  indisponible,
  chargement,
  prete,
}: EtatProps) {
  if (chargement) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (indisponible) {
    return (
      <Card className="border-warning/40 bg-warning-container">
        <CardBody className="flex items-start gap-3">
          <Icon name="hourglass_top" className="mt-0.5 shrink-0 text-warning" />
          <div>
            <h1 className="font-headline text-lg font-bold text-primary">
              Test bientôt disponible
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Aucun test n&apos;est encore publié pour votre filière. L&apos;équipe OMB vous
              préviendra dès qu&apos;il sera prêt — en attendant, les formations font monter votre
              score d&apos;employabilité.
            </p>
            <ButtonLink href="/espace-jeune/formations" variant="secondary" size="sm" className="mt-3">
              Voir les formations
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    );
  }

  /* Réussi — le test n'est plus l'enjeu, candidater l'est. */
  if (valide) {
    return (
      <Card className="overflow-hidden bg-success-container">
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-bold text-success">
              <Icon name="verified" filled className="text-[15px]" /> Profil validé
            </span>
            <h1 className="font-headline text-2xl font-bold text-primary">
              Votre test est réussi
            </h1>
            <p className="max-w-md text-sm text-on-surface-variant">
              Vous pouvez postuler aux offres. Repasser le test reste possible : seul le meilleur
              score est conservé, vous ne risquez donc rien.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <ButtonLink href="/espace-jeune/offres">
                <Icon name="send" className="text-[18px]" /> Découvrir les offres
              </ButtonLink>
              <ButtonLink href="/espace-jeune/test/en-cours" variant="outline">
                Repasser le test
              </ButtonLink>
            </div>
          </div>
          <ScoreGauge score={meilleurScore} seuil={QUIZ_PASS_SCORE} caption="Votre meilleur score" />
        </CardBody>
      </Card>
    );
  }

  /* Échoué — dire ce qui manque, et par où passer pour le combler. */
  if (echoue) {
    const manque = Math.max(0, QUIZ_PASS_SCORE - meilleurScore);
    return (
      <Card className="overflow-hidden">
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-error-container px-2.5 py-1 text-xs font-bold text-error">
              <Icon name="priority_high" className="text-[15px]" /> Pas encore validé
            </span>
            <h1 className="font-headline text-2xl font-bold text-primary">
              Il vous manque {manque} point{manque > 1 ? "s" : ""}
            </h1>
            <p className="max-w-md text-sm text-on-surface-variant">
              {tentatives > 1
                ? `Après ${tentatives} tentatives, votre meilleur score est de ${meilleurScore}%.`
                : `Votre meilleur score est de ${meilleurScore}%.`}{" "}
              Les formations couvrent les notions du test — c&apos;est le chemin le plus court vers
              le seuil.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <CtaTest prete={prete}>
                <Icon name="replay" className="text-[18px]" /> Repasser le test
              </CtaTest>
              <ButtonLink href="/espace-jeune/formations" variant="outline">
                Me préparer avec une formation
              </ButtonLink>
            </div>
          </div>
          <ScoreGauge score={meilleurScore} seuil={QUIZ_PASS_SCORE} caption="Votre meilleur score" />
        </CardBody>
      </Card>
    );
  }

  /* Jamais passé — une seule action, mise en avant. */
  return (
    <Card className="overflow-hidden bg-primary text-white">
      <CardBody className="relative space-y-3">
        <div className="relative z-10 max-w-lg space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
            <Icon name="fact_check" className="text-[15px]" /> Étape de validation
          </span>
          <h1 className="font-headline text-2xl font-bold">Validez votre profil</h1>
          <p className="text-sm text-white/75">
            Un test court, lié à votre filière. Au-delà de {QUIZ_PASS_SCORE}%, votre compte est
            validé et vous pouvez postuler aux offres.
          </p>
          <CtaTest prete={prete} variant="secondary" size="lg" className="mt-1">
            Commencer le test <Icon name="arrow_forward" className="text-[18px]" />
          </CtaTest>
        </div>
        <Icon
          name="fact_check"
          className="pointer-events-none absolute -bottom-8 -right-4 text-[150px] text-white/10"
        />
      </CardBody>
    </Card>
  );
}

/* ── Blocs secondaires ────────────────────────────────────────────────── */

/**
 * Accès au test.
 *
 * Un lien ne se désactive pas — d'où le repli sur un vrai bouton inerte quand
 * le test n'a pas pu être chargé. Rendre un `<a>` grisé mais toujours cliquable
 * enverrait le candidat sur un écran vide.
 */
function CtaTest({
  prete,
  variant,
  size,
  className,
  children,
}: {
  prete: boolean;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}) {
  if (!prete) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        {children}
      </Button>
    );
  }

  return (
    <ButtonLink href="/espace-jeune/test/en-cours" variant={variant} size={size} className={className}>
      {children}
    </ButtonLink>
  );
}

function Fait({ icon, valeur, detail }: { icon: IconName; valeur: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="font-bold text-primary">{valeur}</p>
        <p className="text-xs text-on-surface-variant">{detail}</p>
      </div>
    </div>
  );
}

/**
 * Historique des tentatives.
 *
 * Chaque ligne porte sa barre : une progression — ou une stagnation — se lit
 * alors sans comparer des nombres de tête. La meilleure est signalée, puisque
 * c'est la seule qui compte pour la validation du compte.
 */
function Historique({
  tentatives,
  meilleurScore,
}: {
  tentatives: ApiTestAttempt[];
  meilleurScore: number;
}) {
  // La meilleure tentative est repérée par son IDENTIFIANT : à score égal, deux
  // lignes seraient autrement décorées comme « meilleure ».
  const meilleure = tentatives.reduce<ApiTestAttempt | null>(
    (best, essai) => (best === null || essai.score > best.score ? essai : best),
    null,
  );

  return (
    <ol className="space-y-2">
      {tentatives.map((essai) => {
        const best = essai.id === meilleure?.id && essai.score === meilleurScore;
        return (
          <li
            key={essai.id}
            className={cn(
              "rounded-lg border p-3",
              best ? "border-secondary bg-secondary-container/20" : "border-outline-variant",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Icon
                  name={essai.reussi ? "check_circle" : "do_not_disturb_on"}
                  filled={essai.reussi}
                  className={cn("text-[18px]", essai.reussi ? "text-success" : "text-error")}
                />
                <span className="font-bold text-primary">{essai.score}%</span>
                <span className="text-sm text-on-surface-variant">
                  {essai.reussi ? "Réussi" : "Non validé"}
                </span>
                {best && (
                  <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-on-secondary-container">
                    Meilleur
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs text-on-surface-variant">
                {formatRelative(essai.createdAt)}
              </span>
            </div>

            <div className="relative mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-variant">
              <div
                className={cn("h-full rounded-full", essai.reussi ? "bg-success" : "bg-error")}
                style={{ width: `${Math.min(100, Math.max(0, essai.score))}%` }}
              />
              <span
                aria-hidden
                className="absolute top-0 h-full w-0.5 bg-on-surface-variant"
                style={{ left: `${QUIZ_PASS_SCORE}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
