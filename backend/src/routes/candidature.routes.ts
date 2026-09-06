import { Router } from "express";
import * as controller from "../controllers/candidature.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate, requireVerifiedEmail } from "../middlewares/authenticate.js";
import { requireEntreprise, requireJeune } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createCandidatureSchema,
  listCandidaturesSchema,
  updateCandidatureStatusSchema,
} from "../validators/candidature.validator.js";

export const candidatureRouter = Router();

/**
 * @route POST /candidatures
 * @desc Postule à une offre. Exige un profil validé et un email confirmé.
 * @access JEUNE validé
 */
candidatureRouter.post(
  "/",
  authenticate,
  requireVerifiedEmail,
  requireJeune,
  validate({ body: createCandidatureSchema }),
  asyncHandler(controller.apply),
);

/**
 * @route GET /candidatures/mes-candidatures
 * @access JEUNE (propriétaire)
 */
candidatureRouter.get(
  "/mes-candidatures",
  authenticate,
  requireJeune,
  validate({ query: listCandidaturesSchema }),
  asyncHandler(controller.listMine),
);

/**
 * @route GET /candidatures/mes-candidatures/compteurs
 * @desc Nombre de candidatures par statut, sur la TOTALITÉ du périmètre.
 *
 *       Sert les onglets de « Mes candidatures » : la liste étant paginée côté
 *       serveur, les totaux ne peuvent plus être déduits de la page affichée.
 * @access JEUNE (propriétaire)
 */
candidatureRouter.get(
  "/mes-candidatures/compteurs",
  authenticate,
  requireJeune,
  asyncHandler(controller.countMine),
);

/**
 * @route GET /candidatures/recues
 * @desc Candidatures reçues sur les offres de l'entreprise connectée.
 * @access ENTREPRISE (propriétaire des offres)
 */
candidatureRouter.get(
  "/recues",
  authenticate,
  requireEntreprise,
  validate({ query: listCandidaturesSchema }),
  asyncHandler(controller.listReceived),
);

/**
 * @route GET /candidatures/:id
 * @desc Détail. Le jeune voit sa vue, l'entreprise la vue recruteur.
 * @access JEUNE candidat ou ENTREPRISE propriétaire de l'offre
 */
candidatureRouter.get(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.getOne),
);

/**
 * @route PATCH /candidatures/:id/statut
 * @desc Fait évoluer le statut (vue, présélectionnée, entretien, acceptée, refusée).
 * @access ENTREPRISE propriétaire de l'offre
 */
candidatureRouter.patch(
  "/:id/statut",
  authenticate,
  requireEntreprise,
  validate({ params: idParamSchema, body: updateCandidatureStatusSchema }),
  asyncHandler(controller.updateStatus),
);

/**
 * @route POST /candidatures/:id/retrait
 * @desc Retire sa candidature — seule transition contrôlée par le jeune.
 * @access JEUNE candidat
 */
candidatureRouter.post(
  "/:id/retrait",
  authenticate,
  requireJeune,
  validate({ params: idParamSchema }),
  asyncHandler(controller.withdraw),
);
