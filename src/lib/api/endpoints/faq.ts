/**
 * Questions fréquentes.
 *
 * Deux lectures pour deux publics : `publiques()` sert la vitrine et ne
 * renvoie que ce qui est publié ; `liste()` sert le back-office et voit tout.
 * Ce n'est pas un filtre optionnel sur un même appel — la distinction est faite
 * côté serveur, sur des routes différentes, pour qu'un client public ne puisse
 * pas demander les brouillons.
 */
import { http } from "../client";
import type { ApiFaq, ApiFaqAdmin } from "../types";

export const faqApi = {
  /** Vitrine : questions publiées, dans l'ordre choisi au back-office. */
  publiques: () => http.get<ApiFaq[]>("/faq"),

  /** Back-office : masquées comprises. Pas de pagination — liste tenue à la main. */
  liste: () => http.get<ApiFaqAdmin[]>("/admin/faq"),

  creer: (input: { question: string; reponse: string; publiee?: boolean }) =>
    http.post<ApiFaqAdmin>("/admin/faq", input),

  modifier: (id: string, input: { question?: string; reponse?: string; publiee?: boolean }) =>
    http.patch<ApiFaqAdmin>(`/admin/faq/${id}`, input),

  /**
   * Déplace la question d'un cran et renvoie la LISTE COMPLÈTE réordonnée.
   *
   * Le serveur réécrit tous les rangs en une transaction : un déplacement en
   * modifie au moins deux, et récupérer la liste finie évite au client de
   * recalculer un ordre qu'il pourrait deviner de travers.
   */
  deplacer: (id: string, direction: "haut" | "bas") =>
    http.post<ApiFaqAdmin[]>(`/admin/faq/${id}/position`, { direction }),

  supprimer: (id: string) => http.delete<void>(`/admin/faq/${id}`),
};
