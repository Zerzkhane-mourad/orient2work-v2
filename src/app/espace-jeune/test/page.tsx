import { ButtonLink, Card, CardBody, Icon, PageHeader } from "@/components/ui";
import { currentJeune, quizQuestions } from "@/lib/mock-data";
import { QUIZ_PASS_SCORE } from "@/lib/constants";

const rules = [
  { icon: "quiz", label: `${quizQuestions.length} questions`, desc: "QCM et vrai/faux" },
  { icon: "timer", label: "20 minutes", desc: "Durée estimée" },
  { icon: "target", label: `${QUIZ_PASS_SCORE}% requis`, desc: "Score minimum" },
  { icon: "replay", label: "Après 48h", desc: "En cas d'échec" },
];

export default function TestPreparationPage() {
  const j = currentJeune;
  const alreadyPassed = typeof j.scoreQuiz === "number" && j.scoreQuiz >= QUIZ_PASS_SCORE;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Mon test de validation"
        subtitle={`Un mini-test lié à votre filière : ${j.filiere}.`}
      />

      {alreadyPassed && (
        <Card className="bg-success-container">
          <CardBody className="flex items-center gap-3 text-success">
            <Icon name="verified" filled />
            <p className="font-semibold">
              Vous avez validé votre test avec {j.scoreQuiz}%. Votre profil est vérifié.
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {rules.map((r) => (
              <div key={r.label} className="flex items-center gap-3 rounded-lg bg-surface-container-low p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                  <Icon name={r.icon} />
                </span>
                <div>
                  <p className="font-bold text-primary">{r.label}</p>
                  <p className="text-xs text-on-surface-variant">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-outline-variant p-4 text-sm text-on-surface-variant">
            <p className="mb-2 font-semibold text-primary">Consignes</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Répondez à chaque question ; vous pouvez revenir en arrière.</li>
              <li>
                Un score ≥ {QUIZ_PASS_SCORE}% valide votre compte et débloque les formations et les
                candidatures.
              </li>
              <li>En cas d&apos;échec, un nouvel essai est possible après 48h.</li>
            </ul>
          </div>

          <ButtonLink href="/espace-jeune/test/en-cours" size="lg" fullWidth>
            {alreadyPassed ? "Repasser le test" : "Commencer le test"}
          </ButtonLink>
        </CardBody>
      </Card>
    </div>
  );
}
