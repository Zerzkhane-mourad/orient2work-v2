/**
 * Routes d'authentification.
 *
 * `authLimiter` couvre toutes les routes exposées au bruteforce (connexion,
 * inscription, reset). `verifyCsrf` protège les deux seules routes qui
 * s'authentifient par cookie plutôt que par en-tête Bearer.
 */
import { DocumentType } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import * as controller from "../controllers/auth.controller.js";
import { asyncHandler } from "../lib/http.js";
import { normalizeMulterError, removeStoredFile, uploadSingle } from "../lib/upload.js";
import { authenticate } from "../middlewares/authenticate.js";
import { verifyCsrf } from "../middlewares/csrf.js";
import { authLimiter, emailLimiter, refreshLimiter } from "../middlewares/rate-limit.js";
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
 * Lecture du logo joint au formulaire d'inscription entreprise.
 *
 * Posé AVANT `validate` : sans lui, `req.body` reste vide sur une requête
 * `multipart/form-data` et la validation échouerait sur tous les champs à la
 * fois. Les erreurs multer sont traduites ici même, pour ne pas remonter telles
 * quelles au client.
 *
 * `maxFields` couvre les douze champs du schéma, avec un peu de marge.
 */
const lireLogoInscription = (req: Request, res: Response, next: NextFunction): void => {
  uploadSingle(DocumentType.LOGO, "logo", 20)(req, res, (error: unknown) => {
    if (error) {
      next(normalizeMulterError(error));
      return;
    }

    /*
     * Multer écrit le fichier sur le disque AVANT que la validation ne s'exécute :
     * une inscription refusée ensuite — champ invalide, mot de passe trop court,
     * erreur serveur — laisserait donc un logo orphelin à chaque tentative. Sur
     * une route publique, c'est un remplissage de disque à coût nul pour
     * l'attaquant.
     *
     * Le ménage se fait à la fin de la réponse plutôt que dans chaque branche :
     * c'est le seul endroit qui voit TOUTES les sorties, y compris celles du
     * gestionnaire d'erreurs. Seul un 201 — compte réellement créé — conserve le
     * fichier ; le service supprime lui-même le sien dans le cas anti-énumération,
     * qui répond 201 sans rien créer.
     */
    res.on("finish", () => {
      if (req.file && res.statusCode !== 201) {
        void removeStoredFile(req.file.filename);
      }
    });
    next();
  });
};

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
 *       Corps en `multipart/form-data` : le logo (champ `logo`) est OBLIGATOIRE
 *       et devient à la fois l'image du compte et la source de son thème.
 * @access Public
 * @returns 201 { message }
 */
authRouter.post(
  "/inscription/entreprise",
  // `authLimiter` en premier : il plafonne les tentatives AVANT que multer
  // n'écrive quoi que ce soit sur le disque. Cette route accepte un fichier
  // sans authentification, c'est donc lui seul qui la protège du remplissage.
  authLimiter,
  lireLogoInscription,
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
authRouter.post("/refresh", refreshLimiter, verifyCsrf, asyncHandler(controller.refresh));

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
