"use client";

/**
 * Rappel de l'état de validation OMB.
 *
 * Le backend refuse la publication d'offres et l'accès aux talents tant que le
 * compte n'est pas validé (§7.2). Mieux vaut l'annoncer en haut de page que de
 * laisser l'utilisateur découvrir un 403 après avoir rempli un formulaire.
 */
import { Icon, type IconName } from "@/components/ui";
import type { EntrepriseStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useEntreprise } from "./entreprise-store";

const MESSAGES: Record<EntrepriseStatus, { icon: IconName; text: string; tone: "info" | "error" }> =
  {
    inscrit: {
      icon: "schedule",
      text: "Votre compte vient d'être créé. L'équipe OMB va prendre contact avec vous.",
      tone: "info",
    },
    attente_contact: {
      icon: "call",
      text: "Un conseiller OMB va vous contacter pour finaliser la validation de votre compte.",
      tone: "info",
    },
    attente_validation: {
      icon: "hourglass_top",
      text: "Votre dossier est en cours de validation. Publication d'offres et accès aux talents seront débloqués ensuite.",
      tone: "info",
    },
    valide: { icon: "verified", text: "", tone: "info" },
    refuse: {
      icon: "block",
      text: "Votre demande d'inscription a été refusée. Contactez l'équipe OMB pour en connaître les motifs.",
      tone: "error",
    },
    suspendu: {
      icon: "block",
      text: "Votre compte est suspendu. Contactez l'équipe OMB.",
      tone: "error",
    },
  };

export function ValidationBanner({ className }: { className?: string }) {
  const { entreprise } = useEntreprise();
  if (entreprise.status === "valide") return null;

  const message = MESSAGES[entreprise.status];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-4 py-3 text-sm",
        message.tone === "error"
          ? "bg-error-container text-on-error-container"
          : "bg-secondary-container text-on-secondary-container",
        className,
      )}
      role="status"
    >
      <Icon name={message.icon} className="mt-0.5 shrink-0 text-[18px]" />
      <span>{message.text}</span>
    </div>
  );
}
