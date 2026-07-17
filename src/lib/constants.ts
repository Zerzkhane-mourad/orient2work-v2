/**
 * Domain constants derived directly from the cahier de charges.
 * Centralised so labels, statuses and options stay consistent across the app.
 */

export const APP_NAME = "Orient2Work";
export const APP_OWNER = "OMB";
export const APP_TAGLINE = "De l'orientation à l'opportunité professionnelle.";
export const QUIZ_PASS_SCORE = 80; // % minimum pour valider le compte jeune

/** Roles — strict separation between jeune, entreprise and admin (§16). */
export type Role = "jeune" | "entreprise" | "admin";

/** Statuts du compte jeune (§7.1). */
export const JEUNE_STATUSES = {
  inscrit: { label: "Inscrit", tone: "neutral" },
  profil_incomplet: { label: "Profil incomplet", tone: "warning" },
  en_attente_test: { label: "En attente de test", tone: "info" },
  test_echoue: { label: "Test échoué", tone: "error" },
  valide: { label: "Validé", tone: "success" },
  suspendu: { label: "Suspendu", tone: "error" },
} as const;
export type JeuneStatus = keyof typeof JEUNE_STATUSES;

/** Statuts du compte entreprise (§7.2). */
export const ENTREPRISE_STATUSES = {
  inscrit: { label: "Inscrit", tone: "neutral" },
  attente_contact: { label: "En attente de contact OMB", tone: "info" },
  attente_validation: { label: "En attente de validation", tone: "warning" },
  valide: { label: "Validé", tone: "success" },
  refuse: { label: "Refusé", tone: "error" },
  suspendu: { label: "Suspendu", tone: "error" },
} as const;
export type EntrepriseStatus = keyof typeof ENTREPRISE_STATUSES;

/** Statuts d'une offre (§7.3). */
export const OFFRE_STATUSES = {
  brouillon: { label: "Brouillon", tone: "neutral" },
  attente_validation: { label: "En attente de validation", tone: "warning" },
  publiee: { label: "Publiée", tone: "success" },
  expiree: { label: "Expirée", tone: "neutral" },
  desactivee: { label: "Désactivée", tone: "error" },
} as const;
export type OffreStatus = keyof typeof OFFRE_STATUSES;

/** Statuts d'un entretien (§10). */
export const ENTRETIEN_STATUSES = {
  en_attente: { label: "En attente", tone: "warning" },
  accepte: { label: "Accepté", tone: "success" },
  refuse: { label: "Refusé", tone: "error" },
  annule: { label: "Annulé", tone: "neutral" },
} as const;
export type EntretienStatus = keyof typeof ENTRETIEN_STATUSES;

/** Types d'opportunité (§5.6). */
export const OPPORTUNITY_TYPES = [
  "Stage",
  "Emploi",
  "PFE",
  "Alternance",
  "Freelance",
  "Projet",
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

/** Mode de travail (§5.6). */
export const WORK_MODES = ["Présentiel", "Hybride", "À distance"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

/** Domaines / filières couverts par les tests et les offres (§5.3). */
export const FILIERES = [
  "Informatique",
  "Réseaux et télécommunications",
  "Développement web",
  "Data",
  "Intelligence artificielle",
  "Commerce",
  "Marketing",
  "Finance",
  "Gestion",
  "Génie industriel",
  "Communication",
] as const;
export type Filiere = (typeof FILIERES)[number];

/** Niveaux d'études. */
export const NIVEAUX_ETUDES = ["Bac", "Bac+2", "Bac+3", "Bac+5", "Doctorat"] as const;

/** Catégories de formations communes (§7.4). */
export const FORMATION_CATEGORIES = [
  "CV",
  "Lettre de motivation",
  "Entretien",
  "LinkedIn",
  "Recherche d'emploi",
  "Soft skills",
  "Préparation forum",
  "Orientation professionnelle",
] as const;
export type FormationCategory = (typeof FORMATION_CATEGORIES)[number];
