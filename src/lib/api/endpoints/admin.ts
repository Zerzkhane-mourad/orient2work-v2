/** Endpoints d'administration (rôle ADMIN). */
import { http } from "../client";
import type {
  ApiAdminStats,
  ApiEntreprise,
  ApiFormation,
  ApiJeune,
  ApiOffre,
  ApiTest,
  EntrepriseStatus,
  JeuneStatus,
  OffreStatus,
  Paginated,
  QuestionType,
} from "../types";

/**
 * Question de quiz, forme commune aux deux quiz du projet.
 *
 * `bonnesReponses` est un tableau d'index dans `options` : un seul élément pour
 * un choix unique, au moins deux pour `choix_multiples`. La cohérence est
 * vérifiée côté serveur, quel que soit le chemin.
 */
export interface QuestionInput {
  enonce: string;
  type?: QuestionType;
  options: string[];
  bonnesReponses: number[];
  explication?: string;
  chapitre?: string;
}

/**
 * Question du test de validation général.
 *
 * Ni `explication` ni `chapitre` : ce test ne montre pas la correction et ne
 * dépend d'aucun cours. L'API les refuse (corps strict), d'où ce type à part.
 */
export type TestQuestionInput = Omit<QuestionInput, "explication" | "chapitre">;

export interface CreateFormationInput {
  titre: string;
  sousTitre?: string;
  description: string;
  /** Identifiant du référentiel — la catégorie n'est jamais désignée par son nom. */
  categorieId: string;
  /** Identifiant du référentiel filière ; absent = formation transverse. */
  filiereId?: string;
  image?: string;
  tempsLectureMin?: number;
  niveau?: string;
  instructeur?: string;
  populaire?: boolean;
  certifiante?: boolean;
  objectifs?: string[];
  prerequis?: string[];
  /** Assaini côté serveur avant persistance (whitelist de balises). */
  contenuHtml: string;
  publiee?: boolean;
  quiz?: {
    titre: string;
    description?: string;
    scoreMinimum?: number;
    questions: QuestionInput[];
  };
}

export const adminApi = {
  /**
   * Fiche COMPLÈTE d'un jeune — email, téléphone et liens compris.
   *
   * Même route que `jeunes.byId`, mais typée sans omission : l'API ne sert la
   * vue complète qu'à un administrateur (ou au jeune lui-même). Pour tout autre
   * appelant elle renvoie la vue publique, d'où le type union là-bas.
   */
  jeuneById: (id: string) => http.get<ApiJeune>(`/jeunes/${id}`),

  /**
   * Téléverse ou remplace la couverture d'une formation.
   *
   * Séparé de la création : le fichier est rattaché à une formation existante,
   * il faut donc son identifiant. Type MIME, extension, signature binaire et
   * taille sont vérifiés côté serveur ; l'ancienne couverture est effacée.
   */
  uploadFormationImage: (formationId: string, file: File) =>
    http.upload<ApiFormation>(`/formations/${formationId}/image`, file),

  /**
   * Illustration insérée DANS le corps d'un cours — distincte de la couverture.
   *
   * Ne dépend d'aucune formation : on illustre un chapitre avant même le
   * premier enregistrement. Renvoie l'URL à poser dans le HTML.
   */
  uploadFormationMedia: (file: File) =>
    http.upload<{ id: string; url: string }>("/formations/medias", file),

  stats: () => http.get<ApiAdminStats>("/admin/statistiques"),

  jeunes: (
    params: {
      q?: string;
      status?: JeuneStatus;
      filiereId?: string;
      page?: number;
      perPage?: number;
    } = {},
  ) => http.list<ApiJeune>("/admin/jeunes", { ...params }) as Promise<Paginated<ApiJeune>>,

  setJeuneStatus: (id: string, status: JeuneStatus) =>
    http.patch<ApiJeune>(`/admin/jeunes/${id}/statut`, { status }),

  entreprises: (
    params: {
      q?: string;
      status?: EntrepriseStatus;
      ville?: string;
      secteur?: string;
      page?: number;
      perPage?: number;
    } = {},
  ) =>
    http.list<ApiEntreprise>("/admin/entreprises", { ...params }) as Promise<
      Paginated<ApiEntreprise>
    >,

  /**
   * Fiche complète d'une entreprise.
   *
   * Passe par la route publique `/entreprises/:id` : le service y sert la vue
   * COMPLÈTE — responsable, email, téléphone — dès lors que l'appelant est
   * administrateur, et la sert même si l'entreprise n'est pas encore validée.
   * Un endpoint d'administration séparé ne ferait que dupliquer cette règle.
   */
  entrepriseById: (id: string) => http.get<ApiEntreprise>(`/entreprises/${id}`),

  setEntrepriseStatus: (id: string, status: EntrepriseStatus, motif?: string) =>
    http.patch<ApiEntreprise>(`/admin/entreprises/${id}/statut`, { status, motif }),

  offres: (params: { q?: string; status?: OffreStatus; page?: number; perPage?: number } = {}) =>
    http.list<ApiOffre>("/admin/offres", { ...params }) as Promise<Paginated<ApiOffre>>,

  moderateOffre: (id: string, status: OffreStatus, motif?: string) =>
    http.patch<ApiOffre>(`/admin/offres/${id}/moderation`, { status, motif }),

  /** Tâche de maintenance : bascule les offres dont la date limite est passée. */
  expireOffres: () => http.post<{ expirees: number }>("/admin/offres/expiration"),

  /*
   * Tests de validation des comptes (§5.3).
   *
   * Une question appartient toujours à un test — d'où des routes imbriquées.
   * Un seul test par filière, plus un test commun : l'API refuse le second
   * en 409 plutôt que de laisser deux tests se disputer les mêmes candidats.
   *
   * Chaque opération sur une question renvoie le test rechargé, si bien que
   * l'écran reste le reflet exact de la base sans second appel.
   */
  tests: (params: { page?: number; perPage?: number } = {}) =>
    http.list<ApiTest>("/admin/tests", { ...params }) as Promise<Paginated<ApiTest>>,

  /** Un test avec ses questions, corrigé compris et désactivées incluses. */
  test: (id: string) => http.get<ApiTest>(`/admin/tests/${id}`),

  createTest: (input: {
    titre: string;
    description?: string;
    /** Absent = test commun à toutes les filières. */
    filiereId?: string;
    active?: boolean;
    questions?: TestQuestionInput[];
  }) => http.post<ApiTest>("/admin/tests", input),

  /** `filiereId: null` rend le test commun ; l'omettre laisse le ciblage tel quel. */
  updateTest: (
    id: string,
    input: Partial<{
      titre: string;
      description: string;
      filiereId: string | null;
      active: boolean;
    }>,
  ) => http.patch<ApiTest>(`/admin/tests/${id}`, input),

  deleteTest: (id: string) => http.delete<void>(`/admin/tests/${id}`),

  addTestQuestion: (testId: string, input: TestQuestionInput & { active?: boolean }) =>
    http.post<ApiTest>(`/admin/tests/${testId}/questions`, input),

  updateTestQuestion: (
    testId: string,
    questionId: string,
    input: Partial<TestQuestionInput> & { active?: boolean },
  ) => http.patch<ApiTest>(`/admin/tests/${testId}/questions/${questionId}`, input),

  removeTestQuestion: (testId: string, questionId: string) =>
    http.delete<ApiTest>(`/admin/tests/${testId}/questions/${questionId}`),

  /*
   * Quiz d'une formation — édition au fil de l'eau.
   *
   * `updateFormation` réécrit le quiz EN BLOC ; ces appels-ci ne touchent qu'une
   * question et préservent l'identifiant des autres, auquel les tentatives déjà
   * passées font référence. Chacun renvoie la formation rechargée.
   */
  updateFormationQuiz: (
    formationId: string,
    input: Partial<{ titre: string; description: string; scoreMinimum: number }>,
  ) => http.patch<ApiFormation>(`/formations/${formationId}/quiz`, input),

  /**
   * Supprime le quiz entier — la formation se valide alors à la lecture.
   *
   * Seule façon d'enlever un quiz : le vider question par question laisserait,
   * à l'avant-dernière, un quiz d'une seule question que le serveur refuse.
   */
  removeFormationQuiz: (formationId: string) =>
    http.delete<ApiFormation>(`/formations/${formationId}/quiz`),

  addFormationQuizQuestion: (formationId: string, input: QuestionInput) =>
    http.post<ApiFormation>(`/formations/${formationId}/quiz/questions`, input),

  updateFormationQuizQuestion: (
    formationId: string,
    questionId: string,
    input: Partial<QuestionInput>,
  ) => http.patch<ApiFormation>(`/formations/${formationId}/quiz/questions/${questionId}`, input),

  removeFormationQuizQuestion: (formationId: string, questionId: string) =>
    http.delete<ApiFormation>(`/formations/${formationId}/quiz/questions/${questionId}`),

  // ── Catalogue de formations ────────────────────────────────────────────────
  createFormation: (input: CreateFormationInput) => http.post<ApiFormation>("/formations", input),

  updateFormation: (id: string, input: Partial<CreateFormationInput>) =>
    http.patch<ApiFormation>(`/formations/${id}`, input),

  deleteFormation: (id: string) => http.delete<void>(`/formations/${id}`),
};
