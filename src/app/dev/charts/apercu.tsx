"use client";

/**
 * Banc d'essai des graphiques — données FICTIVES, écran de conception.
 *
 * ── Pourquoi il existe ──────────────────────────────────────────────────────
 *
 * Les courbes des tableaux de bord sont alimentées par de vraies dates : sur
 * une base de démonstration vide, elles s'affichent à plat, et il devient
 * impossible de juger la forme, les couleurs ou l'infobulle. Ici les séries
 * sont écrites en dur, une fois, pour que la mise au point visuelle n'attende
 * pas qu'un candidat postule.
 *
 * ── Pourquoi ces données ne fuient JAMAIS vers les vrais écrans ─────────────
 *
 * Elles vivent sur une route à part, jamais liée depuis la navigation, et la
 * page qui l'expose répond 404 en production (voir `page.tsx`). Un tableau de
 * bord qui inventerait des chiffres quand l'API n'en donne pas serait bien pire
 * qu'un tableau de bord vide : on prendrait des décisions sur du décor.
 */
import { AreaChart, BarChart, GaugeRadial, LinearMeters } from "@/components/charts";
import { Card, CardBody, CardHeader, CardTitle, KpiCard } from "@/components/ui";
import { semaineCourante } from "@/lib/semaine";

/** Jours réels de la semaine en cours : seules les valeurs sont inventées. */
const JOURS = semaineCourante();

const serie = (valeurs: number[]) =>
  JOURS.map((jour, index) => ({
    label: jour.label,
    value: valeurs[index] ?? 0,
    detail: jour.complet,
    badge: jour.quantieme,
  }));

/* Un creux le week-end et une pointe en milieu de semaine : c'est la forme que
   prend réellement une semaine de recrutement, et celle qu'il faut savoir lire. */
const ENTRETIENS = serie([4, 7, 12, 9, 14, 3, 1]);

/* Deux ordres de grandeur plus haut, pour vérifier les graduations abrégées
   (« 2,4k ») et le fait que la courbe ne dépasse jamais ses points. */
const CANDIDATURES = serie([820, 1450, 2400, 1900, 2650, 640, 310]);

const PARCOURS = [
  { label: "Jeunes inscrits", value: 5042 },
  { label: "Jeunes validés", value: 3128 },
  { label: "Candidatures", value: 8710 },
  { label: "Entretiens demandés", value: 1264 },
  { label: "Entretiens acceptés", value: 742 },
];

const FORMATIONS = [
  { label: "Cybersécurité — les bases", value: 128 },
  { label: "Réseaux et systèmes", value: 96 },
  { label: "Développement web", value: 74 },
  { label: "Comptabilité générale", value: 51 },
  { label: "Anglais professionnel", value: 33 },
];

const TRAITEMENT = [
  { label: "Profils jeunes validés", value: 3128, total: 5042, detail: "inscrits" },
  { label: "Entreprises validées", value: 214, total: 337, detail: "inscrites" },
  { label: "Offres publiées", value: 486, total: 612, detail: "soumises" },
];

/** Les huit jetons de la palette, avec leur contraste mesuré sur carte blanche. */
const JETONS = [
  { nom: "--chart-etape-1", valeur: "#0b1f3a", contraste: "16,52:1" },
  { nom: "--chart-etape-2", valeur: "#1b4781", contraste: "9,27:1" },
  { nom: "--chart-etape-3", valeur: "#3263a6", contraste: "6,05:1" },
  { nom: "--chart-etape-4", valeur: "#5787cb", contraste: "3,66:1" },
  { nom: "--chart-etape-5", valeur: "#7ea7e0", contraste: "2,47:1" },
  { nom: "--chart-barre", valeur: "#3263a6", contraste: "6,05:1" },
  { nom: "--chart-piste", valeur: "#d5e6fe", contraste: "1,27:1" },
  { nom: "--chart-grille", valeur: "#cedef4", contraste: "1,37:1" },
];

export function ApercuGraphiques() {
  return (
    <div className="mx-auto max-w-container-max space-y-6 px-margin-mobile py-8 lg:px-8">
      <header className="space-y-1">
        <h1 className="font-headline text-headline-lg font-bold text-primary">
          Banc d&apos;essai des graphiques
        </h1>
        <p className="text-on-surface-variant">
          Toutes les séries de cette page sont <strong>fictives</strong>. Elles servent à juger la
          forme et les couleurs, jamais à mesurer quoi que ce soit.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          rang={0}
          libelle="Jeunes inscrits"
          valeur={5042}
          icone="school"
          part={{ valeur: 3128, total: 5042, libelle: "profils validés" }}
        />
        <KpiCard
          rang={1}
          libelle="Entreprises"
          valeur={337}
          icone="business"
          part={{ valeur: 214, total: 337, libelle: "comptes validés" }}
        />
        <KpiCard
          rang={2}
          libelle="Candidatures"
          valeur={8710}
          icone="send"
          part={{ valeur: 1264, total: 8710, libelle: "demandes d'entretien" }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Courbe — petits volumes (entretiens)</CardTitle>
        </CardHeader>
        <CardBody>
          <AreaChart data={ENTRETIENS} unite="entretiens" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Courbe — grands volumes (graduations abrégées)</CardTitle>
        </CardHeader>
        <CardBody>
          <AreaChart data={CANDIDATURES} unite="candidatures" />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Barres — échelle ordinale</CardTitle>
          </CardHeader>
          <CardBody>
            <BarChart data={PARCOURS} echelle="ordinale" part="max" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Barres — teinte uniforme</CardTitle>
          </CardHeader>
          <CardBody>
            <BarChart data={FORMATIONS} echelle="uniforme" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jauges linéaires</CardTitle>
          </CardHeader>
          <CardBody>
            <LinearMeters data={TRAITEMENT} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anneau</CardTitle>
          </CardHeader>
          <CardBody className="flex justify-center">
            <GaugeRadial
              value={72}
              legende="des tentatives atteignent le score minimum requis."
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Palette</CardTitle>
        </CardHeader>
        <CardBody>
          {/* Le contraste est écrit à côté de chaque pastille : c'est ce qui
              rend la palette vérifiable d'un coup d'œil plutôt que jolie. */}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {JETONS.map((jeton) => (
              <li key={jeton.nom} className="flex items-center gap-3">
                <span
                  className="h-10 w-10 shrink-0 rounded-lg border border-outline-variant"
                  style={{ backgroundColor: jeton.valeur }}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs text-on-surface">
                    {jeton.nom}
                  </span>
                  <span className="block text-xs text-on-surface-variant">
                    {jeton.valeur} · {jeton.contraste} sur blanc
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
