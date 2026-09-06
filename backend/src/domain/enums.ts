/**
 * Constantes métier — miroir exact de `src/lib/constants.ts` côté frontend.
 *
 * Ces listes servent de source de vérité aux schémas zod : un mode de travail ou
 * un niveau d'études hors liste est rejeté en 422 avant d'atteindre la base. Elles
 * sont volontairement dupliquées plutôt qu'importées : le backend est déployable
 * seul, et un changement de libellé côté frontend doit être un choix conscient ici
 * aussi.
 *
 * Les listes suffixées `_SEED` font exception : elles ne valident plus rien, elles
 * amorcent un référentiel devenu administrable (§7.4).
 */

export const QUIZ_PASS_SCORE = 80;

/**
 * Filières servant à AMORCER le référentiel (migration et seed).
 *
 * Ce n'est plus la source de vérité : depuis §7.4 la liste vit en base et
 * s'administre depuis le back-office. Ne l'utilisez pas pour valider une entrée —
 * passez par `referentiel.service.resolveFiliereId`.
 */
export const FILIERES_SEED = [
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

export const OPPORTUNITY_TYPES = [
  "Stage",
  "Emploi",
  "PFE",
  "Alternance",
  "Freelance",
  "Projet",
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const WORK_MODES = ["Présentiel", "Hybride", "À distance"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const NIVEAUX_ETUDES = ["Bac", "Bac+2", "Bac+3", "Bac+5", "Doctorat"] as const;

/**
 * Catégories de formation servant à AMORCER le référentiel (migration et seed).
 *
 * Ce n'est plus la source de vérité : depuis §7.4 la liste vit en base et
 * s'administre depuis le back-office. Ne l'utilisez pas pour valider une entrée —
 * passez par `referentiel.service.assertCategorieId` (les formations désignent leur
 * catégorie par identifiant).
 */
export const FORMATION_CATEGORIES_SEED = [
  "CV",
  "Lettre de motivation",
  "Entretien",
  "LinkedIn",
  "Recherche d'emploi",
  "Soft skills",
  "Préparation forum",
  "Orientation professionnelle",
  "Spécialité",
] as const;

export const FORMATION_NIVEAUX = ["Débutant", "Intermédiaire", "Avancé", "Tous niveaux"] as const;

export const EXPERIENCE_TYPES = [
  "Stage",
  "Emploi",
  "Projet académique",
  "Projet personnel",
  "Associatif",
  "Bénévolat",
  "Freelance",
] as const;

export const LIEN_TYPES = ["LinkedIn", "GitHub", "Portfolio", "Site personnel", "Autre"] as const;

/** Poids du score d'employabilité — miroir de `src/lib/score.ts`. */
export const SCORE_WEIGHTS = {
  profil: 30,
  test: 20,
  formations: 40,
  candidatures: 10,
} as const;

export const FORMATIONS_OBJECTIF = 5;
export const CANDIDATURES_OBJECTIF = 5;
