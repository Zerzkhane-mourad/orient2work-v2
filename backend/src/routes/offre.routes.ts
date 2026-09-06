import { Router } from "express";
import * as controller from "../controllers/offre.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate.js";
import { requireEntreprise } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createOffreSchema,
  listOffresSchema,
  updateOffreSchema,
} from "../validators/offre.validator.js";

export const offreRouter = Router();

/**
 * @route GET /offres
 * @desc Recherche publique — n'expose que les offres publiées et non expirées.
 * @access Public
 */
offreRouter.get("/", validate({ query: listOffresSchema }), asyncHandler(controller.listPublic));

/**
 * @route GET /offres/mes-offres
 * @desc Offres de l'entreprise connectée, tous statuts (brouillons inclus).
 * @access ENTREPRISE (propriétaire)
 */
offreRouter.get(
  "/mes-offres",
  authenticate,
  requireEntreprise,
  validate({ query: listOffresSchema }),
  asyncHandler(controller.listMine),
);

/**
 * @route POST /offres
 * @desc Crée une offre. Une entreprise ne peut pas la publier directement (§7.3).
 * @access ENTREPRISE validée
 */
offreRouter.post(
  "/",
  authenticate,
  requireEntreprise,
  validate({ body: createOffreSchema }),
  asyncHandler(controller.create),
);

/**
 * @route GET /offres/:id
 * @access Public (offres publiées) / propriétaire et admin pour les autres
 */
offreRouter.get(
  "/:id",
  optionalAuthenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.getOne),
);

/**
 * @route PATCH /offres/:id
 * @desc Modifie une offre. Une modification de fond la repasse en validation.
 * @access ENTREPRISE (propriétaire)
 */
offreRouter.patch(
  "/:id",
  authenticate,
  requireEntreprise,
  validate({ params: idParamSchema, body: updateOffreSchema }),
  asyncHandler(controller.update),
);

/**
 * @route DELETE /offres/:id
 * @desc Désactive l'offre (les candidatures existantes sont préservées).
 * @access ENTREPRISE (propriétaire)
 */
offreRouter.delete(
  "/:id",
  authenticate,
  requireEntreprise,
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);
