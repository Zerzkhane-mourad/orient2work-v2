/**
 * Point d'entrée unique du client API.
 *
 * Les composants importent `api` depuis `@/lib/api` et rien d'autre — jamais
 * `fetch` en direct, jamais un endpoint isolé.
 *
 *     import { api, ApiError } from "@/lib/api";
 *     const jeune = await api.jeunes.me();
 */
import { adminApi } from "./endpoints/admin";
import { authApi } from "./endpoints/auth";
import { candidaturesApi } from "./endpoints/candidatures";
import { contactApi } from "./endpoints/contact";
import { entreprisesApi } from "./endpoints/entreprises";
import { entretiensApi, testApi } from "./endpoints/entretiens";
import { faqApi } from "./endpoints/faq";
import { formationsApi } from "./endpoints/formations";
import { jeunesApi } from "./endpoints/jeunes";
import { documentsApi, notificationsApi } from "./endpoints/notifications";
import { referentielsApi } from "./endpoints/referentiels";
import { offresApi } from "./endpoints/offres";
import { rechercheApi } from "./endpoints/recherche";
import { disponibilitesApi, spontaneeApi } from "./endpoints/spontanee";
import { http } from "./client";
import type { ApiReferentiels } from "./types";

export const api = {
  auth: authApi,
  jeunes: jeunesApi,
  entreprises: entreprisesApi,
  offres: offresApi,
  candidatures: candidaturesApi,
  formations: formationsApi,
  entretiens: entretiensApi,
  test: testApi,
  notifications: notificationsApi,
  documents: documentsApi,
  contact: contactApi,
  admin: adminApi,
  /** Questions fréquentes : lecture publique, écriture réservée au back-office. */
  faq: faqApi,
  /** Grille de disponibilités, côté entreprise. */
  disponibilites: disponibilitesApi,
  /** Candidature spontanée, côté jeune. */
  spontanee: spontaneeApi,
  /** Recherche globale : offres, formations et entreprises d'un seul appel. */
  recherche: rechercheApi,

  referentiels: {
    ...referentielsApi,
    /** Toutes les listes de valeurs en un appel (filières, types d'offre…). */
    tous: () => http.get<ApiReferentiels>("/referentiels"),
  },
};

export { ApiError, humanizeError } from "./errors";
export type { ApiErrorCode, FieldIssue } from "./errors";
export { http, serverFetch } from "./client";
export { clearSession, getCurrentUser, refreshSession, restoreSession, subscribe } from "./session";
export * from "./types";
