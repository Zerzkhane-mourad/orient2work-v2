"use client";

/**
 * Candidature à une offre (§5.8).
 *
 * Le backend impose deux conditions : email confirmé et profil validé par le
 * test. Elles sont vérifiées ici EN AMONT, pour expliquer plutôt que de laisser
 * l'utilisateur découvrir un 403 après avoir rédigé son message.
 *
 * Le CV joint doit appartenir au candidat — l'API le revérifie de toute façon.
 */
import { useState } from "react";
import Link from "next/link";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  ErrorBanner,
  Icon,
  Modal,
  Select,
  SuccessBanner,
  Textarea,
} from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import type { ApiCandidature } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";

interface OffreActionsProps {
  offreId: string;
  /** Candidature déjà déposée sur cette offre, si elle existe. */
  existante: ApiCandidature | null;
  onApplied: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  envoyee: "Candidature envoyée",
  vue: "Vue par l'entreprise",
  preselectionnee: "Présélectionné",
  entretien: "Entretien proposé",
  acceptee: "Candidature acceptée",
  refusee: "Candidature non retenue",
  retiree: "Candidature retirée",
};

export function OffreActions({ offreId, existante, onApplied }: OffreActionsProps) {
  const { jeune } = useProfile();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [cvId, setCvId] = useState("");

  const { data: documents, loading: cvLoading } = useApi(
    () => api.documents.list({ type: "CV" }),
    [],
  );
  const { run, pending, error } = useMutation(api.candidatures.apply);
  const withdraw = useMutation(api.candidatures.withdraw);

  const cvs = documents?.items ?? [];
  const emailOk = user?.emailVerified ?? false;
  const profilOk = jeune.status === "valide";
  /*
   * Troisième condition : le CV doit être DÉJÀ déposé (§5.8). Le serveur la
   * fait respecter ; elle est reprise ici pour l'annoncer avant le clic plutôt
   * que de renvoyer un 403 une fois le message rédigé.
   */
  const cvOk = cvs.length > 0;
  const peutCandidater = emailOk && profilOk && cvOk && !cvLoading;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    // `cvId` omis quand rien n'a été choisi : le serveur joint alors le dernier
    // CV déposé, ce qui garde la candidature à un seul clic.
    const created = await run(offreId, {
      ...(message.trim() ? { message: message.trim() } : {}),
      ...(cvId ? { cvId } : {}),
    });
    if (created) {
      setOpen(false);
      onApplied();
    }
  };

  // Une candidature retirée peut être redéposée : l'API la réactive alors.
  if (existante && existante.status !== "retiree") {
    return (
      <Card>
        <CardBody className="space-y-4">
          <SuccessBanner message={STATUS_LABELS[existante.status] ?? existante.status} />
          {existante.cv && (
            <p className="flex items-center gap-2 text-sm text-on-surface-variant">
              <Icon name="description" className="text-[18px]" /> CV joint : {existante.cv.filename}
            </p>
          )}
          {withdraw.error && <ErrorBanner error={withdraw.error} />}
          <div className="flex flex-col gap-2">
            <ButtonLink href="/espace-jeune/candidatures" variant="outline" fullWidth>
              Suivre mes candidatures
            </ButtonLink>
            <Button
              variant="ghost"
              fullWidth
              disabled={withdraw.pending}
              onClick={() => {
                void withdraw.run(existante.id).then((done) => {
                  if (done) onApplied();
                });
              }}
            >
              {withdraw.pending ? "Retrait…" : "Retirer ma candidature"}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-bold text-primary">Intéressé par cette offre ?</h3>

          {!emailOk && (
            <p className="flex items-start gap-2 rounded-lg bg-secondary-container px-3 py-2 text-xs text-on-secondary-container">
              <Icon name="mail" className="mt-0.5 shrink-0 text-[14px]" />
              <span>
                Confirmez votre adresse email pour pouvoir candidater.{" "}
                <Link href="/verification-email" className="font-semibold underline">
                  Renvoyer le lien
                </Link>
              </span>
            </p>
          )}

          {!profilOk && (
            <p className="flex items-start gap-2 rounded-lg bg-secondary-container px-3 py-2 text-xs text-on-secondary-container">
              <Icon name="fact_check" className="mt-0.5 shrink-0 text-[14px]" />
              <span>
                Votre profil doit être validé par le test.{" "}
                <Link href="/espace-jeune/test" className="font-semibold underline">
                  Passer le test
                </Link>
              </span>
            </p>
          )}

          {/* Sans CV, l'action n'est pas seulement bloquée : elle est remplacée
              par celle qui débloque la situation. Un bouton grisé laisserait le
              candidat chercher où déposer son document. */}
          {!cvOk && !cvLoading ? (
            <>
              <p className="flex items-start gap-2 rounded-lg bg-secondary-container px-3 py-2 text-xs text-on-secondary-container">
                <Icon name="description" className="mt-0.5 shrink-0 text-[14px]" />
                <span>
                  Un CV est nécessaire pour candidater. Déposez-le une fois, il sera joint à
                  toutes vos candidatures.
                </span>
              </p>
              <ButtonLink href="/espace-jeune/documents" variant="secondary" fullWidth>
                <Icon name="cloud_upload" className="text-[18px]" /> Déposer mon CV
              </ButtonLink>
            </>
          ) : (
            <Button
              variant="secondary"
              fullWidth
              disabled={!peutCandidater}
              onClick={() => setOpen(true)}
            >
              <Icon name="send" className="text-[18px]" /> Candidater
            </Button>
          )}

          <p className="text-center text-xs text-on-surface-variant">
            Votre profil complet sera transmis à l&apos;entreprise.
          </p>
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Candidater à cette offre"
        description="Votre CV est joint automatiquement ; ajoutez un message si vous le souhaitez."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="secondary" form="candidature-form" type="submit" disabled={pending}>
              {pending ? "Envoi…" : "Envoyer ma candidature"}
            </Button>
          </>
        }
      >
        <form id="candidature-form" onSubmit={submit} className="space-y-5">
          {error && <ErrorBanner error={error} />}

          {/*
            Un seul CV — le cas courant : rien à choisir, on le rappelle et le
            serveur joint le plus récent. Afficher une liste à une entrée
            demanderait une décision qui n'en est pas une.
          */}
          {cvs.length === 1 ? (
            <p className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2.5 text-sm text-on-surface">
              <Icon name="description" className="shrink-0 text-[18px] text-primary" />
              <span className="min-w-0 flex-1 truncate">
                CV joint : <strong>{cvs[0]!.filename}</strong>
              </span>
              <Link
                href="/espace-jeune/documents"
                className="shrink-0 text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Changer
              </Link>
            </p>
          ) : (
            <Select
              label="CV à joindre"
              required
              value={cvId}
              onChange={setCvId}
              hint="Le plus récent est proposé par défaut."
              options={cvs.map((doc) => ({ value: doc.id, label: doc.filename }))}
            />
          )}

          <Textarea
            label="Message à l'entreprise"
            rows={5}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Pourquoi ce poste vous intéresse, ce que vous pouvez apporter…"
            hint={`${message.length}/2000 caractères`}
          />
        </form>
      </Modal>
    </>
  );
}
