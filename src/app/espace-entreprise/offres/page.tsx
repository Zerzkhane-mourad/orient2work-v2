import { ButtonLink, Icon, PageHeader, StatusBadge, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { offres } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function MesOffresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes offres"
        subtitle="Gérez vos offres publiées, en attente et en brouillon."
        actions={
          <ButtonLink href="/espace-entreprise/publier" variant="secondary">
            <Icon name="add" className="text-[18px]" /> Nouvelle offre
          </ButtonLink>
        }
      />

      <Table>
        <THead>
          <TR>
            <TH>Titre</TH>
            <TH>Type</TH>
            <TH>Candidatures</TH>
            <TH>Date limite</TH>
            <TH>Statut</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {offres.map((o) => (
            <TR key={o.id}>
              <TD className="font-semibold text-primary">{o.titre}</TD>
              <TD>{o.type}</TD>
              <TD>
                <span className="flex items-center gap-1">
                  <Icon name="person" className="text-[16px] text-on-surface-variant" /> {o.candidatures}
                </span>
              </TD>
              <TD className="text-on-surface-variant">{formatDate(o.dateLimite)}</TD>
              <TD>
                <StatusBadge kind="offre" status={o.status} />
              </TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Voir">
                    <Icon name="visibility" className="text-[18px]" />
                  </button>
                  <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Modifier">
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                  <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Désactiver">
                    <Icon name="more_vert" className="text-[18px]" />
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
