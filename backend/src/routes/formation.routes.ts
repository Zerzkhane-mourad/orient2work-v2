import { Router, type NextFunction, type Request, type Response } from "express";
import { DocumentType } from "@prisma/client";
import { normalizeMulterError, uploadSingle } from "../lib/upload.js";
import * as controller from "../controllers/formation.controller.js";
import * as formationService from "../services/formation.service.js";
import { asyncHandler, sendSuccess } from "../lib/http.js";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate.js";
import { requireAdmin, requireJeune } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import { nestedIdParamsSchema } from "../validators/jeune.validator.js";
import {
  createAvisSchema,
  createFormationSchema,
  listFormationsSchema,
  quizQuestionParamsSchema,
  quizQuestionSchema,
  submitFormationQuizSchema,
  updateFormationQuizSchema,
  updateFormationSchema,
  updateProgressionSchema,
  updateQuizQuestionSchema,
} from "../validators/formation.validator.js";

export const formationRouter = Router();

/**
 * Middleware multer pour la couverture d'une formation.
 *
 * Le type est fixé ici (`FORMATION`), pas lu dans l'URL : cette route ne reçoit
 * que des images de couverture, et le jeu d'extensions autorisées en découle.
 */
function uploadCouverture(req: Request, res: Response, next: NextFunction): void {
  uploadSingle(DocumentType.FORMATION)(req, res, (error: unknown) => {
    next(error ? normalizeMulterError(error) : undefined);
  });
}


/**
 * @route GET /formations
 * @desc Catalogue. Enrichi de la progression si un jeune est connecté.
 * @access Public
 */
formationRouter.get(
  "/",
  optionalAuthenticate,
  validate({ query: listFormationsSchema }),
  asyncHandler(controller.list),
);


/**
 * @route GET /formations/temoignages
 * @desc Avis récents, pour la preuve sociale de la page d'accueil.
 *
 *       Public comme le catalogue : ces avis sont déjà lisibles sur la fiche de
 *       chaque formation. L'auteur reste réduit au prénom et à l'initiale.
 *
 *       Déclarée AVANT « /:id » : « temoignages » serait sinon pris pour un
 *       identifiant de formation.
 * @access Public
 */
formationRouter.get(
  "/temoignages",
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await formationService.listTemoignages(3));
  }),
);

/**
 * @route GET /formations/medias/:id
 * @desc Illustration insérée dans le corps d'un cours.
 *
 *       Déclarée AVANT « /:id/image » : les deux chemins font deux segments, et
 *       l'ordre lève toute ambiguïté si l'un d'eux évolue.
 * @access Public
 */
formationRouter.get(
  "/medias/:id",
  validate({ params: idParamSchema }),
  asyncHandler(controller.getMedia),
);

/**
 * @route POST /formations/medias
 * @desc Téléverse une illustration de cours et renvoie son URL.
 *
 *       Séparée de la couverture : celle-ci est unique et rattachée à une
 *       formation, alors qu'un cours porte autant d'illustrations que de
 *       chapitres — et qu'on en téléverse avant même que la formation existe.
 * @access ADMIN
 */
formationRouter.post(
  "/medias",
  authenticate,
  requireAdmin,
  uploadCouverture,
  asyncHandler(controller.uploadMedia),
);

/**
 * @route GET /formations/:id/image
 * @desc Couverture de la formation.
 *
 *       SEULE route de média publique de l'API : une couverture de cours
 *       s'affiche dans le catalogue ouvert aux visiteurs anonymes. Les
 *       brouillons restent invisibles — sauf pour un administrateur, d'où
 *       l'authentification facultative.
 * @access Public
 */
formationRouter.get(
  "/:id/image",
  optionalAuthenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.getImage),
);

/**
 * @route POST /formations/:id/image
 * @desc Téléverse ou remplace la couverture. Type MIME, extension, signature
 *       binaire et taille sont vérifiés ; l'ancien fichier est effacé.
 * @access ADMIN
 */
formationRouter.post(
  "/:id/image",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema }),
  uploadCouverture,
  asyncHandler(controller.uploadImage),
);

/**
 * @route POST /formations
 * @desc Crée une formation (contenu HTML assaini) et son quiz.
 * @access ADMIN
 */
formationRouter.post(
  "/",
  authenticate,
  requireAdmin,
  validate({ body: createFormationSchema }),
  asyncHandler(controller.create),
);


/*
 * Quiz d'une formation — édition question par question.
 *
 * `PATCH /formations/:id` réécrit le quiz EN BLOC (import, duplication) ; ces
 * routes-ci servent l'édition au fil de l'eau depuis le back-office : ajouter
 * une question ne réécrit pas les autres et ne leur fait pas perdre leur
 * identifiant, auquel les tentatives déjà passées font référence.
 *
 * Le quiz est créé au besoin : ajouter une première question n'impose pas une
 * étape préalable.
 */

/**
 * @route PATCH /formations/:id/quiz
 * @desc Titre, consigne et score minimum du quiz.
 * @access ADMIN
 */
formationRouter.patch(
  "/:id/quiz",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema, body: updateFormationQuizSchema }),
  asyncHandler(controller.updateQuizMeta),
);

/**
 * @route DELETE /formations/:id/quiz
 * @desc Supprime le quiz entier ; la formation se valide alors à la lecture.
 *       Seule façon d'enlever un quiz : le vider question par question
 *       laisserait, à l'avant-dernière, un quiz qui ne note plus rien.
 * @access ADMIN
 */
formationRouter.delete(
  "/:id/quiz",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema }),
  asyncHandler(controller.removeQuiz),
);

/**
 * @route POST /formations/:id/quiz/questions
 * @desc Ajoute une question. Les trois types sont acceptés ; la cohérence entre
 *       type, options et bonnes réponses est vérifiée côté service.
 * @access ADMIN
 */
formationRouter.post(
  "/:id/quiz/questions",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema, body: quizQuestionSchema }),
  asyncHandler(controller.addQuizQuestion),
);

/**
 * @route PATCH /formations/:id/quiz/questions/:questionId
 * @desc Modifie une question. La question doit appartenir au quiz de CETTE
 *       formation, sinon 404.
 * @access ADMIN
 */
formationRouter.patch(
  "/:id/quiz/questions/:questionId",
  authenticate,
  requireAdmin,
  validate({ params: quizQuestionParamsSchema, body: updateQuizQuestionSchema }),
  asyncHandler(controller.updateQuizQuestion),
);

/**
 * @route DELETE /formations/:id/quiz/questions/:questionId
 * @access ADMIN
 */
formationRouter.delete(
  "/:id/quiz/questions/:questionId",
  authenticate,
  requireAdmin,
  validate({ params: quizQuestionParamsSchema }),
  asyncHandler(controller.removeQuizQuestion),
);

/**
 * @route GET /formations/:id
 * @desc Cours complet. Les bonnes réponses du quiz ne sont renvoyées qu'à un admin.
 * @access Public (formations publiées)
 */
formationRouter.get(
  "/:id",
  optionalAuthenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.getOne),
);

/**
 * @route PATCH /formations/:id
 * @access ADMIN
 */
formationRouter.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema, body: updateFormationSchema }),
  asyncHandler(controller.update),
);

/**
 * @route DELETE /formations/:id
 * @access ADMIN
 */
formationRouter.delete(
  "/:id",
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);

/**
 * @route PUT /formations/:id/progression
 * @desc Enregistre l'avancement de lecture (monotone : ne redescend jamais).
 * @access JEUNE
 */
formationRouter.put(
  "/:id/progression",
  authenticate,
  requireJeune,
  validate({ params: idParamSchema, body: updateProgressionSchema }),
  asyncHandler(controller.updateProgression),
);

/**
 * @route POST /formations/:id/quiz
 * @desc Soumet le quiz. La correction est calculée côté serveur uniquement.
 * @access JEUNE ayant terminé la lecture
 */
formationRouter.post(
  "/:id/quiz",
  authenticate,
  requireJeune,
  validate({ params: idParamSchema, body: submitFormationQuizSchema }),
  asyncHandler(controller.submitQuiz),
);

/**
 * @route GET /formations/:id/avis
 * @desc Avis paginés + `mesVotes` (avis déjà marqués utiles par le lecteur).
 * @access Public
 */
formationRouter.get(
  "/:id/avis",
  optionalAuthenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.listAvis),
);

/**
 * @route POST /formations/:id/avis/:itemId/utile
 * @desc Bascule le vote « utile ». Un vote par jeune et par avis ; voter pour
 *       son propre avis est refusé.
 * @access JEUNE
 */
formationRouter.post(
  "/:id/avis/:itemId/utile",
  authenticate,
  requireJeune,
  validate({ params: nestedIdParamsSchema }),
  asyncHandler(controller.toggleAvisUtile),
);

/**
 * @route PUT /formations/:id/avis
 * @desc Dépose ou met à jour son avis (un seul par jeune et par formation).
 * @access JEUNE ayant terminé la formation
 */
formationRouter.put(
  "/:id/avis",
  authenticate,
  requireJeune,
  validate({ params: idParamSchema, body: createAvisSchema }),
  asyncHandler(controller.upsertAvis),
);

/**
 * @route DELETE /formations/:id/avis/:itemId
 * @access Auteur de l'avis ou ADMIN
 */
formationRouter.delete(
  "/:id/avis/:itemId",
  authenticate,
  validate({ params: nestedIdParamsSchema }),
  asyncHandler(controller.removeAvis),
);
