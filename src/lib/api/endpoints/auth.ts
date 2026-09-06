/** Endpoints d'authentification. */
import { http } from "../client";
import { clearSession, setSession } from "../session";
import type { AuthSession, MessageResponse, User } from "../types";

/**
 * Inscription d'un jeune — tous les champs sont exigés par l'API.
 *
 * Ils ne sont pas décoratifs : la filière décide du test de validation servi au
 * candidat (§5.3) et du ciblage des offres, le niveau et l'établissement pèsent
 * dans le score d'employabilité.
 */
export interface RegisterJeuneInput {
  email: string;
  password: string;
  prenom: string;
  nom: string;
  telephone: string;
  ville: string;
  /** Identifiant du référentiel filière ; créable depuis le formulaire. */
  filiereId: string;
  niveauEtudes: string;
  etablissement: string;
}

export interface RegisterEntrepriseInput {
  email: string;
  password: string;
  nom: string;
  secteur: string;
  ville: string;
  siteWeb?: string;
  description?: string;
  responsable: string;
  emailResponsable?: string;
  telephone: string;
}

export const authApi = {
  /**
   * L'inscription ne crée PAS de session : le backend renvoie un message et
   * envoie un email de vérification. L'utilisateur devra se connecter ensuite.
   */
  registerJeune: (input: RegisterJeuneInput) =>
    http.post<MessageResponse>("/auth/inscription/jeune", input, { autoRefresh: false }),

  registerEntreprise: (input: RegisterEntrepriseInput) =>
    http.post<MessageResponse>("/auth/inscription/entreprise", input, { autoRefresh: false }),

  /** Ouvre la session et la stocke en mémoire (jamais dans localStorage). */
  async login(email: string, password: string): Promise<User> {
    const session = await http.post<AuthSession>(
      "/auth/connexion",
      { email, password },
      // Un 401 signifie ici « identifiants incorrects », pas « session expirée » :
      // tenter un refresh n'aurait aucun sens.
      { autoRefresh: false },
    );
    setSession(session);
    return session.user;
  },

  /** Ferme la session côté serveur, puis purge la mémoire quoi qu'il arrive. */
  async logout(): Promise<void> {
    try {
      await http.post<void>("/auth/deconnexion", undefined, {
        csrf: true,
        autoRefresh: false,
      });
    } finally {
      clearSession();
    }
  },

  logoutAll: () => http.post<void>("/auth/deconnexion-globale"),

  me: () => http.get<User>("/auth/moi"),

  verifyEmail: (token: string) =>
    http.post<MessageResponse>("/auth/verification-email", { token }, { autoRefresh: false }),

  resendVerification: (email: string) =>
    http.post<MessageResponse>(
      "/auth/verification-email/renvoi",
      { email },
      { autoRefresh: false },
    ),

  forgotPassword: (email: string) =>
    http.post<MessageResponse>("/auth/mot-de-passe/oubli", { email }, { autoRefresh: false }),

  resetPassword: (token: string, password: string) =>
    http.post<MessageResponse>(
      "/auth/mot-de-passe/reinitialisation",
      { token, password },
      { autoRefresh: false },
    ),

  /** Révoque toutes les sessions : l'utilisateur devra se reconnecter. */
  async changePassword(currentPassword: string, newPassword: string): Promise<MessageResponse> {
    const result = await http.patch<MessageResponse>("/auth/mot-de-passe", {
      currentPassword,
      newPassword,
    });
    clearSession();
    return result;
  },
};
