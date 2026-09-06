/** Endpoints du profil jeune et de la recherche de talents. */
import { http } from "../client";
import type { ApiJeune, ApiJeunePublic, JeuneStatus, Paginated } from "../types";

export interface UpdateJeuneInput {
  prenom?: string;
  nom?: string;
  telephone?: string;
  ville?: string;
  bio?: string;
  titre?: string;
  niveauEtudes?: string;
  etablissement?: string;
  /** Identifiant du référentiel filière. */
  filiereId?: string;
  specialite?: string;
  anneeEtude?: string;
  diplome?: string;
  competences?: string[];
  langues?: string[];
}

export interface ExperienceInput {
  titre: string;
  structure: string;
  periode: string;
  type: string;
  description: string;
  competences?: string[];
}

export interface LienInput {
  type: string;
  url: string;
}

export interface TalentSearchParams {
  q?: string;
  filiereId?: string;
  ville?: string;
  niveauEtudes?: string;
  /** Liste séparée par des virgules côté API. */
  competences?: string;
  scoreMin?: number;
  page?: number;
  perPage?: number;
}

export const jeunesApi = {
  /** Profil complet du jeune connecté, complétion et score déjà calculés. */
  me: () => http.get<ApiJeune>("/jeunes/moi"),

  update: (input: UpdateJeuneInput) => http.patch<ApiJeune>("/jeunes/moi", input),

  // Chaque mutation renvoie le profil complet à jour : l'UI n'a pas à recalculer
  // la complétion ni le score localement.
  addExperience: (input: ExperienceInput) => http.post<ApiJeune>("/jeunes/moi/experiences", input),

  updateExperience: (id: string, input: Partial<ExperienceInput>) =>
    http.patch<ApiJeune>(`/jeunes/moi/experiences/${id}`, input),

  removeExperience: (id: string) => http.delete<ApiJeune>(`/jeunes/moi/experiences/${id}`),

  addLien: (input: LienInput) => http.post<ApiJeune>("/jeunes/moi/liens", input),

  removeLien: (id: string) => http.delete<ApiJeune>(`/jeunes/moi/liens/${id}`),

  /** Réservé aux entreprises validées ; ne renvoie que les profils validés. */
  searchTalents: (params: TalentSearchParams = {}): Promise<Paginated<ApiJeunePublic>> =>
    http.list<ApiJeunePublic>("/jeunes/talents", { ...params }),

  /** Vue publique pour un tiers, vue complète pour le propriétaire et l'admin. */
  byId: (id: string) => http.get<ApiJeune | ApiJeunePublic>(`/jeunes/${id}`),
};

export interface AdminJeunesParams {
  q?: string;
  status?: JeuneStatus;
  filiereId?: string;
  page?: number;
  perPage?: number;
}
