/**
 * Routes d'authentification.
 *
 * `authLimiter` couvre toutes les routes exposées au bruteforce (connexion,
 * inscription, reset). `verifyCsrf` protège les deux seules routes qui
 * s'authentifient par cookie plutôt que par en-tête Bearer.
 */
import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate } from "../middlewares/authenticate.js";
import { verifyCsrf } from "../middlewares/csrf.js";
import { authLimiter, emailLimiter } from "../middlewares/rate-limit.js";
import { validate } from "../middlewares/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerEntrepriseSchema,
  registerJeuneSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validator.js";

export const authRouter = Router();

/**
 * @route POST /auth/inscription/jeune
 * @desc Crée un compte jeune et envoie l'email de vérification.
 * @access Public
 * @returns 201 { message }
 */
authRouter.post(
  "/inscription/jeune",
  authLimiter,
  validate({ body: registerJeuneSchema }),
  asyncHandler(controller.registerJeune),
);

/**
 * @route POST /auth/inscription/entreprise
 * @desc Crée un compte entreprise (statut initial : attente de contact OMB).
 * @access Public
 * @returns 201 { message }
 */
authRouter.post(
  "/inscription/entreprise",
  authLimiter,
  validate({ body: registerEntrepriseSchema }),
  asyncHandler(controller.registerEntreprise),
);

/**
 * @route POST /auth/connexion
 * @desc Ouvre une session : access token en réponse, refresh token en cookie httpOnly.
 * @access Public
 * @returns 200 { user, accessToken, expiresIn, csrfToken }
 */
authRouter.post(
  "/connexion",
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(controller.login),
);

/**
 * @route POST /auth/refresh
 * @desc Renouvelle l'access token et fait tourner le refresh token.
 * @access Cookie de session + en-tête x-csrf-token
 * @returns 200 { user, accessToken, expiresIn, csrfToken }
 */
authRouter.post("/refresh", authLimiter, verifyCsrf, asyncHandler(controller.refresh));

/**
 * @route POST /auth/deconnexion
 * @desc Révoque le refresh token courant et efface les cookies.
 * @access Cookie de session + en-tête x-csrf-token
 * @returns 204
 */
authRouter.post("/deconnexion", verifyCsrf, asyncHandler(controller.logout));

/**
 * @route POST /auth/deconnexion-globale
 * @desc Révoque toutes les sessions du compte.
 * @access Authentifié
 * @returns 204
 */
authRouter.post("/deconnexion-globale", authenticate, asyncHandler(controller.logoutAll));

/**
 * @route POST /auth/verification-email
 * @desc Confirme l'adresse email à partir du token reçu par mail.
 * @access Public
 * @returns 200 { message }
 */
authRouter.post(
  "/verification-email",
  authLimiter,
  validate({ body: verifyEmailSchema }),
  asyncHandler(controller.verifyEmail),
);

/**
 * @route POST /auth/verification-email/renvoi
 * @desc Renvoie un lien de vérification. Réponse identique que le compte existe ou non.
 * @access Public
 * @returns 200 { message }
 */
authRouter.post(
  "/verification-email/renvoi",
  emailLimiter,
  validate({ body: resendVerificationSchema }),
  asyncHandler(controller.resendVerification),
);

/**
 * @route POST /auth/mot-de-passe/oubli
 * @desc Envoie un lien de réinitialisation. Réponse constante (anti-énumération).
 * @access Public
 * @returns 200 { message }
 */
authRouter.post(
  "/mot-de-passe/oubli",
  emailLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(controller.forgotPassword),
);

/**
 * @route POST /auth/mot-de-passe/reinitialisation
 * @desc Définit un nouveau mot de passe et révoque toutes les sessions.
 * @access Public (token à usage unique)
 * @returns 200 { message }
 */
authRouter.post(
  "/mot-de-passe/reinitialisation",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(controller.resetPassword),
);

/**
 * @route PATCH /auth/mot-de-passe
 * @desc Change le mot de passe depuis une session active.
 * @access Authentifié
 * @returns 200 { message }
 */
authRouter.patch(
  "/mot-de-passe",
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(controller.changePassword),
);

/**
 * @route GET /auth/moi
 * @desc Identité de la session courante.
 * @access Authentifié
 * @returns 200 UserDto
 */
authRouter.get("/moi", authenticate, asyncHandler(controller.me));
