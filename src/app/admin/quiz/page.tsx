import { Badge, Button, Icon, PageHeader, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { FILIERES, QUIZ_PASS_SCORE } from "@/lib/constants";

// One quiz per domain, illustrating the admin quiz catalogue (§7.5).
const quizzes = FILIERES.slice(0, 6).map((filiere, i) => ({
  id: `qz-${i}`,
  titre: `Quiz ${filiere}`,
  filiere,
  niveau: ["Débutant", "Intermédiaire", "Avancé"][i % 3],
  questions: 10 + (i % 3) * 5,
  tentatives: 3,
}));

export default function AdminQuizPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des quiz"
        subtitle={`Créez des quiz par domaine. Score minimum recommandé : ${QUIZ_PASS_SCORE}%.`}
        actions={
          <Button variant="secondary">
            <Icon name="add" className="text-[18px]" /> Nouveau quiz
          </Button>
        }
      />

      <Table>
        <THead>
          <TR>
            <TH>Titre</TH>
            <TH>Domaine</TH>
            <TH>Niveau</TH>
            <TH>Questions</TH>
            <TH>Score min.</TH>
            <TH>Tentatives</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {quizzes.map((q) => (
            <TR key={q.id}>
              <TD className="font-semibold text-primary">{q.titre}</TD>
              <TD className="text-on-surface-variant">{q.filiere}</TD>
              <TD>
                <Badge tone="neutral">{q.niveau}</Badge>
              </TD>
              <TD>{q.questions}</TD>
              <TD>{QUIZ_PASS_SCORE}%</TD>
              <TD>{q.tentatives}</TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container" aria-label="Modifier">
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                  <button className="rounded-full p-2 text-error hover:bg-error-container" aria-label="Supprimer">
                    <Icon name="delete" className="text-[18px]" />
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
