import { Badge, Button, Card, CardBody, Icon, PageHeader } from "@/components/ui";

const documents = [
  { icon: "description", name: "CV — Lucas Dupont.pdf", type: "CV", date: "12 juil. 2026", size: "245 Ko" },
  { icon: "mail", name: "Lettre de motivation.pdf", type: "Lettre", date: "10 juil. 2026", size: "88 Ko" },
  { icon: "workspace_premium", name: "Certificat — CV professionnel.pdf", type: "Certificat", date: "05 juil. 2026", size: "120 Ko" },
];

const certificates = [
  { titre: "Préparer un CV professionnel", date: "05 juil. 2026" },
];

export default function MesDocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes documents"
        subtitle="Gérez votre CV, vos lettres et vos certificats de formation."
        actions={
          <Button variant="secondary">
            <Icon name="upload" className="text-[18px]" /> Téléverser
          </Button>
        }
      />

      {/* Upload zone */}
      <Card>
        <CardBody>
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-outline-variant py-10 text-center">
            <Icon name="cloud_upload" className="text-4xl text-secondary" />
            <p className="font-semibold text-primary">Glissez vos fichiers ici</p>
            <p className="text-sm text-on-surface-variant">PDF, DOCX — 10 Mo maximum</p>
          </div>
        </CardBody>
      </Card>

      {/* Documents list */}
      <Card>
        <CardBody className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.name}
              className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-surface-container-low"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container text-primary">
                <Icon name={doc.icon} />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-on-surface">{doc.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {doc.date} • {doc.size}
                </p>
              </div>
              <Badge tone="neutral">{doc.type}</Badge>
              <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Télécharger">
                <Icon name="download" />
              </button>
            </div>
          ))}
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-4 font-headline text-lg font-bold text-primary">Certificats de formation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {certificates.map((cert) => (
            <Card key={cert.titre} className="bg-primary text-white">
              <CardBody className="flex items-center gap-4">
                <Icon name="workspace_premium" className="text-4xl text-secondary-fixed-dim" />
                <div className="flex-1">
                  <p className="font-bold">{cert.titre}</p>
                  <p className="text-sm text-white/70">Obtenu le {cert.date}</p>
                </div>
                <Button variant="secondary" size="sm">
                  <Icon name="download" className="text-[18px]" />
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
