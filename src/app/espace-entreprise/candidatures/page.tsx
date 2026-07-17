import { Avatar, Badge, ButtonLink, Card, CardBody, Chip, Icon, PageHeader } from "@/components/ui";
import { talents } from "@/lib/mock-talents";
import { offres } from "@/lib/mock-data";

// Applications received, joining a talent to the offer they applied for (§6.3).
const candidatures = [
  { talent: talents[0], offre: offres[1], date: "2026-07-08", nouvelle: true },
  { talent: talents[1], offre: offres[1], date: "2026-07-09", nouvelle: true },
  { talent: talents[2], offre: offres[0], date: "2026-07-11", nouvelle: false },
];

export default function CandidaturesRecuesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidatures reçues"
        subtitle="Les jeunes ayant manifesté leur intérêt pour vos offres."
      />

      <div className="space-y-4">
        {candidatures.map(({ talent, offre, date, nouvelle }) => (
          <Card key={`${talent.id}-${offre.id}`}>
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar src={talent.photo} alt={`${talent.prenom} ${talent.nom}`} size={56} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-primary">
                    {talent.prenom} {talent.nom}
                  </h3>
                  {nouvelle && <Badge tone="gold">Nouveau</Badge>}
                  <Badge tone="neutral">{talent.scoreQuiz}% au test</Badge>
                </div>
                <p className="text-sm text-on-surface-variant">
                  A candidaté à <span className="font-semibold">{offre.titre}</span> •{" "}
                  {new Date(date).toLocaleDateString("fr-FR")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {talent.competences.slice(0, 3).map((c) => (
                    <Chip key={c} className="text-xs">
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <ButtonLink href={`/espace-entreprise/talents/${talent.id}`} variant="outline" size="sm">
                  Voir le profil
                </ButtonLink>
                <ButtonLink href="/espace-entreprise/entretiens" variant="secondary" size="sm">
                  <Icon name="event" className="text-[18px]" /> Entretien
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
