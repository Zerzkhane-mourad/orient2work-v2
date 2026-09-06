import { Router } from "express";
import * as controller from "../controllers/entreprise.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate.js";
import { requireEntreprise } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  listEntreprisesSchema,
  updateEntrepriseSchema,
} from "../validators/entreprise.validator.js";

export const entrepriseRouter = Router();

/**
 * @route GET /entreprises
 * @desc Annuaire public des entreprises validées.
 * @access Public
 */
entrepriseRouter.get(
  "/",
  validate({ query: listEntreprisesSchema }),
  asyncHandler(controller.listPublic),
);

/**
 * @route GET /entreprises/moi
 * @access ENTREPRISE
 */
entrepriseRouter.get("/moi", authenticate, requireEntreprise, asyncHandler(controller.getMe));

/**
 * @route PATCH /entreprises/moi
 * @desc Met à jour le profil. Le `status` reste une décision admin.
 * @access ENTREPRISE (propriétaire)
 */
entrepriseRouter.patch(
  "/moi",
  authenticate,
  requireEntreprise,
  validate({ body: updateEntrepriseSchema }),
  asyncHandler(controller.updateMe),
);

/**
 * @route GET /entreprises/:id
 * @access Public (entreprises validées uniquement)
 */
entrepriseRouter.get(
  "/:id",
  optionalAuthenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.getOne),
);
