/** Domain models — the shape of the data described in §15 of the cahier de charges. */
import type {
  EntrepriseStatus,
  EntretienStatus,
  Filiere,
  FormationCategory,
  JeuneStatus,
  OffreStatus,
  OpportunityType,
  WorkMode,
} from "./constants";

export interface Experience {
  id: string;
  titre: string;
  structure: string;
  periode: string;
  type: "Stage" | "Emploi" | "Projet académique" | "Projet personnel" | "Associatif" | "Bénévolat" | "Freelance";
  description: string;
  competences: string[];
}

export const LIEN_TYPES = ["LinkedIn", "GitHub", "Portfolio", "Site personnel", "Autre"] as const;
export type LienType = (typeof LIEN_TYPES)[number];

export interface Lien {
  id: string;
  type: LienType;
  url: string;
}

export interface Jeune {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  /** Avatar as a data URL or remote URL. */
  photo?: string;
  /** Cover banner as a data URL or remote URL; falls back to the brand gradient. */
  banniere?: string;
  bio?: string;
  titre: string; // e.g. "Étudiant en Informatique"
  niveauEtudes: string;
  etablissement: string;
  filiere: Filiere;
  specialite?: string;
  anneeEtude?: string;
  diplome?: string;
  experiences: Experience[];
  competences: string[];
  langues: string[];
  liens: Lien[];
  scoreQuiz?: number;
  status: JeuneStatus;
  /** Derived from filled fields — see `computeProfilCompletion`. */
  profilCompletion: number; // %
  formationsCompletees: number;
  candidatures: number;
}

export interface Entreprise {
  id: string;
  nom: string;
  logo?: string;
  secteur: string;
  ville: string;
  siteWeb?: string;
  description: string;
  responsable: string;
  emailResponsable: string;
  telephone: string;
  status: EntrepriseStatus;
  offresPubliees: number;
}

export interface Offre {
  id: string;
  titre: string;
  entreprise: Pick<Entreprise, "id" | "nom" | "logo" | "ville">;
  type: OpportunityType;
  ville: string;
  mode: WorkMode;
  niveauDemande: string;
  filiere: Filiere;
  competences: string[];
  description: string;
  dateLimite: string;
  nombrePostes: number;
  status: OffreStatus;
  candidatures: number;
  publieeLe: string;
}

/** A quiz question attached to a formation — carries the explanation shown after answering. */
export interface FormationQuizQuestion {
  id: string;
  enonce: string;
  type: "qcm" | "vrai_faux";
  options: string[];
  bonneReponse: number;
  /** Shown once the learner has answered, whatever the outcome. */
  explication: string;
  /** Title of the `<h2>` chapter this question comes from — used to point back to the course. */
  chapitre?: string;
}

/** The validation quiz of a formation (§5.4). */
export interface FormationQuiz {
  titre: string;
  description: string;
  /** Minimum percentage required to validate the formation. */
  scoreMinimum: number;
  questions: FormationQuizQuestion[];
}

export interface Formation {
  id: string;
  titre: string;
  /** Short subtitle shown under the title. */
  sousTitre?: string;
  description: string;
  categorie: FormationCategory | "Spécialité";
  filiere?: Filiere;
  image?: string;
  /** Estimated reading time in minutes. */
  tempsLectureMin: number;
  note?: number;
  nombreAvis?: number;
  niveau?: "Débutant" | "Intermédiaire" | "Avancé" | "Tous niveaux";
  instructeur?: string;
  populaire?: boolean;
  /** Reading progress 0–100 (server-side default; the reader tracks it live). */
  progression: number;
  certifiante: boolean;
  objectifs?: string[];
  prerequis?: string[];
  /**
   * The course body as rich HTML, authored in the admin rich-text editor.
   * `<h2>` headings become the reader's chapters / table of contents.
   */
  contenuHtml: string;
  /** Validation quiz unlocked once the course has been read. */
  quiz?: FormationQuiz;
}

export interface Entretien {
  id: string;
  jeune: Pick<Jeune, "id" | "prenom" | "nom" | "photo" | "titre">;
  entreprise: Pick<Entreprise, "id" | "nom" | "logo">;
  offreTitre: string;
  date: string; // ISO
  heure: string;
  status: EntretienStatus;
  lienReunion?: string;
  commentaire?: string;
}

/** A learner review on a formation (§ e-learning). */
export interface Avis {
  id: string;
  formationId: string;
  auteurNom: string;
  auteurPhoto?: string;
  /** 1–5. */
  note: number;
  commentaire: string;
  /** Pre-formatted relative label ("Il y a 2 semaines") — avoids SSR/client time drift. */
  dateLabel: string;
  utile: number;
}

export interface Notification {
  id: string;
  icon: string;
  title: string;
  detail?: string;
  time: string;
  read: boolean;
  href?: string;
  /** Highlight with the gold accent (important events). */
  accent?: boolean;
}

export interface QuizQuestion {
  id: string;
  enonce: string;
  type: "qcm" | "vrai_faux";
  options: string[];
  bonneReponse: number;
}
