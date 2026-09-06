"use client";

/**
 * Tableau de bord administrateur.
 *
 * ── La composition, en trois temps ──────────────────────────────────────────
 *
 * 1. TROIS COMPTEURS en tête — les seuls nombres qu'on vient chercher les yeux
 *    fermés. Chacun porte le rapport qui le qualifie (« combien de ces
 *    inscrits sont validés »), parce qu'un total nu ne dit pas s'il est bon.
 * 2. UN GRAPHIQUE LARGE au centre, le parcours candidat : c'est la seule vue
 *    qui relie les compteurs entre eux, elle occupe donc la pleine largeur.
 * 3. DEUX RAPPORTS en bas — traitement des dossiers et validation du test.
 *
 * La colonne de droite (`dashboard-rail`) porte ce qui appelle une ACTION :
 * identité, files d'attente, échéances. La séparation est le sujet du fichier
 * voisin.
 *
 * ── Ce que le temps permet de tracer, et ce qu'il ne permet pas ─────────────
 *
 * `/admin/statistiques` ne renvoie que des totaux INSTANTANÉS : aucun
 * historique. Un compteur ne peut donc pas porter de « +12 % ce mois » ni de
 * sparkline de tendance — il faudrait les inventer. Chacun montre à la place un
 * rapport RÉEL (validés sur inscrits).
 *
 * Les ENTRETIENS, eux, portent une date : `/entretiens?from&to` donne une vraie
 * série datée, et c'est la seule chose de cet écran qui se trace dans le temps.
 * D'où une courbe pour eux, et des jauges pour tout le reste.
 */

import {
  AreaChart,
  BarChart,
  GaugeRadial,
  LinearMeters,
  type AreaDatum,
  type BarDatum,
  type MeterDatum,
} from "@/components/charts";
import {
  Avatar,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorState,
  Icon,
  KpiCard,
  Skeleton,
  type IconName,
} from "@/components/ui";
import Link from "next/link";
import { useMemo } from "react";
import { CarteATraiter, CarteEntretiens, CarteProfil } from "@/features/admin/dashboard-rail";
import { DashboardSearch } from "@/features/admin/dashboard-search";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { compterParJour, semaineCourante } from "@/lib/semaine";

/** Nombre d'éléments montrés dans les deux listes de modération. */
const APERCU = 3;

/**
 * Plafond de la requête qui alimente la courbe.
 *
 * L'API ne renvoie pas d'agrégat « entretiens par jour » : la série est
 * reconstituée en comptant les lignes d'une page. Cent couvre très largement
 * une semaine ; au-delà, l'écran le dit au lieu de sous-compter en silence.
 */
const ENTRETIENS_SEMAINE_MAX = 100;

/** Ligne des deux listes de modération : image, intitulé, précision. */
function LigneModeration({
  href,
  titre,
  detail,
  photo,
}: {
  href: string;
  titre: string;
  detail: string;
  photo?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-container-low"
    >
      <Avatar src={photo} alt={titre} size={32} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-on-surface">{titre}</span>
        <span className="block truncate text-xs text-on-surface-variant">{detail}</span>
      </span>
      <Icon name="chevron_right" className="shrink-0 text-on-surface-variant" />
    </Link>
  );
}

export default function AdminDashboard() {
  const stats = useApi(() => api.admin.stats(), []);

  /*
   * Bornes figées au montage : identiques en valeur si on les recalculait à
   * chaque rendu, mais les figer met l'écran à l'abri d'un passage de minuit en
   * cours de consultation — et évite de relancer la requête pour rien.
   */
  const jours = useMemo(() => semaineCourante(), []);
  const entretiensSemaine = useApi(
    () =>
      api.entretiens.list({
        from: jours[0]!.iso,
        to: jours[6]!.iso,
        ordre: "asc",
        perPage: ENTRETIENS_SEMAINE_MAX,
      }),
    [jours],
  );
  // Les files d'attente sont dérivées de comptages réels plutôt que codées en dur.
  const jeunesAExaminer = useApi(
    () => api.admin.jeunes({ status: "en_attente_test", perPage: 1 }),
    [],
  );
  const entreprisesEnAttente = useApi(
    () => api.admin.entreprises({ status: "attente_validation", perPage: APERCU }),
    [],
  );
  const offresEnAttente = useApi(
    () => api.admin.offres({ status: "attente_validation", perPage: APERCU }),
    [],
  );

  const s = stats.data;

  // Un jour sans entretien vaut zéro et reste à l'axe : voir `compterParJour`.
  const parJour = compterParJour(entretiensSemaine.data?.items ?? [], jours, (e) => e.date);
  const serieEntretiens: AreaDatum[] = jours.map((jour) => ({
    label: jour.label,
    value: parJour[jour.iso] ?? 0,
    detail: jour.complet,
    badge: jour.quantieme,
  }));
  const totalSemaine = entretiensSemaine.data?.meta.total ?? 0;
  const semaineTronquee = totalSemaine > (entretiensSemaine.data?.items.length ?? 0);

  const files = [
    {
      icone: "business" as IconName,
      libelle: "Entreprises à valider",
      count: entreprisesEnAttente.data?.meta.total ?? 0,
      href: "/admin/entreprises",
    },
    {
      icone: "work" as IconName,
      libelle: "Offres à modérer",
      count: offresEnAttente.data?.meta.total ?? 0,
      href: "/admin/offres",
    },
    {
      icone: "school" as IconName,
      libelle: "Comptes en attente de test",
      count: jeunesAExaminer.data?.meta.total ?? 0,
      href: "/admin/jeunes",
    },
  ];

  /*
   * Les cinq étapes du parcours, dans l'ordre — d'où la rampe ORDINALE : la
   * couleur s'éclaircit à mesure qu'on avance, et l'ordre se lit avant les
   * libellés.
   *
   * Ce n'est PAS un entonnoir : « candidatures » et « entretiens » comptent des
   * démarches, pas des personnes, et un même jeune validé postule dix fois. Des
   * barres sur une échelle commune ne prétendent rien sur la géométrie ; la
   * réserve de lecture est écrite sous le graphique, pour le lecteur.
   */
  const parcours: BarDatum[] = s
    ? [
        { label: "Jeunes inscrits", value: s.jeunesInscrits },
        { label: "Jeunes validés", value: s.jeunesValides },
        { label: "Candidatures", value: s.candidatures },
        { label: "Entretiens demandés", value: s.entretiensDemandes },
        { label: "Entretiens acceptés", value: s.entretiensAcceptes },
      ]
    : [];

  /*
   * Trois rapports de traitement, tous tirés de `stats` — aucune requête
   * supplémentaire. Trois rapports alignés sur une base commune se comparent
   * d'un coup d'œil ; en trois anneaux séparés, il faudrait comparer des angles.
   *
   * Le dénominateur des offres est RECONSTITUÉ : l'API donne les publiées et
   * les en-attente, pas leur somme. Brouillons et offres expirées n'y figurent
   * donc pas — d'où le libellé « soumises », qui dit exactement ce qui est
   * compté plutôt que de laisser croire à un total.
   */
  const traitement: MeterDatum[] = s
    ? [
        {
          label: "Profils jeunes validés",
          value: s.jeunesValides,
          total: s.jeunesInscrits,
          detail: "inscrits",
        },
        {
          label: "Entreprises validées",
          value: s.entreprisesValidees,
          total: s.entreprisesInscrites,
          detail: "inscrites",
        },
        {
          label: "Offres publiées",
          value: s.offresPubliees,
          total: s.offresPubliees + s.offresEnAttente,
          detail: "soumises",
        },
      ]
    : [];

  if (stats.error) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={stats.error} onRetry={stats.refetch} />
      </div>
    );
  }

  return (
    /*
     * Colonne latérale à largeur FIXE, colonne principale élastique : les
     * cartes d'identité, de file d'attente et d'échéance portent du texte
     * court, qu'une colonne large ne remplirait pas — tandis que le graphique
     * gagne à chaque pixel. `minmax(0, 1fr)` est indispensable : sans lui, le
     * conteneur du graphique refuse de descendre sous sa largeur intrinsèque et
     * pousse la grille hors de l'écran.
     */
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-headline text-headline-lg font-bold text-primary">Dashboard</h1>
            <p className="text-sm text-on-surface-variant">
              Vue d&apos;ensemble et supervision de la plateforme Orient2Work.
            </p>
          </div>
          <DashboardSearch />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.loading || !s ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)
          ) : (
            <>
              <KpiCard
                rang={0}
                libelle="Jeunes inscrits"
                valeur={s.jeunesInscrits}
                icone="school"
                part={{ valeur: s.jeunesValides, total: s.jeunesInscrits, libelle: "validés" }}
              />
              <KpiCard
                rang={1}
                libelle="Entreprises"
                valeur={s.entreprisesInscrites}
                icone="business"
                part={{
                  valeur: s.entreprisesValidees,
                  total: s.entreprisesInscrites,
                  libelle: "validées",
                }}
              />
              <KpiCard
                rang={2}
                libelle="Offres publiées"
                valeur={s.offresPubliees}
                icone="work"
                part={{
                  valeur: s.offresPubliees,
                  total: s.offresPubliees + s.offresEnAttente,
                  libelle: "sur les offres soumises",
                }}
              />
            </>
          )}
        </div>

        {/*
          Le seul graphique de l'écran dont l'axe soit le TEMPS.
          `semaine.ts` explique pourquoi la fenêtre est la semaine calendaire et
          non les sept derniers jours.
        */}
        <Card>
          <CardHeader>
            <CardTitle>Entretiens de la semaine</CardTitle>
            <Link
              href="/admin/entretiens"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Tout voir
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {entretiensSemaine.loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <>
                <p className="text-sm text-on-surface-variant">
                  <span className="font-headline text-2xl font-bold text-primary">
                    {totalSemaine}
                  </span>{" "}
                  entretien{totalSemaine > 1 ? "s" : ""} planifié
                  {totalSemaine > 1 ? "s" : ""} du lundi au dimanche.
                </p>
                <AreaChart data={serieEntretiens} unite="entretiens" />
                {/*
                  Réserve de lecture : la liste est bornée à cent lignes, et le
                  serveur ne fournit pas d'agrégat par jour. Passé ce seuil — une
                  semaine exceptionnelle — la courbe sous-compterait sans le
                  dire. Le cas est signalé plutôt que masqué.
                */}
                {semaineTronquee && (
                  <p className="border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                    Plus de {ENTRETIENS_SEMAINE_MAX} entretiens cette semaine : la courbe n&apos;en
                    montre que les {ENTRETIENS_SEMAINE_MAX} premiers.
                  </p>
                )}
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parcours candidat</CardTitle>
            <Link
              href="/admin/statistiques"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Statistiques
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {stats.loading || !s ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <>
                {/* `max` : la somme des cinq étapes ne veut rien dire, mais le
                    rapport de chacune à la plus large — les inscrits — en a un. */}
                <BarChart data={parcours} echelle="ordinale" part="max" />
                <p className="border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                  Candidatures et entretiens comptent des démarches, pas des personnes : un même
                  profil validé postule plusieurs fois.
                </p>
              </>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Traitement des dossiers</CardTitle>
            </CardHeader>
            <CardBody>
              {stats.loading || !s ? (
                <Skeleton className="h-44 w-full" />
              ) : (
                <LinearMeters data={traitement} />
              )}
            </CardBody>
          </Card>

          {/*
            Le nombre nu ne disait pas s'il était haut ou bas. L'anneau lui donne
            son échelle — la piste montre le reste à parcourir — sans rien
            ajouter à lire : le chiffre reste au centre, et c'est lui qu'on lit.
          */}
          <Card>
            <CardHeader>
              <CardTitle>Validation du test</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col items-center gap-5">
              {stats.loading || !s ? (
                <Skeleton className="h-[180px] w-[180px] rounded-full" />
              ) : (
                <GaugeRadial
                  value={s.tauxValidationQuiz}
                  legende="des tentatives atteignent le score minimum requis."
                />
              )}
              <ButtonLink href="/admin/quiz" variant="outline" size="sm" fullWidth>
                Test des comptes
              </ButtonLink>
            </CardBody>
          </Card>
        </div>

      </div>

      {/*
       * Colonne d'ACTION : identité, files d'attente, échéances, puis les deux
       * listes de modération.
       *
       * Ces deux listes vivaient en bas de la colonne principale. Résultat
       * mesuré à l'écran : 1 800 px de contenu à gauche contre 790 px à droite,
       * soit un vide d'un millier de pixels le long du rail — et deux listes
       * « à valider / à modérer » séparées de la file « à traiter » qui les
       * compte, alors qu'elles en sont le détail. Réunies ici, les deux colonnes
       * s'équilibrent et tout ce qui appelle une décision tient au même endroit.
       *
       * `self-start` : sans lui, la colonne s'étire sur la hauteur de la grille
       * et ses cartes se retrouvent espacées d'un vide inexplicable.
       */}
      <aside className="space-y-6 self-start">
        <CarteProfil />
        <CarteATraiter
          files={files}
          loading={
            entreprisesEnAttente.loading || offresEnAttente.loading || jeunesAExaminer.loading
          }
        />
        <CarteEntretiens />

        <Card>
          <CardHeader>
            <CardTitle>Entreprises à valider</CardTitle>
            <Link
              href="/admin/entreprises"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Tout voir
            </Link>
          </CardHeader>
          <CardBody className="space-y-1 pt-4">
            {entreprisesEnAttente.loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : (entreprisesEnAttente.data?.items ?? []).length === 0 ? (
              <p className="py-2 text-sm text-on-surface-variant">
                Aucune entreprise en attente.
              </p>
            ) : (
              (entreprisesEnAttente.data?.items ?? []).map((e) => (
                <LigneModeration
                  key={e.id}
                  href={`/admin/entreprises/${e.id}`}
                  titre={e.nom}
                  detail={[e.secteur, e.ville].filter(Boolean).join(" · ")}
                  photo={e.logo}
                />
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offres à modérer</CardTitle>
            <Link
              href="/admin/offres"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Tout voir
            </Link>
          </CardHeader>
          <CardBody className="space-y-1 pt-4">
            {offresEnAttente.loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : (offresEnAttente.data?.items ?? []).length === 0 ? (
              <p className="py-2 text-sm text-on-surface-variant">Aucune offre en attente.</p>
            ) : (
              (offresEnAttente.data?.items ?? []).map((o) => (
                <LigneModeration
                  key={o.id}
                  href={`/admin/offres/${o.id}`}
                  titre={o.titre}
                  detail={`${o.entreprise.nom} · ${o.ville}`}
                  photo={o.entreprise.logo}
                />
              ))
            )}
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
