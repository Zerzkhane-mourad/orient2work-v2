"use client";

import { use } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, Chip, ErrorState, Icon, LoadingState } from "@/components/ui";
import { OffreActions } from "@/features/offres/offre-actions";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { formatDate } from "@/lib/utils";

export default function OffreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: offre, loading, error, refetch } = useApi(() => api.offres.byId(id), [id]);

  // L'API n'expose pas « ai-je déjà candidaté à cette offre ? » : on interroge
  // mes candidatures SUR CETTE OFFRE. Le filtre est appliqué côté serveur — le
  // déduire d'une liste tronquée à 100 donnerait une réponse fausse au-delà.
  const { data: candidatures, refetch: refetchCandidatures } = useApi(
    () => api.candidatures.mine({ offreId: id, perPage: 1 }),
    [id],
  );

  if (loading) return <LoadingState label="Chargement de l'offre…" />;

  if (error || !offre) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const existante = candidatures?.items[0] ?? null;

  const facts = [
    { icon: "category", label: "Type", value: offre.type },
    { icon: "location_on", label: "Ville", value: offre.ville },
    { icon: "laptop", label: "Mode", value: offre.mode },
    { icon: "school", label: "Niveau", value: offre.niveauDemande },
    { icon: "workspace_premium", label: "Filière", value: offre.filiere },
    { icon: "groups", label: "Postes", value: `${offre.nombrePostes}` },
  ] as const;

  return (
    <div className="space-y-6">
      <Link
        href="/espace-jeune/offres"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
      >
        <Icon name="arrow_back" className="text-[18px]" /> Retour aux offres
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-container-highest text-primary">
                    <Icon name="business" className="text-2xl" />
                  </span>
                  <div>
                    <h1 className="font-headline text-2xl font-bold text-primary">{offre.titre}</h1>
                    <p className="text-on-surface-variant">
                      {offre.entreprise.nom} • {offre.ville}
                    </p>
                  </div>
                </div>
                <Badge tone="gold">{offre.type}</Badge>
              </div>
              <p className="flex items-center gap-1 text-sm text-on-surface-variant">
                <Icon name="schedule" className="text-[16px]" /> Date limite :{" "}
                {formatDate(offre.dateLimite)}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid gap-4 sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-2">
                  <Icon name={f.icon} className="text-on-surface-variant" />
                  <div>
                    <p className="text-xs text-on-surface-variant">{f.label}</p>
                    <p className="text-sm font-semibold text-on-surface">{f.value}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <h2 className="font-headline text-lg font-bold text-primary">Description du poste</h2>
              <p className="whitespace-pre-line text-on-surface">{offre.description}</p>
              {offre.competences.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-primary">Compétences requises</h3>
                  <div className="flex flex-wrap gap-2">
                    {offre.competences.map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <OffreActions offreId={offre.id} existante={existante} onApplied={refetchCandidatures} />
        </div>
      </div>
    </div>
  );
}
