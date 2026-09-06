"use client";

/**
 * Proposition d'entretien à un candidat (§10).
 *
 * Le flux est celui du backend : l'ENTREPRISE propose une date et une heure, le
 * JEUNE accepte ou refuse. Le lien de visio n'est diffusé au candidat qu'une
 * fois l'entretien accepté.
 */
import { useState } from "react";
import { Button, ErrorBanner, Input, Modal, SuccessBanner, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { useMutation } from "@/lib/api/use-api";

interface ProposeEntretienModalProps {
  open: boolean;
  onClose: () => void;
  jeuneId: string;
  jeuneNom: string;
  /** Pré-remplit l'intitulé quand la proposition part d'une candidature. */
  offreTitre?: string;
  offreId?: string;
  candidatureId?: string;
}

/** Demain, au format `YYYY-MM-DD` — l'API refuse une date passée. */
function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0]!;
}

export function ProposeEntretienModal({
  open,
  onClose,
  jeuneId,
  jeuneNom,
  offreTitre = "",
  offreId,
  candidatureId,
}: ProposeEntretienModalProps) {
  const [titre, setTitre] = useState(offreTitre);
  const [date, setDate] = useState(tomorrow());
  const [heure, setHeure] = useState("14:00");
  const [lien, setLien] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [sent, setSent] = useState(false);

  const { run, pending, error, reset } = useMutation(api.entretiens.create);

  const close = () => {
    setSent(false);
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await run({
      jeuneId,
      offreTitre: titre,
      date,
      heure,
      ...(offreId ? { offreId } : {}),
      ...(candidatureId ? { candidatureId } : {}),
      ...(lien.trim() ? { lienReunion: lien.trim() } : {}),
      ...(commentaire.trim() ? { commentaire: commentaire.trim() } : {}),
    });
    if (created) setSent(true);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Proposer un entretien"
      description={`${jeuneNom} recevra une notification et pourra accepter ou refuser.`}
      footer={
        sent ? (
          <Button variant="secondary" onClick={close}>
            Fermer
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              type="submit"
              form="entretien-form"
              disabled={pending || titre.trim().length === 0}
            >
              {pending ? "Envoi…" : "Envoyer la proposition"}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <SuccessBanner message="Proposition envoyée. Vous serez notifié dès que le candidat aura répondu." />
      ) : (
        <form id="entretien-form" onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2">
              <ErrorBanner error={error} />
            </div>
          )}

          <div className="sm:col-span-2">
            <Input
              label="Intitulé du poste"
              placeholder="Développeur Front-end"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              error={error?.issueFor("offreTitre")}
              required
            />
          </div>
          <Input
            label="Date"
            type="date"
            min={tomorrow()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={error?.issueFor("date")}
            required
          />
          <Input
            label="Heure"
            type="time"
            value={heure}
            onChange={(e) => setHeure(e.target.value)}
            error={error?.issueFor("heure")}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Lien de visioconférence"
              type="url"
              placeholder="https://meet.google.com/…"
              value={lien}
              onChange={(e) => setLien(e.target.value)}
              error={error?.issueFor("lienReunion")}
              hint="Transmis au candidat uniquement s'il accepte l'entretien."
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Message"
              rows={3}
              placeholder="Précisions sur le déroulé, les personnes présentes…"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              error={error?.issueFor("commentaire")}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
