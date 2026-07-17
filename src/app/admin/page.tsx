import { ButtonLink, Card, CardBody, CardHeader, CardTitle, Icon, PageHeader, Stat } from "@/components/ui";
import { adminStats, entreprises, offres } from "@/lib/mock-data";

const pendingActions = [
  { icon: "business", label: "Entreprises en attente de validation", count: 1, href: "/admin/entreprises" },
  { icon: "work", label: "Offres en attente de validation", count: 1, href: "/admin/offres" },
  { icon: "school", label: "Comptes jeunes à examiner", count: 3, href: "/admin/jeunes" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard administrateur"
        subtitle="Vue d'ensemble et supervision de la plateforme Orient2Work."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Jeunes inscrits" value={adminStats.jeunesInscrits.toLocaleString("fr-FR")} icon="school" />
        <Stat label="Jeunes validés" value={adminStats.jeunesValides.toLocaleString("fr-FR")} icon="verified" />
        <Stat label="Entreprises" value={adminStats.entreprisesInscrites} icon="business" />
        <Stat label="Offres publiées" value={adminStats.offresPubliees} icon="work" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actions requises</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {pendingActions.map((a) => (
              <ButtonLink
                key={a.label}
                href={a.href}
                variant="ghost"
                className="flex w-full items-center justify-between rounded-lg px-3 py-3 hover:bg-surface-container-low"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-primary">
                    <Icon name={a.icon} />
                  </span>
                  <span className="text-sm font-semibold text-on-surface">{a.label}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-error px-1.5 text-xs font-bold text-on-error">
                    {a.count}
                  </span>
                  <Icon name="chevron_right" className="text-on-surface-variant" />
                </span>
              </ButtonLink>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taux de validation quiz</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-3 text-center">
            <p className="font-headline text-5xl font-bold text-primary">
              {adminStats.tauxValidationQuiz}%
            </p>
            <p className="text-sm text-on-surface-variant">
              des jeunes atteignent le score minimum requis.
            </p>
            <ButtonLink href="/admin/statistiques" variant="outline" size="sm" fullWidth>
              Voir les statistiques
            </ButtonLink>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dernières entreprises</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {entreprises.slice(0, 3).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-surface-container-low">
                <span className="text-sm font-semibold text-on-surface">{e.nom}</span>
                <span className="text-xs text-on-surface-variant">{e.ville}</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dernières offres</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {offres.slice(0, 3).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-surface-container-low">
                <span className="text-sm font-semibold text-on-surface">{o.titre}</span>
                <span className="text-xs text-on-surface-variant">{o.entreprise.nom}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
