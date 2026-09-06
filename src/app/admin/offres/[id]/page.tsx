"use client";

/**
 * Fiche d'une offre, vue administrateur.
 *
 * La file de modération ne montre que six colonnes ; modérer suppose de lire la
 * description complète, les compétences demandées et l'état du compte de
 * l'entreprise. Tout est ici, avec les mêmes décisions qu'en liste.
 *
 * L'API sert le détail d'une offre NON publiée à l'admin et à l'entreprise
 * propriétaire seulement — un visiteur reçoit un 404, sans confirmer qu'elle
 * existe.
 */
import { use, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Chip,
  ErrorBanner,
  ErrorState,
  Icon,
  LoadingState,
  Modal,
  RetourLien,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { OffreStatus } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { echeance } from "@/lib/echeance";
import { formatDate } from "@/lib/utils";

export default function AdminOffreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [refusing, setRefusing] = useState(false);
  const [motif, setMotif] = useState("");

  const { data: offre, loading, error, refetch, setData } = useApi(() => api.offres.byId(id), [id]);

  const { run: moderate, pending, error: actionError } = useMutation(api.admin.moderateOffre);

  const moderer = async (next: OffreStatus, reason?: string) => {
    const updated = await moderate(id, next, reason);
    // La réponse porte l'offre à jour : pas besoin de recharger la fiche.
    if (updated) {
      setData(updated);
      setRefusing(false);
    }
  };

  if (loading) return <LoadingState label="Chargement de l'offre…" />;

  if (error || !offre) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  /* Même calcul que partout ailleurs — liste de modération, espace entreprise :
     un décompte en jours CALENDAIRES, et non une comparaison d'horodatages qui
     ferait « expirer » à 23h une offre valable jusqu'à demain. */
  const fin = echeance(offre.dateLimite);

  return (
    <div className="space-y-6">
      <RetourLien href="/admin/offres">Retour à la modération</RetourLien>

      {actionError && <ErrorBanner error={actionError} />}

      {/* En-tête : identité de l'offre et décisions de modération */}
      <Card>
        <CardBody className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline text-2xl font-bold text-primary">{offre.titre}</h1>
              <StatusBadge kind="offre" status={offre.status} />
              {/* Signalé même quand le statut ne l'est pas encore : la tâche de
                  maintenance qui bascule en `expiree` peut n'avoir pas tourné. */}
              {fin.jours < 0 && offre.status === "publiee" && (
                <Badge tone="warning" icon="schedule">
                  Date limite dépassée
                </Badge>
              )}
            </div>

            <Link
              href={`/admin/entreprises?q=${encodeURIComponent(offre.entreprise.nom)}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary"
            >
              <Icon name="business" className="text-[18px]" />
              {offre.entreprise.nom} · {offre.entreprise.ville}
            </Link>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Icon name="category" className="text-[16px]" /> {offre.type}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-[16px]" /> {offre.ville}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="laptop" className="text-[16px]" /> {offre.mode}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="school" className="text-[16px]" /> {offre.niveauDemande}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 lg:w-56">
            {offre.status !== "publiee" && (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => void moderer("publiee")}
              >
                <Icon name="check_circle" className="text-[18px]" /> Publier
              </Button>
            )}
            {offre.status !== "desactivee" && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setMotif("");
                  setRefusing(true);
                }}
              >
                <Icon name="block" className="text-[18px]" /> Refuser
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardBody>
              {/* Texte assaini côté serveur avant persistance : aucun HTML ne
                  subsiste, l'affichage brut est donc sans risque. */}
              <p className="whitespace-pre-line text-sm text-on-surface">{offre.description}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compétences demandées</CardTitle>
            </CardHeader>
            <CardBody>
              {offre.competences.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Aucune compétence précisée.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {offre.competences.map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Détails</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3">
                <Champ label="Filière" valeur={offre.filiere} />
                <Champ label="Postes à pourvoir" valeur={String(offre.nombrePostes)} />
                <Champ
                  label="Date limite"
                  valeur={`${formatDate(offre.dateLimite)} — ${fin.label.toLowerCase()}`}
                />
                <Champ
                  label="Publiée le"
                  valeur={offre.publieeLe ? formatDate(offre.publieeLe) : undefined}
                />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                <Icon name="groups" />
              </span>
              <div>
                <p className="font-headline text-2xl font-bold text-primary">
                  {offre.candidatures}
                </p>
                <p className="text-xs text-on-surface-variant">Candidature(s) reçue(s)</p>
              </div>
            </CardBody>
          </Card>

          <Card className="border-dashed">
            <CardBody className="flex items-start gap-3 text-sm text-on-surface-variant">
              <Icon name="info" className="mt-0.5 shrink-0 text-secondary" />
              <p>
                Une offre ayant reçu des candidatures n&apos;est jamais supprimée : elle est
                désactivée, pour préserver l&apos;historique côté candidats.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={refusing}
        onClose={() => setRefusing(false)}
        title={`Refuser « ${offre.titre} » ?`}
        description="L'entreprise reçoit une notification. Un motif l'aide à corriger son annonce."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefusing(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => void moderer("desactivee", motif.trim() || undefined)}
            >
              Refuser l&apos;offre
            </Button>
          </>
        }
      >
        <Textarea
          label="Motif (facultatif)"
          rows={3}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Description trop vague, filière incohérente…"
        />
      </Modal>
    </div>
  );
}

/** Ligne d'une liste de définitions ; « — » quand le champ n'est pas renseigné. */
function Champ({ label, valeur }: { label: string; valeur?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </dt>
      <dd className="text-sm text-on-surface">{valeur || "—"}</dd>
    </div>
  );
}
