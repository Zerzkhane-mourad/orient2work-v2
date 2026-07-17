import { Icon, PageHeader, StatusBadge, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { entretiens } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function AdminEntretiensPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des entretiens"
        subtitle="Supervisez l'ensemble des entretiens de la plateforme."
      />

      <Table>
        <THead>
          <TR>
            <TH>Jeune</TH>
            <TH>Entreprise</TH>
            <TH>Offre</TH>
            <TH>Date</TH>
            <TH>Statut</TH>
            <TH className="text-right">Détail</TH>
          </TR>
        </THead>
        <TBody>
          {entretiens.map((e) => (
            <TR key={e.id}>
              <TD className="font-semibold text-primary">
                {e.jeune.prenom} {e.jeune.nom}
              </TD>
              <TD className="text-on-surface-variant">{e.entreprise.nom}</TD>
              <TD className="text-on-surface-variant">{e.offreTitre}</TD>
              <TD>
                {formatDate(e.date)} • {e.heure}
              </TD>
              <TD>
                <StatusBadge kind="entretien" status={e.status} />
              </TD>
              <TD className="text-right">
                <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Voir">
                  <Icon name="visibility" className="text-[18px]" />
                </button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
