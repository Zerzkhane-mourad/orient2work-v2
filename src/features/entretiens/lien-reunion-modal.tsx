"use client";

/**
 * Saisie du lien de réunion, côté entreprise.
 *
 * Deux moments, un seul formulaire :
 *  • à l'ACCEPTATION d'une candidature spontanée — le candidat a réservé un
 *    créneau, il ne pouvait pas fournir la salle de visio ;
 *  • APRÈS COUP, pour poser ou corriger un lien : les salles expirent, les
 *    outils changent, et un entretien confirmé la veille peut n'avoir reçu son
 *    adresse que le matin même.
 *
 * Le lien reste FACULTATIF : tous les entretiens ne sont pas en visio. Un
 * champ obligatoire pousserait à coller n'importe quelle URL pour passer
 * l'étape, et le candidat cliquerait sur une salle morte.
 */
import { useEffect, useState } from "react";
import { Button, ErrorBanner, Icon, Input, Modal, Textarea } from "@/components/ui";
import type { ApiError } from "@/lib/api/errors";

export interface ReponseEntretien {
  lienReunion?: string;
  commentaire?: string;
}

interface Props {
  open: boolean;
  /** Ce que le bouton principal déclenche — change le vocabulaire de la modale. */
  intention: "accepter" | "lien";
  /** Nom affiché de l'autre partie, pour situer la demande traitée. */
  interlocuteur: string;
  /** Date et heure déjà formatées : on rappelle ce qui est confirmé. */
  quand: string;
  /** Lien déjà en place, quand on vient le corriger. */
  lienActuel?: string;
  pending: boolean;
  error: ApiError | null;
  onClose: () => void;
  onSubmit: (reponse: ReponseEntretien) => void;
}

export function LienReunionModal({
  open,
  intention,
  interlocuteur,
  quand,
  lienActuel,
  pending,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [lien, setLien] = useState("");
  const [message, setMessage] = useState("");

  // Réinitialisé à chaque ouverture : garder la saisie d'un entretien
  // précédent ferait poser son lien sur un autre rendez-vous.
  useEffect(() => {
    if (!open) return;
    setLien(lienActuel ?? "");
    setMessage("");
  }, [open, lienActuel]);

  if (!open) return null;

  const accepter = intention === "accepter";

  const soumettre = () => {
    const propre = lien.trim();
    onSubmit({
      ...(propre ? { lienReunion: propre } : {}),
      ...(message.trim() ? { commentaire: message.trim() } : {}),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={accepter ? "Accepter la demande d'entretien" : "Lien de connexion"}
      description={`${interlocuteur} · ${quand}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="secondary" onClick={soumettre} disabled={pending}>
            {pending
              ? "Enregistrement…"
              : accepter
                ? "Confirmer l'entretien"
                : "Enregistrer le lien"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Lien de la réunion"
          type="url"
          value={lien}
          onChange={(e) => setLien(e.target.value)}
          placeholder="https://meet.google.com/…"
          hint="Facultatif. Laissez vide pour un entretien sur place et précisez l'adresse ci-dessous."
          error={error?.issueFor("lienReunion")}
        />

        {accepter && (
          <Textarea
            label="Message au candidat"
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Adresse du rendez-vous, documents à prévoir, personne à demander à l'accueil…"
            error={error?.issueFor("commentaire")}
          />
        )}

        {/* Le lien n'est visible du candidat qu'une fois l'entretien accepté :
            le dire évite qu'on le renseigne deux fois, croyant l'envoi raté. */}
        <p className="flex items-start gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
          <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
          Le candidat reçoit le lien dès la confirmation, puis de nouveau dans le rappel envoyé une
          heure avant l&apos;entretien.
        </p>

        {error && <ErrorBanner error={error} />}
      </div>
    </Modal>
  );
}
