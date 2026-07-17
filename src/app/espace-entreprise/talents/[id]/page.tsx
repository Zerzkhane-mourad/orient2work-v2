import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, Badge, Button, Card, CardBody, CardHeader, CardTitle, Chip, Icon } from "@/components/ui";
import { talents } from "@/lib/mock-talents";

export default async function CandidatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = talents.find((x) => x.id === id);
  if (!t) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/espace-entreprise/talents"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
      >
        <Icon name="arrow_back" className="text-[18px]" /> Retour aux profils
      </Link>

      <Card>
        <CardBody className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Avatar src={t.photo} alt={`${t.prenom} ${t.nom}`} size={96} />
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h1 className="font-headline text-2xl font-bold text-primary">
              {t.prenom} {t.nom}
            </h1>
            <p className="font-semibold text-on-surface-variant">{t.titre}</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm text-on-surface-variant sm:justify-start">
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-[16px]" /> {t.ville}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="school" className="text-[16px]" /> {t.niveauEtudes} — {t.filiere}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl bg-secondary-container px-5 py-3 text-center text-on-secondary-container">
              <p className="text-2xl font-bold">{t.scoreQuiz}%</p>
              <p className="text-xs font-semibold uppercase">Score test</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Expériences</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {t.experiences.map((exp) => (
                <div key={exp.id} className="border-b border-outline-variant pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-primary">{exp.titre}</h4>
                    <Badge tone="neutral">{exp.type}</Badge>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    {exp.structure} • {exp.periode}
                  </p>
                  <p className="mt-1 text-sm text-on-surface">{exp.description}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compétences &amp; langues</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {t.competences.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {t.langues.map((l) => (
                  <Badge key={l} tone="primary" icon="translate">
                    {l}
                  </Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3">
              <Button variant="secondary" fullWidth>
                <Icon name="download" className="text-[18px]" /> Télécharger le CV
              </Button>
              <Button variant="outline" fullWidth>
                <Icon name="event" className="text-[18px]" /> Proposer un entretien
              </Button>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Formations complétées</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Icon name="workspace_premium" className="text-success" />
                {t.formationsCompletees} formations certifiantes validées.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
