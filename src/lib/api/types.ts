/**
 * Types de l'API.
 *
 * Recopiés à l'identique des mappers du backend (`backend/src/mappers/*.ts`) :
 * ce sont les formes RÉELLEMENT sérialisées, pas une approximation. Quand un
 * champ est optionnel ici, c'est que le mapper l'omet conditionnellement.
 */

// ── Enveloppe ────────────────────────────────────────────────────────────────

/**
 * Plafond de `perPage` accepté par l'API (miroir de `MAX_PER_PAGE` côté backend).
 *
 * Réservé aux vues qui ne PEUVENT pas être paginées — la grille mensuelle du
 * calendrier, par exemple, est bornée par une plage de dates et non par une
 * page. Toute liste ordinaire doit passer par `usePagination`.
 */
export const API_MAX_PER_PAGE = 100;

export interface ApiMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** Liste paginée, telle que la retourne le client API. */
export interface Paginated<T> {
  items: T[];
  meta: ApiMeta;
}

// ── Identité ─────────────────────────────────────────────────────────────────

export type Role = "JEUNE" | "ENTREPRISE" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  /** Id du profil Jeune / Entreprise ; `null` pour un admin. */
  profileId: string | null;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  /** Durée de vie de l'access token, en secondes. */
  expiresIn: number;
  csrfToken: string;
}

export interface MessageResponse {
  message: string;
}

// ── Statuts (identiques aux littéraux du frontend historique) ────────────────

export type JeuneStatus =
  "inscrit" | "profil_incomplet" | "en_attente_test" | "test_echoue" | "valide" | "suspendu";

export type EntrepriseStatus =
  "inscrit" | "attente_contact" | "attente_validation" | "valide" | "refuse" | "suspendu";

export type OffreStatus = "brouillon" | "attente_validation" | "publiee" | "expiree" | "desactivee";

export type CandidatureStatus =
  "envoyee" | "vue" | "preselectionnee" | "entretien" | "acceptee" | "refusee" | "retiree";

export type EntretienStatus = "en_attente" | "accepte" | "refuse" | "annule";

/**
 * Types de questions, calqués sur ceux d'Udemy.
 *
 * `vrai_faux` est un `qcm` à deux options ; `choix_multiples` attend plusieurs
 * bonnes réponses et n'est acquis que si la sélection est exactement la bonne.
 */
export type QuestionType = "qcm" | "choix_multiples" | "vrai_faux";

export type DocumentType = "CV" | "PHOTO" | "BANNIERE" | "LOGO" | "AUTRE";

// ── Jeune ────────────────────────────────────────────────────────────────────

export interface ApiExperience {
  id: string;
  titre: string;
  structure: string;
  periode: string;
  type: string;
  description: string;
  competences: string[];
}

export interface ApiLien {
  id: string;
  type: string;
  url: string;
}

export interface ApiJeune {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  photo?: string;
  banniere?: string;
  bio?: string;
  titre: string;
  niveauEtudes: string;
  etablissement: string;
  /** Libellé de la filière, pour l'AFFICHAGE seulement. */
  filiere: string;
  /** Référence stable au référentiel ; `null` si non renseignée. */
  filiereId: string | null;
  specialite?: string;
  anneeEtude?: string;
  diplome?: string;
  experiences: ApiExperience[];
  competences: string[];
  langues: string[];
  liens: ApiLien[];
  scoreQuiz?: number;
  status: JeuneStatus;
  /** Dérivé côté serveur, jamais stocké. */
  profilCompletion: number;
  formationsLues: string[];
  formationsValidees: string[];
  scoresFormations: Record<string, number>;
  formationsCompletees: number;
  candidatures: number;
  /** Score d'employabilité dérivé (0–100). */
  score: number;
}

/** Vue exposée aux recruteurs : sans coordonnées ni liens personnels. */
export type ApiJeunePublic = Omit<ApiJeune, "email" | "telephone" | "liens">;

// ── Entreprise ───────────────────────────────────────────────────────────────

export interface ApiEntreprise {
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

export type ApiEntreprisePublic = Omit<
  ApiEntreprise,
  "responsable" | "emailResponsable" | "telephone"
>;

// ── Offre ────────────────────────────────────────────────────────────────────

export interface ApiOffre {
  id: string;
  titre: string;
  entreprise: { id: string; nom: string; logo?: string; ville: string };
  type: string;
  ville: string;
  mode: string;
  niveauDemande: string;
  /** Libellé de la filière, pour l'AFFICHAGE seulement. */
  filiere: string;
  /** Référence stable au référentiel — obligatoire sur une offre. */
  filiereId: string;
  competences: string[];
  description: string;
  /** `YYYY-MM-DD`. */
  dateLimite: string;
  nombrePostes: number;
  status: OffreStatus;
  /** Toujours 0 dans la vue publique. */
  candidatures: number;
  /** `YYYY-MM-DD`. */
  publieeLe: string;
}

// ── Candidature ──────────────────────────────────────────────────────────────

export interface ApiCandidature {
  id: string;
  status: CandidatureStatus;
  message?: string;
  createdAt: string;
  vueLe?: string;
  offre: {
    id: string;
    titre: string;
    type: string;
    ville: string;
    mode: string;
    dateLimite: string;
    entreprise: { id: string; nom: string; logo?: string; ville: string };
  };
  cv?: { id: string; filename: string; size: number };
}

export interface ApiCandidatureRecruteur extends ApiCandidature {
  jeune: {
    id: string;
    prenom: string;
    nom: string;
    photo?: string;
    titre: string;
    ville: string;
    filiere: string;
    niveauEtudes: string;
    competences: string[];
    scoreQuiz?: number;
    /**
     * Formations menées jusqu'au certificat.
     *
     * À lire AVEC `formationsSuivies` : « 2 sur 9 » et « 2 sur 2 » ne disent
     * pas la même chose de la persévérance d'un candidat.
     */
    formationsValidees: number;
    formationsSuivies: number;
  };
}

// ── Référentiels administrables (§7.4) ───────────────────────────────────────

/** Référentiels exposés par l'API, identifiés par leur segment d'URL. */
export type ReferentielKey = "categories-formation" | "filieres";

/** Entrée de référentiel — même forme quel que soit le référentiel. */
export interface ApiReferentielEntree {
  id: string;
  nom: string;
  /** Position d'affichage dans les listes. */
  ordre: number;
  /** Désactivée : conservée sur l'existant, plus proposée à la saisie. */
  active: boolean;
  /** Nombre d'enregistrements rattachés — conditionne la suppression. */
  usages: number;
  createdAt: string;
}

// ── Questions fréquentes ─────────────────────────────────────────────────────

/**
 * Question telle que la voit un visiteur.
 *
 * `reponse` est du TEXTE SIMPLE, jamais du HTML : elle s'affiche dans un `<p>`,
 * sans `dangerouslySetInnerHTML` ni assainissement à prévoir.
 */
export interface ApiFaq {
  id: string;
  question: string;
  reponse: string;
}

/** La même, vue du back-office : avec son rang et son état de publication. */
export interface ApiFaqAdmin extends ApiFaq {
  ordre: number;
  publiee: boolean;
}

// ── Formation ────────────────────────────────────────────────────────────────

export interface ApiFormationSummary {
  id: string;
  titre: string;
  sousTitre?: string;
  description: string;
  /**
   * Libellé de la catégorie, pour l'AFFICHAGE seulement.
   *
   * En écriture (création, modification, filtre), c'est `categorieId` qui fait
   * foi : un libellé change au premier renommage depuis le back-office.
   */
  categorie: string;
  /** Identifiant dans le référentiel — la référence stable. */
  categorieId: string;
  /** Libellé de la filière, pour l'AFFICHAGE seulement. */
  filiere?: string;
  /** Référence stable au référentiel — absente si la formation est transverse. */
  filiereId?: string;
  image?: string;
  tempsLectureMin: number;
  note?: number;
  nombreAvis: number;
  niveau?: string;
  instructeur?: string;
  populaire: boolean;
  certifiante: boolean;
  objectifs: string[];
  prerequis: string[];
  /** Nombre de chapitres, dérivé des `<h2>` du cours par le serveur. */
  nombreChapitres: number;
  /** Avancement du jeune connecté ; 0 pour un visiteur anonyme. */
  progression: number;
  /**
   * État de publication.
   *
   * Toujours `true` pour un non-admin — il ne reçoit jamais de brouillon. Exposé
   * pour que le back-office distingue les deux sans requête supplémentaire.
   */
  publiee: boolean;
}

export interface ApiFormationQuizQuestion {
  id: string;
  enonce: string;
  type: QuestionType;
  options: string[];
  /** Index des bonnes options ; renvoyés UNIQUEMENT à un administrateur. */
  bonnesReponses?: number[];
  explication?: string;
  chapitre?: string;
}

export interface ApiFormation extends ApiFormationSummary {
  contenuHtml: string;
  quiz?: {
    titre: string;
    description: string;
    scoreMinimum: number;
    questions: ApiFormationQuizQuestion[];
  };
}

export interface ApiAvis {
  id: string;
  formationId: string;
  /** Prénom + initiale du nom : l'API n'expose jamais l'identité complète. */
  auteurNom: string;
  auteurPhoto?: string;
  note: number;
  commentaire: string;
  createdAt: string;
  utile: number;
}

/** `GET /formations/:id/avis` renvoie la liste ET les votes du lecteur. */
export interface ApiAvisList {
  items: ApiAvis[];
  /** Ids des avis que le lecteur a déjà marqués « utiles ». */
  mesVotes: string[];
}

export interface ApiProgression {
  progression: number;
  lu: boolean;
}

export interface ApiQuizCorrection {
  questionId: string;
  correcte: boolean;
  /** Corrigé, renvoyé APRÈS la soumission seulement. */
  bonnesReponses: number[];
  explication: string;
}

export interface ApiFormationQuizResult {
  score: number;
  scoreMinimum: number;
  reussi: boolean;
  corrections: ApiQuizCorrection[];
}

// ── Entretien ────────────────────────────────────────────────────────────────

export interface ApiEntretien {
  id: string;
  jeune: { id: string; prenom: string; nom: string; photo?: string; titre: string };
  entreprise: { id: string; nom: string; logo?: string };
  offreTitre: string;
  /** `YYYY-MM-DD`. */
  date: string;
  heure: string;
  status: EntretienStatus;
  /** Présent uniquement quand l'entretien est accepté. */
  lienReunion?: string;
  commentaire?: string;
  /**
   * Demande née d'une candidature spontanée : le JEUNE a réservé un créneau.
   * Détermine qui doit répondre — l'entreprise ici, le candidat sinon.
   */
  spontanee: boolean;
}

// ── Test de validation (§5.3) ────────────────────────────────────────────────

export interface ApiTestQuestion {
  id: string;
  enonce: string;
  type: QuestionType;
  options: string[];
}

export interface ApiTestQuestions {
  /** Le test servi : celui de la filière du candidat, ou le test commun. */
  test: { id: string; titre: string; description: string; filiere: string | null };
  questions: ApiTestQuestion[];
}

export interface ApiTestResult {
  score: number;
  scoreMinimum: number;
  reussi: boolean;
  status: JeuneStatus;
}

export interface ApiTestAttempt {
  id: string;
  score: number;
  reussi: boolean;
  createdAt: string;
}

// ── Notifications & documents ────────────────────────────────────────────────

export interface ApiNotification {
  id: string;
  icon: string;
  title: string;
  detail?: string;
  href?: string;
  read: boolean;
  accent: boolean;
  createdAt: string;
}

/** `GET /notifications` renvoie `{ items, unread }` avec `meta` à côté. */
export interface ApiNotificationList {
  items: ApiNotification[];
  unread: number;
}

export interface ApiDocument {
  id: string;
  type: DocumentType;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  /** Route protégée, relative au préfixe de l'API. */
  url: string;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export interface ApiAdminStats {
  jeunesInscrits: number;
  jeunesValides: number;
  entreprisesInscrites: number;
  entreprisesValidees: number;
  offresPubliees: number;
  offresEnAttente: number;
  candidatures: number;
  entretiensDemandes: number;
  entretiensAcceptes: number;
  formationsPubliees: number;
  tauxValidationQuiz: number;
}

/**
 * Question d'un test de validation, vue administrateur.
 *
 * Pas d'`explication`, contrairement au test d'une formation : ce test ne
 * renvoie au candidat que son score, jamais la correction.
 */
export interface ApiQuizQuestion {
  id: string;
  testId: string;
  enonce: string;
  type: QuestionType;
  options: string[];
  /** Index des bonnes options. */
  bonnesReponses: number[];
  active: boolean;
  ordre: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Test de validation d'un compte jeune (§5.3).
 *
 * UN SEUL test par filière ; `filiereId: null` désigne le test COMMUN, servi
 * aux candidats dont la filière n'a pas le sien.
 */
export interface ApiTest {
  id: string;
  titre: string;
  description: string;
  filiereId: string | null;
  filiere: { id: string; nom: string } | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  /** Présentes sur la fiche d'un test, absentes de la liste. */
  questions?: ApiQuizQuestion[];
  /** Présent en liste, où les questions ne sont pas chargées. */
  _count?: { questions: number };
}

// ── Référentiels ─────────────────────────────────────────────────────────────

export interface ApiReferentiels {
  filieres: string[];
  typesOpportunite: string[];
  modesTravail: string[];
  niveauxEtudes: string[];
  categoriesFormation: string[];
  scoreMinimumTest: number;
}

// ── Candidature spontanée & disponibilités (§10) ─────────────────────────────

/**
 * Journée ouverte à la réservation.
 *
 * Une journée est réservable parce qu'elle figure dans la liste : une date
 * absente n'est simplement pas proposée.
 */
export interface ApiDateProgrammee {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Au moins une plage — `HH:MM`. Une journée sans plage n'ouvre rien. */
  plages: Array<{ debut: string; fin: string }>;
}

/** Réglages de la prise de rendez-vous, vus par l'entreprise. */
export interface ApiDisponibilites {
  spontaneeOuverte: boolean;
  creneauDureeMin: number;
  reservationSemaines: number;
  spontaneeMessage: string;
  /** Journées programmées à venir, ordonnées. */
  dates: ApiDateProgrammee[];
}

/** Entreprise ouverte aux candidatures spontanées, vue par le jeune. */
export interface ApiEntrepriseOuverte {
  id: string;
  nom: string;
  logo?: string;
  secteur: string;
  ville: string;
  spontaneeMessage: string;
  creneauDureeMin: number;
  /** Journées encore ouvertes — de quoi jauger la fiche sans l'ouvrir. */
  journeesOuvertes: number;
  /** Première journée ouverte, `YYYY-MM-DD` ; `null` s'il n'en reste aucune. */
  prochaineDate: string | null;
}

export interface ApiJourneeCreneaux {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Heures encore libres, ordonnées. */
  creneaux: string[];
}

export interface ApiCalendrierSpontanee {
  entreprise: ApiEntrepriseOuverte;
  journees: ApiJourneeCreneaux[];
  /** Demande déjà en attente auprès de cette entreprise. */
  demandeEnCours: { id: string; date: string; heure: string } | null;
}

// ── Recherche globale ────────────────────────────────────────────────────────

/** Nature d'un résultat : décide de l'icône et du lien. */
export type TypeResultat = "offre" | "formation" | "entreprise";

/**
 * Forme COMMUNE aux trois types.
 *
 * Un seul contrat, donc un seul rendu : ajouter un type de résultat ne demande
 * qu'une icône et une destination, pas un nouveau composant.
 */
export interface ApiResultatRecherche {
  id: string;
  titre: string;
  /** Ligne de contexte : entreprise et ville, catégorie, secteur… */
  sousTitre: string;
  image?: string;
}

export interface ApiGroupeRecherche {
  type: TypeResultat;
  /** Total réel, au-delà des quelques éléments renvoyés. */
  total: number;
  items: ApiResultatRecherche[];
}

export interface ApiRecherche {
  q: string;
  /** Somme des totaux : `0` dit « rien trouvé » sans parcourir les groupes. */
  total: number;
  /** Les groupes vides sont absents. */
  groupes: ApiGroupeRecherche[];
}

/**
 * Avis mis en avant sur la page d'accueil (`GET /formations/temoignages`).
 *
 * L'auteur reste réduit au prénom et à l'initiale : la page est publique.
 * `auteurPhoto` pointe vers une route PROTÉGÉE et n'est donc pas exploitable
 * hors session — la vitrine affiche des initiales.
 */
export interface ApiTemoignage {
  id: string;
  auteurNom: string;
  auteurPhoto?: string;
  note: number;
  commentaire: string;
  formation: { id: string; titre: string };
}
