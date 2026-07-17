import { Button, Icon, PageHeader, StatusBadge, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { offres } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function AdminOffresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des offres"
        subtitle="Validez les offres avant publication, modifiez ou désactivez-les."
      />

      <Table>
        <THead>
          <TR>
            <TH>Offre</TH>
            <TH>Entreprise</TH>
            <TH>Type</TH>
            <TH>Date limite</TH>
            <TH>Statut</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {offres.map((o) => (
            <TR key={o.id}>
              <TD className="font-semibold text-primary">{o.titre}</TD>
              <TD className="text-on-surface-variant">{o.entreprise.nom}</TD>
              <TD>{o.type}</TD>
              <TD className="text-on-surface-variant">{formatDate(o.dateLimite)}</TD>
              <TD>
                <StatusBadge kind="offre" status={o.status} />
              </TD>
              <TD>
                <div className="flex justify-end gap-1">
                  {o.status === "attente_validation" && (
                    <Button variant="secondary" size="sm">
                      Publier
                    </Button>
                  )}
                  <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Modifier">
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                  <button className="rounded-full p-2 text-error hover:bg-error-container" aria-label="Désactiver">
                    <Icon name="visibility_off" className="text-[18px]" />
                  </button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
