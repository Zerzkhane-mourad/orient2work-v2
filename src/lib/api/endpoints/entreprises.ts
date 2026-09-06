/** Endpoints du profil entreprise et de l'annuaire public. */
import { http } from "../client";
import type { ApiEntreprise, ApiEntreprisePublic, Paginated } from "../types";

export interface UpdateEntrepriseInput {
  nom?: string;
  secteur?: string;
  ville?: string;
  siteWeb?: string;
  description?: string;
  responsable?: string;
  emailResponsable?: string;
  telephone?: string;
}

export interface EntreprisesParams {
  q?: string;
  ville?: string;
  secteur?: string;
  page?: number;
  perPage?: number;
}

export const entreprisesApi = {
  me: () => http.get<ApiEntreprise>("/entreprises/moi"),

  update: (input: UpdateEntrepriseInput) => http.patch<ApiEntreprise>("/entreprises/moi", input),

  /** Annuaire public : uniquement les entreprises validées par OMB. */
  list: (params: EntreprisesParams = {}): Promise<Paginated<ApiEntreprisePublic>> =>
    http.list<ApiEntreprisePublic>("/entreprises", { ...params }),

  byId: (id: string) => http.get<ApiEntreprise | ApiEntreprisePublic>(`/entreprises/${id}`),
};
