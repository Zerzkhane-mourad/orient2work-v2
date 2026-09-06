import type { IconName } from "@/components/ui/icon";
/**
 * Types d'affichage du frontend.
 *
 * Depuis le branchement sur l'API, la plupart des écrans consomment directement
 * les DTO (`src/lib/api/types.ts`), qui sont la copie exacte de ce que le
 * backend sérialise. Ne subsistent ici que les formes réellement partagées par
 * plusieurs composants d'UI, obtenues via `src/lib/api/adapters.ts` :
 *
 *  • `Jeune` (et ses sous-objets) — le profil circule dans une quinzaine de
 *    composants qui typent leurs props avec des unions littérales strictes ;
 *  • `Avis` et `Notification` — portent un libellé de date déjà formaté
 *    (« Il y a 2 heures »), que l'API ne renvoie pas.
 *
 * Les anciens types `Offre`, `Formation`, `Entreprise`, `Entretien` et
 * `QuizQuestion` ont été retirés : les composants correspondants utilisent
 * désormais les DTO de l'API sans conversion.
 */
import type { JeuneStatus } from "./constants";

export interface Experience {
  id: string;
  titre: string;
  structure: string;
  periode: string;
  type:
    | "Stage"
    | "Emploi"
    | "Projet académique"
    | "Projet personnel"
    | "Associatif"
    | "Bénévolat"
    | "Freelance";
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
  /** URL du document protégé ; résolue par `useProtectedImage`. */
  photo?: string;
  banniere?: string;
  bio?: string;
  titre: string; // e.g. "Étudiant en Informatique"
  niveauEtudes: string;
  etablissement: string;
  /** Libellé issu du référentiel des filières (§7.4) — affichage seulement. */
  filiere: string;
  /** Référence stable au référentiel ; `null` si non renseignée. */
  filiereId: string | null;
  specialite?: string;
  anneeEtude?: string;
  diplome?: string;
  experiences: Experience[];
  competences: string[];
  langues: string[];
  liens: Lien[];
  scoreQuiz?: number;
  status: JeuneStatus;
  /** Dérivé par le serveur — jamais recalculé côté client. */
  profilCompletion: number; // %
  /** Ids des formations dont le cours a été lu jusqu'au bout. */
  formationsLues?: string[];
  /** Ids des formations dont le quiz de validation a été réussi. */
  formationsValidees?: string[];
  /** Meilleur score de quiz par formation (%), indexé par id de formation. */
  scoresFormations?: Record<string, number>;
  formationsCompletees: number;
  candidatures: number;
}

/** Avis sur une formation, avec son libellé de date déjà formaté. */
export interface Avis {
  id: string;
  formationId: string;
  /** Prénom + initiale du nom : l'API n'expose jamais l'identité complète. */
  auteurNom: string;
  auteurPhoto?: string;
  /** 1–5. */
  note: number;
  commentaire: string;
  /** Libellé relatif (« Il y a 2 semaines »), calculé depuis `createdAt`. */
  dateLabel: string;
  utile: number;
}

export interface Notification {
  id: string;
  icon: IconName;
  title: string;
  detail?: string;
  /** Libellé relatif calculé depuis `createdAt`. */
  time: string;
  read: boolean;
  href?: string;
  /** Met en avant les événements importants. */
  accent?: boolean;
}
