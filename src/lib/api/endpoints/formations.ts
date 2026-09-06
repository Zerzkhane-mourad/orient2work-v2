/** Endpoints du catalogue e-learning. */
import { http } from "../client";
import type {
  ApiAvis,
  ApiAvisList,
  ApiFormation,
  ApiFormationQuizResult,
  ApiFormationSummary,
  ApiProgression,
  Paginated,
} from "../types";

export interface FormationsParams {
  q?: string;
  /** Identifiant du référentiel : un renommage ne casse pas un lien partagé. */
  categorieId?: string;
  filiereId?: string;
  niveau?: string;
  certifiante?: boolean;
  populaire?: boolean;
  /** Commencées et non terminées, pour le jeune connecté. Filtré côté serveur. */
  enCours?: boolean;
  page?: number;
  perPage?: number;
}

export interface QuizAnswer {
  questionId: string;
  /** Index cochés — un seul pour un choix unique, un tableau vide si abstention. */
  reponses: number[];
}

export const formationsApi = {
  /** Enrichi de la progression du jeune connecté ; 0 pour un visiteur. */
  list: (params: FormationsParams = {}): Promise<Paginated<ApiFormationSummary>> =>
    http.list<ApiFormationSummary>("/formations", { ...params }),

  byId: (id: string) => http.get<ApiFormation>(`/formations/${id}`),

  /** La progression est monotone côté serveur : elle ne redescend jamais. */
  saveProgression: (id: string, progression: number, lu?: boolean) =>
    http.put<ApiProgression>(`/formations/${id}/progression`, { progression, lu }),

  /**
   * La correction est calculée côté serveur : les bonnes réponses ne sont
   * jamais envoyées au navigateur avant la soumission.
   */
  submitQuiz: (id: string, reponses: QuizAnswer[]) =>
    http.post<ApiFormationQuizResult>(`/formations/${id}/quiz`, { reponses }),

  listAvis: (id: string, page = 1, perPage = 20) =>
    http.get<ApiAvisList>(`/formations/${id}/avis`, { page, perPage }),

  /** Un seul avis par jeune et par formation — l'API fait un upsert. */
  saveAvis: (id: string, note: number, commentaire = "") =>
    http.put<ApiAvis>(`/formations/${id}/avis`, { note, commentaire }),

  removeAvis: (formationId: string, avisId: string) =>
    http.delete<void>(`/formations/${formationId}/avis/${avisId}`),

  /** Bascule le vote « utile ». Voter pour son propre avis est refusé (403). */
  toggleAvisUtile: (formationId: string, avisId: string) =>
    http.post<ApiAvis>(`/formations/${formationId}/avis/${avisId}/utile`),
};
