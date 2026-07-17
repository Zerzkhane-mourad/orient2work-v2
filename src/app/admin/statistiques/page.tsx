import { Card, CardBody, CardHeader, CardTitle, Icon, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { adminStats, formations } from "@/lib/mock-data";

const funnel = [
  { label: "Jeunes inscrits", value: adminStats.jeunesInscrits, max: adminStats.jeunesInscrits },
  { label: "Jeunes validés", value: adminStats.jeunesValides, max: adminStats.jeunesInscrits },
  { label: "Candidatures", value: adminStats.candidatures, max: adminStats.jeunesInscrits },
  { label: "Entretiens demandés", value: adminStats.entretiensDemandes, max: adminStats.jeunesInscrits },
  { label: "Entretiens acceptés", value: adminStats.entretiensAcceptes, max: adminStats.jeunesInscrits },
];

// Illustrative "most followed" ranking derived from the catalogue.
const topFormations = formations
  .map((f, i) => ({ titre: f.titre, suivis: 1200 - i * 180 }))
  .slice(0, 5);
const maxSuivis = Math.max(...topFormations.map((f) => f.suivis));

export default function AdminStatistiquesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" subtitle="Indicateurs clés d'activité de la plateforme." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Jeunes inscrits" value={adminStats.jeunesInscrits.toLocaleString("fr-FR")} icon="school" />
        <Stat label="Entreprises validées" value={adminStats.entreprisesValidees} icon="verified" />
        <Stat label="Candidatures" value={adminStats.candidatures.toLocaleString("fr-FR")} icon="send" />
        <Stat label="Taux validation quiz" value={`${adminStats.tauxValidationQuiz}%`} icon="target" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tunnel de conversion</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {funnel.map((step) => (
              <div key={step.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">{step.label}</span>
                  <span className="font-semibold text-primary">
                    {step.value.toLocaleString("fr-FR")}
                  </span>
                </div>
                <ProgressBar value={(step.value / step.max) * 100} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formations les plus suivies</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {topFormations.map((f) => (
              <div key={f.titre} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate text-on-surface-variant">{f.titre}</span>
                  <span className="font-semibold text-primary">{f.suivis}</span>
                </div>
                <ProgressBar value={(f.suivis / maxSuivis) * 100} barClassName="bg-primary" />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="flex items-center gap-3 text-sm text-on-surface-variant">
          <Icon name="download" className="text-secondary" />
          Exportez ces statistiques au format PDF ou CSV pour vos rapports OMB.
        </CardBody>
      </Card>
    </div>
  );
}
