"use client";

/**
 * Fiche d'une entreprise, vue administrateur.
 *
 * Complète la liste de `/admin/entreprises`, qui ne montre que l'essentiel :
 * ici on dispose de tout ce sur quoi porte une décision de validation —
 * coordonnées du responsable, description, site, volume d'offres.
 *
 * L'API sert la vue COMPLÈTE à un administrateur (coordonnées incluses), là où
 * un visiteur ne reçoit que la vue publique et ne voit pas du tout une
 * entreprise non validée. Les mêmes décisions qu'en liste sont disponibles
 * ici, pour trancher sans faire l'aller-retour.
 */
import { use, useState } from "react";
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorBanner,
  ErrorState,
  Icon,
  Input,
  LoadingState,
  Modal,
  RetourLien,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { EntrepriseStatus } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";

export default function AdminEntrepriseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const {
    data: entreprise,
    loading,
    error,
    refetch,
    setData,
  } = useApi(() => api.admin.entrepriseById(id), [id]);

  const { run: setStatus, pending, error: actionError } = useMutation(api.admin.setEntrepriseStatus);

  /* Le refus demande un motif : il est transmis à l'entreprise par email. */
  const [refusOuvert, setRefusOuvert] = useState(false);
  const [motif, setMotif] = useState("");

  const changerStatut = async (next: EntrepriseStatus, raison?: string) => {
    const updated = await setStatus(id, next, raison);
    // La réponse porte le profil à jour : inutile de recharger toute la fiche.
    if (updated) setData(updated);
    return Boolean(updated);
  };

  if (loading) return <LoadingState label="Chargement de l'entreprise…" />;

  if (error || !entreprise) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RetourLien href="/admin/entreprises">Retour à la liste</RetourLien>

      {actionError && <ErrorBanner error={actionError} />}

      {/* En-tête : identité, statut et décisions */}
      <Card>
        <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar src={entreprise.logo} alt={entreprise.nom} size={96} className="rounded-xl" />

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline text-2xl font-bold text-primary">{entreprise.nom}</h1>
              <StatusBadge kind="entreprise" status={entreprise.status} />
            </div>
            <p className="font-semibold text-on-surface-variant">
              {entreprise.secteur || "Secteur non renseigné"}
            </p>

            {/* Coordonnées : réservées à l'admin et à l'entreprise elle-même. */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-[16px]" /> {entreprise.ville || "—"}
              </span>
              <a
                href={`mailto:${entreprise.emailResponsable}`}
                className="flex items-center gap-1 hover:text-primary"
              >
                <Icon name="mail" className="text-[16px]" /> {entreprise.emailResponsable}
              </a>
              {entreprise.telephone && (
                <span className="flex items-center gap-1">
                  <Icon name="call" className="text-[16px]" /> {entreprise.telephone}
                </span>
              )}
              {entreprise.siteWeb && (
                <a
                  href={entreprise.siteWeb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Icon name="language" className="text-[16px]" /> {entreprise.siteWeb}
                  <Icon name="open_in_new" className="text-[14px]" />
                </a>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-52">
            {entreprise.status !== "valide" && (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => void changerStatut("valide")}
              >
                <Icon name="check_circle" className="text-[18px]" /> Valider le compte
              </Button>
            )}
            {entreprise.status !== "refuse" && entreprise.status !== "suspendu" && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setMotif("");
                  setRefusOuvert(true);
                }}
              >
                <Icon name="do_not_disturb_on" className="text-[18px]" /> Refuser
              </Button>
            )}
            {entreprise.status === "valide" && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void changerStatut("suspendu")}
              >
                <Icon name="block" className="text-[18px]" /> Suspendre
              </Button>
            )}
            {entreprise.status === "suspendu" && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void changerStatut("valide")}
              >
                <Icon name="undo" className="text-[18px]" /> Réactiver
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Présentation</CardTitle>
            </CardHeader>
            <CardBody>
              {entreprise.description ? (
                <p className="whitespace-pre-line text-sm text-on-surface">
                  {entreprise.description}
                </p>
              ) : (
                <p className="text-sm text-on-surface-variant">Aucune description renseignée.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Champ label="Responsable" valeur={entreprise.responsable} />
                <Champ label="Email du responsable" valeur={entreprise.emailResponsable} />
                <Champ label="Téléphone" valeur={entreprise.telephone} />
                <Champ label="Site web" valeur={entreprise.siteWeb} />
              </dl>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="rounded-lg bg-surface-container-low px-4 py-3">
                <p className="font-headline text-3xl font-bold text-primary">
                  {entreprise.offresPubliees}
                </p>
                <p className="text-xs text-on-surface-variant">Offre(s) publiée(s)</p>
              </div>

              {/*
                Deux corrections dans un seul lien.

                `window.location.assign` RECHARGEAIT l'application entière —
                session, profil, feuilles de style — pour un déplacement
                interne ; c'est le rôle de `next/link`, qui ne recharge rien.

                Et la destination était la modération COMPLÈTE : on quittait la
                fiche d'Atlas pour tomber sur les offres de tout le monde, à
                retrouver à la main. La liste porte désormais ses filtres dans
                l'URL, on l'ouvre donc sur cette entreprise, tous statuts
                confondus — le filtre par défaut « en attente » masquerait les
                offres déjà publiées, précisément celles que ce compteur compte.
              */}
              <ButtonLink
                href={`/admin/offres?q=${encodeURIComponent(entreprise.nom)}&status=`}
                variant="outline"
                fullWidth
              >
                Voir ses offres
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Refus : le motif part à l'entreprise, il ne peut pas être vide. */}
      <Modal
        open={refusOuvert}
        onClose={() => setRefusOuvert(false)}
        title={`Refuser ${entreprise.nom}`}
        description="Le motif est transmis à l'entreprise par email."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefusOuvert(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={pending || motif.trim().length === 0}
              onClick={() => {
                void changerStatut("refuse", motif.trim()).then((ok) => {
                  if (ok) setRefusOuvert(false);
                });
              }}
            >
              {pending ? "Envoi…" : "Confirmer le refus"}
            </Button>
          </>
        }
      >
        <Input
          label="Motif du refus"
          required
          value={motif}
          onChange={(event) => setMotif(event.target.value)}
          placeholder="Dossier incomplet, secteur hors périmètre…"
        />
      </Modal>
    </div>
  );
}

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
