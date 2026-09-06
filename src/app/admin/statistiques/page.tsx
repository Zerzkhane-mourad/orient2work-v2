"use client";

import { BarChart, GaugeRadial, type BarDatum } from "@/components/charts";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorState,
  Icon,
  KpiCard,
  PageHeader,
  Skeleton,
  Stat,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { JEUNE_STATUSES, type JeuneStatus } from "@/lib/constants";

/** Statuts de compte jeune, dans l'ordre du cycle de vie et non alphabétique. */
const STATUTS_JEUNE = Object.keys(JEUNE_STATUSES) as JeuneStatus[];

export default function AdminStatistiquesPage() {
  const { data: stats, loading, error, refetch } = useApi(() => api.admin.stats(), []);
  // Le classement se fonde sur le nombre d'avis, seule métrique d'engagement
  // exposée par l'API. Un vrai « nombre de suivis » demanderait un agrégat
  // supplémentaire côté backend.
  const formations = useApi(() => api.formations.list({ perPage: 100 }), []);

  /*
   * Répartition des comptes par statut.
   *
   * L'API n'expose aucun agrégat « comptes par statut » : il est reconstitué en
   * demandant UNE page d'UN élément par statut, et en ne lisant que
   * `meta.total`. Six requêtes, mais parallèles — le coût est d'un aller-retour,
   * et chaque nombre est un vrai décompte serveur, pas un échantillon recompté
   * côté client sur la première page reçue.
   *
   * Le jour où l'API exposera l'agrégat, seul ce bloc disparaît.
   */
  const repartitionJeunes = useApi(
    () =>
      Promise.all(
        STATUTS_JEUNE.map((status) =>
          api.admin
            .jeunes({ status, perPage: 1 })
            .then((page) => ({ status, total: page.meta.total })),
        ),
      ),
    [],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  /*
   * Les cinq étapes du parcours, dans l'ordre — d'où la rampe ORDINALE : la
   * couleur s'éclaircit à mesure qu'on avance, et l'ordre se lit avant les
   * libellés.
   *
   * ── Pourquoi des barres et non un entonnoir ─────────────────────────────
   *
   * Recharts sait dessiner un `FunnelChart`, et la tentation est forte. Mais un
   * entonnoir AFFIRME que chaque étape est un sous-ensemble de la précédente,
   * or ce n'est pas le cas ici : « candidatures » et « entretiens » comptent des
   * DÉMARCHES, pas des personnes, et un même jeune validé postule dix fois. Les
   * trapèzes s'inverseraient dès que les candidatures dépassent les profils
   * validés — ce qui est le fonctionnement normal de la plateforme, pas une
   * anomalie. Des barres sur une échelle commune disent ce qui est réellement
   * mesuré, sans rien affirmer de faux sur la géométrie.
   */
  const parcours: BarDatum[] = stats
    ? [
        { label: "Jeunes inscrits", value: stats.jeunesInscrits },
        { label: "Jeunes validés", value: stats.jeunesValides },
        { label: "Candidatures", value: stats.candidatures },
        { label: "Entretiens demandés", value: stats.entretiensDemandes },
        { label: "Entretiens acceptés", value: stats.entretiensAcceptes },
      ]
    : [];

  const topFormations: BarDatum[] = [...(formations.data?.items ?? [])]
    .filter((f) => f.nombreAvis > 0)
    .sort((a, b) => b.nombreAvis - a.nombreAvis)
    .slice(0, 5)
    .map((f) => ({
      key: f.id,
      label: f.titre,
      value: f.nombreAvis,
      // L'infobulle ne redit pas le nombre d'avis, déjà écrit au bout de la
      // barre : elle ajoute la note, qui n'a pas sa place sur une échelle de
      // volume.
      detail: `Note moyenne : ${f.note?.toFixed(1) ?? "—"} / 5`,
    }));

  const parStatut: BarDatum[] = (repartitionJeunes.data ?? []).map(({ status, total }) => ({
    key: status,
    label: JEUNE_STATUSES[status].label,
    value: total,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" subtitle="Indicateurs clés d'activité de la plateforme." />

      {/*
        Quatre volumes, quatre CONVERSIONS.

        Les tuiles précédentes juxtaposaient un total (« 5 042 jeunes »), un
        sous-ensemble (« 312 entreprises validées ») et un pourcentage (« 72 %
        de validation ») : trois natures de nombre alignées comme si elles se
        comparaient. Chaque carte porte maintenant la même chose — un volume et
        la part qui en découle —, ce qui rend la rangée lisible d'une traite et
        raconte l'entonnoir de la plateforme, de l'inscription à l'entretien
        accepté.
      */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)
        ) : (
          <>
            <KpiCard
              rang={0}
              libelle="Jeunes inscrits"
              valeur={stats.jeunesInscrits}
              icone="school"
              part={{
                valeur: stats.jeunesValides,
                total: stats.jeunesInscrits,
                libelle: "profils validés",
              }}
            />
            <KpiCard
              rang={1}
              libelle="Entreprises inscrites"
              valeur={stats.entreprisesInscrites}
              icone="business"
              part={{
                valeur: stats.entreprisesValidees,
                total: stats.entreprisesInscrites,
                libelle: "comptes validés",
              }}
            />
            {/*
              Offres, et non candidatures.

              La carte « candidatures » rapportait les entretiens demandés aux
              candidatures : 20 sur 14, soit 143 % — une jauge pleine et un
              chiffre absurde. Les deux nombres sont exacts, mais les entretiens
              ne sont PAS un sous-ensemble des candidatures : une candidature
              spontanée en produit sans passer par une candidature à une offre.
              Les quatre cartes ne portent donc plus que des inclusions vraies,
              et le volume de candidatures a rejoint la rangée des totaux, en
              bas de page, où il n'affirme plus rien.
            */}
            <KpiCard
              rang={2}
              libelle="Offres soumises"
              valeur={stats.offresPubliees + stats.offresEnAttente}
              icone="work"
              part={{
                valeur: stats.offresPubliees,
                total: stats.offresPubliees + stats.offresEnAttente,
                libelle: "publiées",
              }}
            />
            <KpiCard
              rang={3}
              libelle="Entretiens demandés"
              valeur={stats.entretiensDemandes}
              icone="event"
              part={{
                valeur: stats.entretiensAcceptes,
                total: stats.entretiensDemandes,
                libelle: "acceptés",
              }}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Parcours candidat</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <>
                {/* `max` : la somme des cinq étapes ne veut rien dire, mais le
                    rapport de chacune à la plus large — les inscrits — en a un. */}
                <BarChart data={parcours} echelle="ordinale" part="max" />
                {/* La réserve de lecture accompagne le graphique plutôt que de
                    rester dans un commentaire de code : c'est le lecteur, et non
                    le développeur, qui risque de lire ces barres comme un taux
                    de transformation. */}
                <p className="border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                  Candidatures et entretiens comptent des démarches, pas des personnes : un même
                  profil validé postule plusieurs fois.
                </p>
              </>
            )}
          </CardBody>
        </Card>

        {/*
          Le taux de validation du test quittait la rangée de tuiles : c'est un
          POURCENTAGE, il n'y avait pas de volume à lui associer. Sa place est
          ici, en anneau — la forme juste pour un rapport unique, et celle que
          le tableau de bord lui donne déjà.
        */}
        <Card>
          <CardHeader>
            <CardTitle>Validation du test</CardTitle>
          </CardHeader>
          <CardBody className="flex justify-center">
            {loading || !stats ? (
              <Skeleton className="h-[180px] w-[180px] rounded-full" />
            ) : (
              <GaugeRadial
                value={stats.tauxValidationQuiz}
                legende="des tentatives atteignent le score minimum requis."
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Formations les plus commentées</CardTitle>
          </CardHeader>
          <CardBody>
            {formations.loading ? (
              <Skeleton className="h-56 w-full" />
            ) : topFormations.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Aucun avis déposé pour le moment.</p>
            ) : (
              /*
                Échelle UNIFORME : cinq formations n'ont pas d'ordre naturel, et
                la longueur dit déjà laquelle domine. Les teinter du plus foncé
                au plus clair redirait le classement une seconde fois, en
                couleur.
              */
              <BarChart data={topFormations} echelle="uniforme" />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Répartition des comptes jeunes</CardTitle>
        </CardHeader>
        <CardBody>
          {repartitionJeunes.loading ? (
            <Skeleton className="h-64 w-full" />
          ) : repartitionJeunes.error ? (
            <p className="text-sm text-on-surface-variant">
              Répartition indisponible pour le moment.
            </p>
          ) : (
            /* `total` : les statuts PARTITIONNENT la population — chaque jeune
               en occupe un et un seul. C'est le seul des trois graphiques où
               une part du total a un sens. */
            <BarChart data={parStatut} echelle="uniforme" part="total" />
          )}
        </CardBody>
      </Card>

      {/*
        Volumes SANS rapport : `Stat` et non `KpiCard`, dont la jauge n'aurait
        rien à mesurer. « Entretiens acceptés » a quitté cette rangée — la
        quatrième carte du haut le donne déjà, rapporté aux demandes, ce qui en
        dit strictement plus.
      */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Candidatures"
            value={stats.candidatures.toLocaleString("fr-FR")}
            icon="send"
          />
          <Stat label="Offres en attente" value={stats.offresEnAttente} icon="schedule" />
          <Stat label="Formations publiées" value={stats.formationsPubliees} icon="auto_stories" />
        </div>
      )}

      <Card className="border-dashed">
        <CardBody className="flex items-center gap-3 text-sm text-on-surface-variant">
          <Icon name="info" className="text-secondary" />
          L&apos;export PDF/CSV de ces statistiques n&apos;est pas encore disponible côté API.
        </CardBody>
      </Card>
    </div>
  );
}
