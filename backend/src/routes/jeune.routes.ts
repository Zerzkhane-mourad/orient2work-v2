import { Router } from "express";
import * as controller from "../controllers/jeune.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate.js";
import { requireEntreprise, requireJeune } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  experienceSchema,
  lienSchema,
  nestedIdParamsSchema,
  searchTalentsSchema,
  updateExperienceSchema,
  updateJeuneSchema,
} from "../validators/jeune.validator.js";

export const jeuneRouter = Router();

/**
 * @route GET /jeunes/moi
 * @desc Profil complet du jeune connecté (avec score et complétion dérivés).
 * @access JEUNE
 */
jeuneRouter.get("/moi", authenticate, requireJeune, asyncHandler(controller.getMe));

/**
 * @route PATCH /jeunes/moi
 * @desc Met à jour le profil. `status` et `scoreQuiz` ne sont pas modifiables ici.
 * @access JEUNE (propriétaire)
 */
jeuneRouter.patch(
  "/moi",
  authenticate,
  requireJeune,
  validate({ body: updateJeuneSchema }),
  asyncHandler(controller.updateMe),
);

/**
 * @route POST /jeunes/moi/experiences
 * @access JEUNE (propriétaire)
 */
jeuneRouter.post(
  "/moi/experiences",
  authenticate,
  requireJeune,
  validate({ body: experienceSchema }),
  asyncHandler(controller.addExperience),
);

/**
 * @route PATCH /jeunes/moi/experiences/:itemId
 * @access JEUNE (propriétaire)
 */
jeuneRouter.patch(
  "/moi/experiences/:itemId",
  authenticate,
  requireJeune,
  validate({ params: nestedIdParamsSchema.pick({ itemId: true }), body: updateExperienceSchema }),
  asyncHandler(controller.updateExperience),
);

/**
 * @route DELETE /jeunes/moi/experiences/:itemId
 * @access JEUNE (propriétaire)
 */
jeuneRouter.delete(
  "/moi/experiences/:itemId",
  authenticate,
  requireJeune,
  validate({ params: nestedIdParamsSchema.pick({ itemId: true }) }),
  asyncHandler(controller.removeExperience),
);

/**
 * @route POST /jeunes/moi/liens
 * @access JEUNE (propriétaire)
 */
jeuneRouter.post(
  "/moi/liens",
  authenticate,
  requireJeune,
  validate({ body: lienSchema }),
  asyncHandler(controller.addLien),
);

/**
 * @route DELETE /jeunes/moi/liens/:itemId
 * @access JEUNE (propriétaire)
 */
jeuneRouter.delete(
  "/moi/liens/:itemId",
  authenticate,
  requireJeune,
  validate({ params: nestedIdParamsSchema.pick({ itemId: true }) }),
  asyncHandler(controller.removeLien),
);

/**
 * @route GET /jeunes/talents
 * @desc Moteur de recherche de talents (profils validés, vue publique).
 * @access ENTREPRISE validée
 */
jeuneRouter.get(
  "/talents",
  authenticate,
  requireEntreprise,
  validate({ query: searchTalentsSchema }),
  asyncHandler(controller.searchTalents),
);

/**
 * @route GET /jeunes/:id
 * @desc Profil d'un jeune. Vue publique pour un tiers, complète pour le propriétaire.
 * @access Public (profils validés uniquement)
 */
jeuneRouter.get(
  "/:id",
  optionalAuthenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.getOne),
);
