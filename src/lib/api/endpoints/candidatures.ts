/** Endpoints des candidatures. */
import { http } from "../client";
import type {
  ApiCandidature,
  ApiCandidatureRecruteur,
  CandidatureStatus,
  Paginated,
} from "../types";

/** Ordres proposés au recruteur — voir `TRIS_RECRUTEUR`. */
export type CandidatureSort = "recent" | "score" | "formations";

export interface CandidaturesParams {
  /** Un statut, ou plusieurs pour un onglet qui en regroupe. */
  status?: CandidatureStatus | readonly CandidatureStatus[];
  offreId?: string;
  /**
   * Ordre de la liste. Le tri est fait par le SERVEUR : trier la page courante
   * ne classerait que vingt candidatures sur deux cents.
   */
  sort?: CandidatureSort;
  page?: number;
  perPage?: number;
}

/** Statuts que l'entreprise peut appliquer ; `retiree` appartient au jeune. */
export type RecruteurStatus = Exclude<CandidatureStatus, "envoyee" | "retiree">;

export const candidaturesApi = {
  /** Exige un profil `valide` (test réussi) et un email confirmé. */
  apply: (offreId: string, input: { message?: string; cvId?: string } = {}) =>
    http.post<ApiCandidature>("/candidatures", { offreId, ...input }),

  mine: (params: CandidaturesParams = {}): Promise<Paginated<ApiCandidature>> =>
    http.list<ApiCandidature>("/candidatures/mes-candidatures", { ...params }),

  /**
   * Répartition par statut sur la TOTALITÉ des candidatures du jeune.
   *
   * Les onglets affichent des totaux qui ne peuvent pas être déduits de la page
   * courante, puisque la liste est paginée côté serveur.
   */
  countMine: () =>
    http.get<Partial<Record<CandidatureStatus, number>>>(
      "/candidatures/mes-candidatures/compteurs",
    ),

  /** Candidatures reçues sur les offres de l'entreprise connectée. */
  received: (params: CandidaturesParams = {}): Promise<Paginated<ApiCandidatureRecruteur>> =>
    http.list<ApiCandidatureRecruteur>("/candidatures/recues", { ...params }),

  byId: (id: string) => http.get<ApiCandidature | ApiCandidatureRecruteur>(`/candidatures/${id}`),

  updateStatus: (id: string, status: RecruteurStatus) =>
    http.patch<ApiCandidatureRecruteur>(`/candidatures/${id}/statut`, { status }),

  withdraw: (id: string) => http.post<ApiCandidature>(`/candidatures/${id}/retrait`),
};
