"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Chip,
  ErrorState,
  Icon,
  LoadingState,
} from "@/components/ui";
import { useEntreprise } from "@/features/entreprise/entreprise-store";
import { ProposeEntretienModal } from "@/features/entretiens/propose-entretien-modal";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

export default function CandidatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isValidated } = useEntreprise();
  const [proposing, setProposing] = useState(false);

  // Vue publique : l'API omet email, téléphone et liens personnels tant que le
  // candidat n'a pas lui-même initié le contact.
  const { data: talent, loading, error, refetch } = useApi(() => api.jeunes.byId(id), [id]);

  if (loading) return <LoadingState label="Chargement du profil…" />;

  if (error || !talent) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

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
          <Avatar src={talent.photo} alt={`${talent.prenom} ${talent.nom}`} size={96} />
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h1 className="font-headline text-2xl font-bold text-primary">
              {talent.prenom} {talent.nom}
            </h1>
            <p className="font-semibold text-on-surface-variant">{talent.titre}</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm text-on-surface-variant sm:justify-start">
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-[16px]" /> {talent.ville}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="school" className="text-[16px]" /> {talent.niveauEtudes} —{" "}
                {talent.filiere}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl bg-secondary-container px-5 py-3 text-center text-on-secondary-container">
              <p className="text-2xl font-bold">{talent.scoreQuiz ?? "—"}%</p>
              <p className="text-xs font-semibold uppercase">Score test</p>
            </div>
            <div className="rounded-xl bg-surface-container px-5 py-2 text-center">
              <p className="text-lg font-bold text-primary">{talent.score}</p>
              <p className="text-[10px] font-semibold uppercase text-on-surface-variant">
                Employabilité
              </p>
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
              {talent.experiences.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Aucune expérience renseignée.</p>
              ) : (
                talent.experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="border-b border-outline-variant pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-primary">{exp.titre}</h4>
                      <Badge tone="neutral">{exp.type}</Badge>
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      {exp.structure} • {exp.periode}
                    </p>
                    <p className="mt-1 text-sm text-on-surface">{exp.description}</p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compétences &amp; langues</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {talent.competences.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {talent.langues.map((l) => (
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
              <Button
                variant="secondary"
                fullWidth
                disabled={!isValidated}
                onClick={() => setProposing(true)}
              >
                <Icon name="event" className="text-[18px]" /> Proposer un entretien
              </Button>
              {/* Le CV n'est accessible que si le candidat l'a joint à une
                  candidature : le backend refuse tout autre accès. */}
              <p className="flex items-start gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
                <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
                Le CV du candidat est consultable depuis sa candidature, s&apos;il en a déposé une
                sur l&apos;une de vos offres.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formations complétées</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Icon name="workspace_premium" className="text-success" />
                {talent.formationsCompletees} formation(s) validée(s).
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <ProposeEntretienModal
        open={proposing}
        onClose={() => setProposing(false)}
        jeuneId={talent.id}
        jeuneNom={`${talent.prenom} ${talent.nom}`}
      />
    </div>
  );
}
