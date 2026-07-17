import { Avatar, Button, Icon, PageHeader, StatusBadge, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { entreprises } from "@/lib/mock-data";

export default function AdminEntreprisesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des entreprises"
        subtitle="Validez, refusez ou suspendez les comptes entreprise."
      />

      <Table>
        <THead>
          <TR>
            <TH>Entreprise</TH>
            <TH>Secteur</TH>
            <TH>Responsable</TH>
            <TH>Offres</TH>
            <TH>Statut</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {entreprises.map((e) => (
            <TR key={e.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <Avatar src={e.logo} alt={e.nom} size={36} />
                  <div>
                    <p className="font-semibold text-primary">{e.nom}</p>
                    <p className="text-xs text-on-surface-variant">{e.ville}</p>
                  </div>
                </div>
              </TD>
              <TD className="text-on-surface-variant">{e.secteur}</TD>
              <TD className="text-on-surface-variant">{e.responsable}</TD>
              <TD>{e.offresPubliees}</TD>
              <TD>
                <StatusBadge kind="entreprise" status={e.status} />
              </TD>
              <TD>
                <div className="flex justify-end gap-1">
                  {e.status !== "valide" && (
                    <>
                      <Button variant="secondary" size="sm">
                        Valider
                      </Button>
                      <Button variant="outline" size="sm">
                        Refuser
                      </Button>
                    </>
                  )}
                  <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Voir">
                    <Icon name="visibility" className="text-[18px]" />
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
