import { Avatar, Button, Icon, PageHeader, StatusBadge, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { talents } from "@/lib/mock-talents";
import type { JeuneStatus } from "@/lib/constants";

// Extra rows to illustrate the range of account statuses (§7.1).
const rows = [
  { talent: talents[0], status: "valide" as JeuneStatus },
  { talent: talents[1], status: "valide" as JeuneStatus },
  { talent: talents[2], status: "en_attente_test" as JeuneStatus },
  { talent: { ...talents[0], id: "j4", prenom: "Sara", nom: "Idrissi", filiere: "Marketing" }, status: "profil_incomplet" as JeuneStatus },
  { talent: { ...talents[1], id: "j5", prenom: "Omar", nom: "Tazi", filiere: "Finance" }, status: "test_echoue" as JeuneStatus },
];

export default function AdminJeunesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Gestion des jeunes" subtitle={`${rows.length} comptes jeunes inscrits.`} />

      <Table>
        <THead>
          <TR>
            <TH>Nom</TH>
            <TH>Filière</TH>
            <TH>Score test</TH>
            <TH>Statut</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map(({ talent, status }) => (
            <TR key={talent.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <Avatar src={talent.photo} alt={`${talent.prenom} ${talent.nom}`} size={36} />
                  <div>
                    <p className="font-semibold text-primary">
                      {talent.prenom} {talent.nom}
                    </p>
                    <p className="text-xs text-on-surface-variant">{talent.ville}</p>
                  </div>
                </div>
              </TD>
              <TD className="text-on-surface-variant">{talent.filiere}</TD>
              <TD>{status === "valide" ? `${talent.scoreQuiz}%` : "—"}</TD>
              <TD>
                <StatusBadge kind="jeune" status={status} />
              </TD>
              <TD>
                <div className="flex justify-end gap-1">
                  {status !== "valide" && (
                    <Button variant="secondary" size="sm">
                      Valider
                    </Button>
                  )}
                  <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Voir">
                    <Icon name="visibility" className="text-[18px]" />
                  </button>
                  <button className="rounded-full p-2 text-error hover:bg-error-container" aria-label="Bloquer">
                    <Icon name="block" className="text-[18px]" />
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
