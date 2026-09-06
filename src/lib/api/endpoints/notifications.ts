/** Endpoints des notifications et des documents. */
import { API_URL } from "@/lib/config";
import { http } from "../client";
import type { ApiDocument, ApiNotificationList, DocumentType, Paginated } from "../types";

export const notificationsApi = {
  /**
   * Renvoie `{ items, unread }` — le compteur de non-lues vient avec la liste
   * pour éviter un second aller-retour rien que pour la pastille du header.
   */
  list: (params: { unreadOnly?: boolean; page?: number; perPage?: number } = {}) =>
    http.get<ApiNotificationList>("/notifications", { ...params }),

  markRead: (id: string) => http.post<void>(`/notifications/${id}/lu`),

  markAllRead: () => http.post<{ updated: number }>("/notifications/tout-lu"),

  remove: (id: string) => http.delete<void>(`/notifications/${id}`),
};

export const documentsApi = {
  list: (
    params: {
      /** Un type, ou plusieurs : « Mes documents » ne liste que `CV,AUTRE`. */
      type?: DocumentType | readonly DocumentType[];
      page?: number;
      perPage?: number;
    } = {},
  ) => http.list<ApiDocument>("/documents", { ...params }) as Promise<Paginated<ApiDocument>>,

  /** Type, extension, signature binaire et taille sont vérifiés côté serveur. */
  upload: (type: DocumentType, file: File) => http.upload<ApiDocument>(`/documents/${type}`, file),

  remove: (id: string) => http.delete<void>(`/documents/${id}`),

  /**
   * URL absolue de téléchargement.
   *
   * La route revérifie les droits à chaque appel, mais elle attend un en-tête
   * `Authorization` : un `<img src>` ou un `<a href>` direct ne l'enverra pas.
   * Passer par `fetchBlobUrl` pour afficher ou télécharger un document.
   */
  contentUrl: (id: string) => `${API_URL}/documents/${id}/contenu`,
};
