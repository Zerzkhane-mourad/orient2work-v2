/** Endpoints des offres. */
import { http } from "../client";
import type { ApiOffre, OffreStatus, Paginated } from "../types";

export interface OffresParams {
  q?: string;
  type?: string;
  mode?: string;
  filiereId?: string;
  ville?: string;
  niveauDemande?: string;
  entrepriseId?: string;
  status?: OffreStatus;
  sort?: "recent" | "dateLimite" | "candidatures";
  page?: number;
  perPage?: number;
}

export interface CreateOffreInput {
  titre: string;
  type: string;
  ville: string;
  mode: string;
  niveauDemande: string;
  filiereId: string;
  competences?: string[];
  description: string;
  /** `YYYY-MM-DD`, obligatoirement dans le futur. */
  dateLimite: string;
  nombrePostes?: number;
  /**
   * Une entreprise ne peut que soumettre : la publication est une décision
   * d'administrateur (§7.3). Toute autre valeur est rejetée en 422.
   */
  status?: "brouillon" | "attente_validation";
}

export const offresApi = {
  /** Recherche publique : offres publiées et non expirées uniquement. */
  list: (params: OffresParams = {}): Promise<Paginated<ApiOffre>> =>
    http.list<ApiOffre>("/offres", { ...params }),

  byId: (id: string) => http.get<ApiOffre>(`/offres/${id}`),

  /** Offres de l'entreprise connectée, brouillons compris. */
  mine: (params: OffresParams = {}): Promise<Paginated<ApiOffre>> =>
    http.list<ApiOffre>("/offres/mes-offres", { ...params }),

  create: (input: CreateOffreInput) => http.post<ApiOffre>("/offres", input),

  update: (id: string, input: Partial<CreateOffreInput>) =>
    http.patch<ApiOffre>(`/offres/${id}`, input),

  /** Désactive l'offre — les candidatures reçues sont préservées. */
  remove: (id: string) => http.delete<void>(`/offres/${id}`),
};
