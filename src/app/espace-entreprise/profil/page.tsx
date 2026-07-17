import { Avatar, Button, Card, CardBody, CardHeader, CardTitle, Icon, Input, PageHeader, StatusBadge, Textarea } from "@/components/ui";
import { currentEntreprise } from "@/lib/mock-data";

export default function ProfilEntreprisePage() {
  const c = currentEntreprise;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil entreprise"
        subtitle="Ces informations sont visibles par les jeunes talents."
        actions={<StatusBadge kind="entreprise" status={c.status} />}
      />

      <Card>
        <CardBody className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Avatar src={c.logo} alt={c.nom} size={88} />
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h2 className="font-headline text-2xl font-bold text-primary">{c.nom}</h2>
            <p className="font-semibold text-on-surface-variant">{c.secteur}</p>
            <p className="max-w-2xl text-sm text-on-surface-variant">{c.description}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-1 text-sm text-on-surface-variant sm:justify-start">
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-[16px]" /> {c.ville}
              </span>
              {c.siteWeb && (
                <span className="flex items-center gap-1">
                  <Icon name="language" className="text-[16px]" /> {c.siteWeb}
                </span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifier les informations</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Input label="Nom de l'entreprise" defaultValue={c.nom} />
          <Input label="Secteur d'activité" defaultValue={c.secteur} />
          <Input label="Ville" defaultValue={c.ville} />
          <Input label="Site web" defaultValue={c.siteWeb} />
          <Input label="Responsable" defaultValue={c.responsable} />
          <Input label="Email du responsable" type="email" defaultValue={c.emailResponsable} />
          <div className="sm:col-span-2">
            <Textarea label="Description" rows={4} defaultValue={c.description} />
          </div>
          <div className="sm:col-span-2">
            <Button variant="secondary">Enregistrer les modifications</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
