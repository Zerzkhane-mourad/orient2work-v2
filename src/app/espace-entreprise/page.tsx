"use client";

/**
 * Tableau de bord recruteur.
 *
 * ── Ce que l'écran répond, dans l'ordre ─────────────────────────────────────
 *
 * 1. « Où en est mon recrutement ? » — trois compteurs, chacun accompagné du
 *    rapport qui le qualifie. Un total nu (« 12 candidatures ») ne dit pas
 *    s'il faut agir ; « 5 encore à examiner » le dit.
 * 2. « Qu'est-ce qui m'attend ? » — une file d'attente unique, en haut à
 *    droite, qui rassemble les trois seules choses qui demandent une décision.
 * 3. « Et ensuite ? » — mes offres, avec leur échéance, et mes prochains
 *    rendez-vous.
 *
 * ── Les compteurs ne sont plus calculés à la main ───────────────────────────
 *
 * La version précédente téléchargeait CINQUANTE offres et CINQUANTE entretiens
 * pour en compter quelques-uns côté navigateur — et se trompait dès la
 * cinquante-et-unième. Chaque nombre vient désormais d'un `meta.total` ou de
 * `/entretiens/compteurs`, c'est-à-dire d'un décompte serveur portant sur la
 * totalité, pour un coût réseau très inférieur.
 */

import { AreaChart, type AreaDatum } from "@/components/charts";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DatePill,
  EmptyState,
  Icon,
  KpiCard,
  Skeleton,
  StatusBadge,
  type IconName,
} from "@/components/ui";
import Link from "next/link";
import { useMemo } from "react";
import { useEntreprise } from "@/features/entreprise/entreprise-store";
import { ValidationBanner } from "@/features/entreprise/validation-banner";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { echeance } from "@/lib/echeance";
import { compterParJour, semaineCourante } from "@/lib/semaine";

/** Constantes de module : un tableau recréé à chaque rendu boucle la requête. */
const NOUVELLES = ["envoyee"] as const;
const CONFIRMES = ["accepte"] as const;

const APERCU = 4;

/**
 * Plafond de la requête qui alimente la courbe.
 *
 * `/candidatures/recues` ne sait pas filtrer par date ni agréger par jour : la
 * série se reconstitue en comptant les cent candidatures les plus RÉCENTES,
 * puis en ne gardant que celles tombées dans la semaine. Au-delà de cent sur
 * sept jours, la courbe le dit au lieu de sous-compter en silence.
 */
const CANDIDATURES_SERIE_MAX = 100;

/** `YYYY-MM-DD` en heure locale — `toISOString` basculerait en UTC. */
function jourIso(): string {
  const date = new Date();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

export default function EspaceEntrepriseDashboard() {
  const { entreprise, isValidated } = useEntreprise();

  /*
   * Semaine figée au montage : la recalculer à chaque rendu relancerait la
   * requête, et l'écran changerait de fenêtre au passage de minuit.
   */
  const jours = useMemo(() => semaineCourante(), []);
  const candidaturesSemaine = useApi(
    () => api.candidatures.received({ sort: "recent", perPage: CANDIDATURES_SERIE_MAX }),
    [],
  );

  // Une page d'UN élément par question : seul `meta.total` est lu, le serveur
  // fait le compte. Les listes affichées, elles, demandent ce qu'elles montrent.
  const offresTotal = useApi(() => api.offres.mine({ perPage: 1 }), []);
  const offresPubliees = useApi(() => api.offres.mine({ status: "publiee", perPage: APERCU }), []);
  const offresEnAttente = useApi(
    () => api.offres.mine({ status: "attente_validation", perPage: 1 }),
    [],
  );
  const candidaturesTotal = useApi(() => api.candidatures.received({ perPage: 1 }), []);
  const candidaturesNouvelles = useApi(
    () => api.candidatures.received({ status: NOUVELLES, perPage: APERCU }),
    [],
  );
  const compteursEntretiens = useApi(() => api.entretiens.countByStatus(), []);
  const prochainsEntretiens = useApi(
    () =>
      api.entretiens.list({
        status: CONFIRMES,
        from: jourIso(),
        ordre: "asc",
        perPage: APERCU,
      }),
    [],
  );

  const totalOffres = offresTotal.data?.meta.total ?? 0;
  const publiees = offresPubliees.data?.meta.total ?? 0;
  const enAttenteValidation = offresEnAttente.data?.meta.total ?? 0;
  const totalCandidatures = candidaturesTotal.data?.meta.total ?? 0;
  const nouvelles = candidaturesNouvelles.data?.meta.total ?? 0;

  const compteurs = compteursEntretiens.data ?? {};
  const entretiensAConfirmer = compteurs.en_attente ?? 0;
  const entretiensAcceptes = compteurs.accepte ?? 0;
  const entretiensTotal = entretiensAConfirmer + entretiensAcceptes + (compteurs.refuse ?? 0);

  /*
   * Série de la semaine — un point par jour, zéro compris (voir
   * `compterParJour` : sauter les jours vides déformerait la courbe).
   */
  const recues = candidaturesSemaine.data?.items ?? [];
  const parJour = compterParJour(recues, jours, (c) => c.createdAt);
  const serieCandidatures: AreaDatum[] = jours.map((jour) => ({
    label: jour.label,
    value: parJour[jour.iso] ?? 0,
    detail: jour.complet,
    badge: jour.quantieme,
  }));
  const totalSemaine = Object.values(parJour).reduce((somme, n) => somme + n, 0);

  /*
   * Page pleine ET plus ancienne candidature encore dans la semaine : d'autres
   * ont pu tomber hors du lot rapporté. C'est le seul cas où la courbe peut
   * sous-compter, et il est signalé sous le graphique.
   */
  const serieTronquee =
    recues.length === CANDIDATURES_SERIE_MAX &&
    (recues.at(-1)?.createdAt ?? "").slice(0, 10) >= jours[0]!.iso;

  const chargementKpi =
    offresTotal.loading || candidaturesTotal.loading || compteursEntretiens.loading;

  /*
   * Une seule file d'attente pour les trois décisions possibles.
   *
   * Elles vivaient jusqu'ici dans trois écrans différents : rien, sur le
   * tableau de bord, ne disait qu'une candidature dormait depuis six jours.
   * Une ligne à zéro reste affichée — sa pastille neutre dit « rien à faire
   * ici », ce qu'une ligne absente ne dit pas.
   */
  const files: { icone: IconName; libelle: string; count: number; href: string }[] = [
    {
      icone: "inbox",
      libelle: "Candidatures à examiner",
      count: nouvelles,
      href: "/espace-entreprise/candidatures",
    },
    {
      icone: "event",
      libelle: "Entretiens en attente de réponse",
      count: entretiensAConfirmer,
      href: "/espace-entreprise/entretiens",
    },
    {
      icone: "hourglass_top",
      libelle: "Offres en cours de validation",
      count: enAttenteValidation,
      href: "/espace-entreprise/offres",
    },
  ];

  const totalFiles = files.reduce((somme, f) => somme + f.count, 0);

  return (
    <div className="space-y-6">
      {/* En-tête : l'identité de l'entreprise, son état, et l'action première. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={entreprise.logo} alt={entreprise.nom} size={56} />
          <div className="min-w-0">
            <h1 className="truncate font-headline text-headline-lg font-bold text-primary">
              {entreprise.nom}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
              <StatusBadge kind="entreprise" status={entreprise.status} />
              <span>{entreprise.secteur}</span>
              <span aria-hidden>·</span>
              <span>{entreprise.ville}</span>
            </div>
          </div>
        </div>

        {/* Publier n'est possible qu'une fois le compte validé : le bouton
            disparaît plutôt que de mener à un refus du serveur — la bannière
            juste dessous explique déjà pourquoi. */}
        {isValidated && (
          <ButtonLink href="/espace-entreprise/publier" variant="secondary">
            <Icon name="add" className="text-[18px]" /> Publier une offre
          </ButtonLink>
        )}
      </div>

      <ValidationBanner />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chargementKpi ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)
            ) : (
              <>
                <KpiCard
                  rang={0}
                  libelle="Mes offres"
                  valeur={totalOffres}
                  icone="work"
                  part={{ valeur: publiees, total: totalOffres, libelle: "en ligne" }}
                />
                <KpiCard
                  rang={1}
                  libelle="Candidatures reçues"
                  valeur={totalCandidatures}
                  icone="inbox"
                  part={{
                    valeur: totalCandidatures - nouvelles,
                    total: totalCandidatures,
                    libelle: "déjà traitées",
                  }}
                />
                <KpiCard
                  rang={2}
                  libelle="Entretiens"
                  valeur={entretiensTotal}
                  icone="event"
                  part={{
                    valeur: entretiensAcceptes,
                    total: entretiensTotal,
                    libelle: "confirmés",
                  }}
                />
              </>
            )}
          </div>

          {/*
            La seule vue de l'écran dont l'axe soit le TEMPS : le reste compare
            des états, ici on suit un flux. Une semaine calendaire plutôt qu'une
            fenêtre glissante — voir `semaine.ts`.
          */}
          <Card>
            <CardHeader>
              <CardTitle>Candidatures de la semaine</CardTitle>
              <Link
                href="/espace-entreprise/candidatures"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Tout voir
              </Link>
            </CardHeader>
            <CardBody className="space-y-3">
              {candidaturesSemaine.loading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <>
                  <p className="text-sm text-on-surface-variant">
                    <span className="font-headline text-2xl font-bold text-primary">
                      {totalSemaine}
                    </span>{" "}
                    candidature{totalSemaine > 1 ? "s" : ""} reçue{totalSemaine > 1 ? "s" : ""} du
                    lundi au dimanche.
                  </p>
                  <AreaChart data={serieCandidatures} unite="candidatures" />
                  {serieTronquee && (
                    <p className="border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                      Plus de {CANDIDATURES_SERIE_MAX} candidatures sur la période : la courbe
                      n&apos;en montre que les {CANDIDATURES_SERIE_MAX} plus récentes.
                    </p>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mes offres en ligne</CardTitle>
              <Link
                href="/espace-entreprise/offres"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Tout gérer
              </Link>
            </CardHeader>
            <CardBody className="space-y-1 pt-4">
              {offresPubliees.loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              ) : (offresPubliees.data?.items ?? []).length === 0 ? (
                <EmptyState
                  plain
                  icon="work"
                  title="Aucune offre en ligne"
                  description={
                    isValidated
                      ? "Publiez une opportunité pour commencer à recevoir des candidatures."
                      : "La publication s'ouvrira dès que votre compte sera validé par OMB."
                  }
                  action={
                    isValidated ? (
                      <ButtonLink href="/espace-entreprise/publier" variant="secondary" size="sm">
                        <Icon name="add" className="text-[18px]" /> Publier une offre
                      </ButtonLink>
                    ) : undefined
                  }
                />
              ) : (
                (offresPubliees.data?.items ?? []).map((o, rang) => {
                  const fin = echeance(o.dateLimite);
                  return (
                    <Link
                      key={o.id}
                      href={`/espace-entreprise/offres`}
                      className="apparition flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-surface-container-low"
                      style={{ "--rang": rang } as React.CSSProperties}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                        <Icon name="work" className="text-[18px]" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-on-surface">
                          {o.titre}
                        </span>
                        <span className="block truncate text-xs text-on-surface-variant">
                          {o.type} · {o.ville} · {o.mode}
                        </span>
                      </span>

                      {/* L'échéance est CALCULÉE, pas recopiée : « 3 jours
                          restants » se lit sans faire la soustraction, et se
                          teinte dès que la semaine est entamée. */}
                      <Badge tone={fin.ton}>{fin.label}</Badge>

                      {/* Le nombre de candidatures est l'indicateur de santé
                          d'une offre : il reste visible, même à zéro. */}
                      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-primary">
                        <Icon name="person" className="text-[16px]" />
                        {o.candidatures}
                      </span>
                    </Link>
                  );
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dernières candidatures</CardTitle>
              <Link
                href="/espace-entreprise/candidatures"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Tout voir
              </Link>
            </CardHeader>
            <CardBody className="space-y-1 pt-4">
              {candidaturesNouvelles.loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              ) : (candidaturesNouvelles.data?.items ?? []).length === 0 ? (
                <EmptyState
                  plain
                  icon="inbox"
                  title="Aucune candidature à examiner"
                  description="Les nouvelles candidatures apparaîtront ici dès leur réception."
                />
              ) : (
                (candidaturesNouvelles.data?.items ?? []).map((c, rang) => (
                  <Link
                    key={c.id}
                    href="/espace-entreprise/candidatures"
                    className="apparition flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-surface-container-low"
                    style={{ "--rang": rang } as React.CSSProperties}
                  >
                    <Avatar
                      src={c.jeune.photo}
                      alt={`${c.jeune.prenom} ${c.jeune.nom}`}
                      size={36}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-on-surface">
                        {c.jeune.prenom} {c.jeune.nom}
                      </span>
                      <span className="block truncate text-xs text-on-surface-variant">
                        {c.jeune.titre || c.jeune.filiere} · {c.offre.titre}
                      </span>
                    </span>
                    <Icon name="chevron_right" className="shrink-0 text-on-surface-variant" />
                  </Link>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        {/* `self-start` : sans lui, la colonne s'étire sur la hauteur de la
            grille et ses cartes s'espacent d'un vide inexplicable. */}
        <aside className="space-y-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle>À traiter</CardTitle>
              {!chargementKpi && (
                <span className="text-xs font-semibold text-on-surface-variant">
                  {totalFiles === 0 ? "Rien en attente" : `${totalFiles} en attente`}
                </span>
              )}
            </CardHeader>
            <CardBody className="space-y-1 pt-4">
              {files.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-container-low"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                    <Icon name={f.icone} className="text-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-on-surface">
                    {f.libelle}
                  </span>
                  <span
                    className={
                      f.count > 0
                        ? "flex h-6 min-w-6 items-center justify-center rounded-full bg-error px-1.5 text-xs font-bold tabular-nums text-on-error"
                        : "flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-container px-1.5 text-xs font-bold tabular-nums text-on-surface-variant"
                    }
                  >
                    {f.count}
                  </span>
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prochains entretiens</CardTitle>
              <Link
                href="/espace-entreprise/calendrier"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Calendrier
              </Link>
            </CardHeader>
            <CardBody className="space-y-3 pt-4">
              {prochainsEntretiens.loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))
              ) : (prochainsEntretiens.data?.items ?? []).length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Aucun entretien confirmé à venir.
                </p>
              ) : (
                (prochainsEntretiens.data?.items ?? []).map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <DatePill date={e.date} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-snug text-on-surface">
                        {e.jeune.prenom} {e.jeune.nom}
                      </p>
                      <p className="truncate text-xs text-on-surface-variant">
                        {e.heure} · {e.offreTitre}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
