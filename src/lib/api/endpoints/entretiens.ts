/** Endpoints des entretiens et du test de validation. */
import { http } from "../client";
import type {
  ApiEntretien,
  ApiTestAttempt,
  ApiTestQuestions,
  ApiTestResult,
  EntretienStatus,
  Paginated,
} from "../types";

export interface EntretiensParams {
  /** Un statut, ou plusieurs pour une section qui en regroupe. */
  status?: EntretienStatus | readonly EntretienStatus[];
  /** `YYYY-MM-DD`. */
  from?: string;
  to?: string;
  /** `true` = candidature spontanée envoyée, `false` = invitation reçue. */
  spontanee?: boolean;
  /** `asc` pour ce qui vient, `desc` pour l'historique. */
  ordre?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface CreateEntretienInput {
  jeuneId: string;
  offreId?: string;
  candidatureId?: string;
  offreTitre: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM`. */
  heure: string;
  lienReunion?: string;
  commentaire?: string;
}

export const entretiensApi = {
  /** Le périmètre est déduit du rôle côté serveur, jamais d'un paramètre. */
  list: (params: EntretiensParams = {}): Promise<Paginated<ApiEntretien>> =>
    http.list<ApiEntretien>("/entretiens", { ...params }),

  /**
   * Répartition par statut sur la TOTALITÉ du périmètre de l'appelant.
   *
   * Les écrans paginent chaque section séparément ; les cartes de synthèse ont
   * besoin des totaux, qui ne se lisent donc plus dans les listes.
   */
  countByStatus: () => http.get<Partial<Record<EntretienStatus, number>>>("/entretiens/compteurs"),

  /** Réservé aux entreprises validées ; le candidat doit être `valide`. */
  create: (input: CreateEntretienInput) => http.post<ApiEntretien>("/entretiens", input),

  /**
   * Réponse de la partie qui n'a PAS pris l'initiative.
   *
   * `lienReunion` n'est accepté qu'avec `accepte`, et seulement sur une
   * candidature spontanée — là, c'est l'entreprise qui répond, et c'est sa
   * seule occasion de fournir la salle de visio d'un rendez-vous créé par le
   * candidat.
   */
  respond: (
    id: string,
    status: "accepte" | "refuse",
    options: { commentaire?: string; lienReunion?: string } = {},
  ) => http.post<ApiEntretien>(`/entretiens/${id}/reponse`, { status, ...options }),

  /** Replanification ou annulation par l'entreprise organisatrice. */
  update: (
    id: string,
    input: {
      date?: string;
      heure?: string;
      lienReunion?: string;
      commentaire?: string;
      status?: "annule";
    },
  ) => http.patch<ApiEntretien>(`/entretiens/${id}`, input),
};

export const testApi = {
  /** Questions SANS les bonnes réponses. */
  questions: (filiereId?: string) => http.get<ApiTestQuestions>("/test/questions", { filiereId }),

  /** Corrigé côté serveur ; met à jour le statut du compte si le score suffit. */
  submit: (reponses: Array<{ questionId: string; reponses: number[] }>) =>
    http.post<ApiTestResult>("/test/soumission", { reponses }),

  attempts: () => http.get<ApiTestAttempt[]>("/test/tentatives"),
};
