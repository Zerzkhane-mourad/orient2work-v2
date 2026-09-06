/**
 * Ce qu'une candidature appelle de la part du CANDIDAT.
 *
 * La liste disait où en était chaque dossier, jamais quoi en faire. Une
 * candidature passée à « Entretien proposé » y restait affichée comme une
 * nouvelle parmi d'autres, alors qu'une invitation attend une réponse et qu'un
 * créneau non confirmé peut être repris par quelqu'un d'autre — le candidat
 * devait deviner qu'il fallait aller voir un autre écran.
 *
 * Trois questions, une par champ : puis-je agir, dois-je m'inquiéter,
 * puis-je encore me retirer.
 */
import type { IconName } from "@/components/ui/icon";
import type { ApiCandidature, CandidatureStatus } from "@/lib/api/types";

export interface ActionSuivi {
  libelle: string;
  href: string;
  icon: IconName;
  /** Appelle un geste maintenant : le bouton passe en avant. */
  urgent: boolean;
}

export interface SignalSuivi {
  texte: string;
  icon: IconName;
  /** `alerte` pour ce qui compromet la candidature, `attente` pour le reste. */
  ton: "attente" | "alerte";
}

/**
 * Action ouverte au candidat, par statut.
 *
 * Table exhaustive : ajouter un statut à `CandidatureStatus` fait échouer la
 * compilation tant qu'on n'a pas dit ce qu'il permet de faire.
 */
const ACTIONS: Record<CandidatureStatus, ActionSuivi | null> = {
  envoyee: null,
  vue: null,
  preselectionnee: null,
  // L'invitation se traite sur l'écran des entretiens : c'est là que vivent
  // l'acceptation, le refus et le lien de réunion.
  entretien: {
    libelle: "Répondre à l'invitation",
    href: "/espace-jeune/entretiens",
    icon: "event_available",
    urgent: true,
  },
  acceptee: {
    libelle: "Voir mon entretien",
    href: "/espace-jeune/entretiens",
    icon: "event_available",
    urgent: false,
  },
  refusee: null,
  retiree: null,
};

/** Statuts encore ouverts : le dossier vit, il peut donc être retiré. */
const OUVERTS: Record<CandidatureStatus, boolean> = {
  envoyee: true,
  vue: true,
  preselectionnee: true,
  // Un entretien est engagé des deux côtés : se retirer passe par une réponse
  // à l'invitation, pas par un retrait silencieux du dossier.
  entretien: false,
  acceptee: false,
  refusee: false,
  retiree: false,
};

/** Au-delà, l'absence de réponse mérite d'être nommée. */
const SILENCE_JOURS = 21;

const JOUR_MS = 86_400_000;

export interface Suivi {
  action: ActionSuivi | null;
  signal: SignalSuivi | null;
  retirable: boolean;
}

export function suivi(candidature: ApiCandidature, maintenant: Date = new Date()): Suivi {
  return {
    action: ACTIONS[candidature.status],
    signal: signalDe(candidature, maintenant),
    retirable: OUVERTS[candidature.status],
  };
}

/**
 * Le seul signal affiché — le plus déterminant.
 *
 * Empiler « offre clôturée » ET « sans réponse » sur la même ligne dirait deux
 * fois la même mauvaise nouvelle. La clôture prime : elle explique le silence.
 */
function signalDe(candidature: ApiCandidature, maintenant: Date): SignalSuivi | null {
  if (!OUVERTS[candidature.status]) return null;

  /*
   * `dateLimite` est un JOUR (`YYYY-MM-DD`), et ce jour-là l'offre est encore
   * ouverte. On compare donc à sa FIN, en heure locale : `new Date("2026-08-25")`
   * seul vaut minuit UTC, ce qui déclarerait l'offre close dès la veille au soir
   * dans tout fuseau positif.
   */
  const limite = new Date(`${candidature.offre.dateLimite}T23:59:59`);
  if (!Number.isNaN(limite.getTime()) && limite.getTime() < maintenant.getTime()) {
    return {
      texte: "L'offre est clôturée — une réponse reste possible, mais devient peu probable.",
      icon: "block",
      ton: "alerte",
    };
  }

  // Le silence ne se compte QUE tant que personne n'a ouvert le dossier :
  // une candidature lue puis laissée en attente n'est pas restée lettre morte.
  if (candidature.status !== "envoyee") return null;

  const jours = Math.floor(
    (maintenant.getTime() - new Date(candidature.createdAt).getTime()) / JOUR_MS,
  );
  if (jours < SILENCE_JOURS) return null;

  const semaines = Math.floor(jours / 7);
  return {
    texte: `Sans réponse depuis ${semaines} semaines.`,
    icon: "hourglass_top",
    ton: "attente",
  };
}
