/**
 * Candidature spontanée (§10).
 *
 * Deux périmètres bien séparés : l'entreprise règle ses disponibilités, le
 * jeune consulte les créneaux et réserve. Les créneaux ne sont jamais stockés —
 * le serveur les déduit des journées programmées à chaque appel.
 */
import { http } from "../client";
import type {
  ApiCalendrierSpontanee,
  ApiDateProgrammee,
  ApiDisponibilites,
  ApiEntrepriseOuverte,
  Paginated,
} from "../types";

export interface UpdateDisponibilitesInput {
  spontaneeOuverte?: boolean;
  creneauDureeMin?: number;
  reservationSemaines?: number;
  spontaneeMessage?: string;
  /**
   * REMPLACE les journées programmées À VENIR : envoyer la liste complète, pas
   * un différentiel. Les dates passées ne sont pas transmises et restent
   * intactes.
   */
  dates?: ApiDateProgrammee[];
}

export const disponibilitesApi = {
  /** Journées ouvertes et réglages de l'entreprise connectée. */
  get: () => http.get<ApiDisponibilites>("/entreprises/disponibilites"),

  update: (input: UpdateDisponibilitesInput) =>
    http.put<ApiDisponibilites>("/entreprises/disponibilites", input),
};

export const spontaneeApi = {
  /**
   * Entreprises qui reçoivent des candidatures spontanées.
   *
   * @param q filtre sur le nom ou le secteur — c'est ce qui permet à la
   * recherche globale d'ouvrir cet écran déjà restreint.
   */
  entreprises: (page = 1, perPage = 12, q?: string): Promise<Paginated<ApiEntrepriseOuverte>> =>
    http.list<ApiEntrepriseOuverte>("/candidatures-spontanees/entreprises", { page, perPage, q }),

  /** Créneaux encore libres, calculés à l'instant de l'appel. */
  creneaux: (entrepriseId: string) =>
    http.get<ApiCalendrierSpontanee>(
      `/candidatures-spontanees/entreprises/${entrepriseId}/creneaux`,
    ),

  /** Réserve un créneau ; le serveur revérifie qu'il est encore libre. */
  reserver: (entrepriseId: string, input: { date: string; heure: string; message?: string }) =>
    http.post<{ id: string; date: string; heure: string }>(
      `/candidatures-spontanees/entreprises/${entrepriseId}/reservation`,
      input,
    ),
};
