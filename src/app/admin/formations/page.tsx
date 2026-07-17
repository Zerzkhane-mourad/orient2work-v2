import { Badge, ButtonLink, Card, CardBody, Icon, PageHeader, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { formations } from "@/lib/mock-data";
import { FORMATION_CATEGORIES } from "@/lib/constants";

export default function AdminFormationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des formations"
        subtitle="Ajoutez et organisez le catalogue de formations."
        actions={
          <ButtonLink href="/admin/formations/nouvelle" variant="secondary">
            <Icon name="add" className="text-[18px]" /> Nouvelle formation
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FORMATION_CATEGORIES.map((cat) => (
          <Badge key={cat} tone="neutral">
            {cat}
          </Badge>
        ))}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Titre</TH>
            <TH>Catégorie</TH>
            <TH>Durée</TH>
            <TH>Certifiante</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {formations.map((f) => (
            <TR key={f.id}>
              <TD className="font-semibold text-primary">{f.titre}</TD>
              <TD>
                <Badge tone="gold">{f.categorie}</Badge>
              </TD>
              <TD className="text-on-surface-variant">{f.tempsLectureMin} min</TD>
              <TD>
                {f.certifiante ? (
                  <Icon name="check_circle" filled className="text-success" />
                ) : (
                  <Icon name="remove" className="text-on-surface-variant" />
                )}
              </TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <ButtonLink
                    href={`/admin/formations/${f.id}`}
                    variant="ghost"
                    size="sm"
                    aria-label="Modifier"
                  >
                    <Icon name="edit" className="text-[18px]" />
                  </ButtonLink>
                  <button className="rounded-full p-2 text-error hover:bg-error-container" aria-label="Supprimer">
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Card>
        <CardBody className="flex items-center gap-3 text-sm text-on-surface-variant">
          <Icon name="info" className="text-secondary" />
          Chaque formation peut contenir une vidéo, un document PDF, un quiz de validation et générer
          un certificat nominatif.
        </CardBody>
      </Card>
    </div>
  );
}
