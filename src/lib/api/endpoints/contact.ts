/** Endpoints publics de contact et de newsletter. */
import { http } from "../client";
import type { MessageResponse, Paginated } from "../types";

export interface ContactMessageInput {
  nom: string;
  email: string;
  sujet: string;
  message: string;
}

export interface ApiContactMessage {
  id: string;
  nom: string;
  email: string;
  sujet: string;
  message: string;
  traite: boolean;
  createdAt: string;
}

export interface ApiNewsletterSubscription {
  id: string;
  email: string;
  createdAt: string;
}

export const contactApi = {
  /** Route publique, fortement limitée en débit. */
  send: (input: ContactMessageInput) =>
    http.post<MessageResponse>("/contact", input, { autoRefresh: false }),

  /** Inscription idempotente : la réponse ne dit pas si l'adresse existait déjà. */
  subscribe: (email: string) =>
    http.post<MessageResponse>("/newsletter", { email }, { autoRefresh: false }),

  /** La désinscription exige le jeton reçu par email. */
  unsubscribe: (token: string) =>
    http.post<MessageResponse>("/newsletter/desinscription", { token }, { autoRefresh: false }),

  // ── Administration ─────────────────────────────────────────────────────────
  messages: (params: { traite?: boolean; page?: number; perPage?: number } = {}) =>
    http.list<ApiContactMessage>("/admin/contact", { ...params }) as Promise<
      Paginated<ApiContactMessage>
    >,

  setTraite: (id: string, traite: boolean) =>
    http.patch<ApiContactMessage>(`/admin/contact/${id}`, { traite }),

  subscriptions: (params: { page?: number; perPage?: number } = {}) =>
    http.list<ApiNewsletterSubscription>("/admin/newsletter", { ...params }) as Promise<
      Paginated<ApiNewsletterSubscription>
    >,
};
