/**
 * Candidature spontanée (§10).
 *
 * Deux routeurs, montés à deux endroits :
 *  • `/entreprises/disponibilites` — la grille, réservée à son propriétaire ;
 *  • `/candidatures-spontanees` — ce que voit le jeune : entreprises ouvertes,
 *    créneaux libres, réservation.
 */
import { Router } from "express";
import * as controller from "../controllers/disponibilite.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate } from "../middlewares/authenticate.js";
import { requireEntreprise, requireJeune } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  listEntreprisesOuvertesSchema,
  reserverCreneauSchema,
  updateDisponibilitesSchema,
} from "../validators/disponibilite.validator.js";

export const disponibiliteRouter = Router();

/**
 * @route GET /entreprises/disponibilites
 * @desc Journées ouvertes et réglages de l'entreprise connectée.
 * @access Entreprise
 */
disponibiliteRouter.get(
  "/",
  authenticate,
  requireEntreprise,
  asyncHandler(controller.getReglages),
);

/**
 * @route PUT /entreprises/disponibilites
 * @desc Remplace les journées ouvertes et les réglages.
 * @access Entreprise
 */
disponibiliteRouter.put(
  "/",
  authenticate,
  requireEntreprise,
  validate({ body: updateDisponibilitesSchema }),
  asyncHandler(controller.updateReglages),
);

export const candidatureSpontaneeRouter = Router();

/**
 * @route GET /candidatures-spontanees/entreprises
 * @desc Entreprises ouvertes aux candidatures spontanées.
 * @access Jeune validé
 */
candidatureSpontaneeRouter.get(
  "/entreprises",
  authenticate,
  requireJeune,
  validate({ query: listEntreprisesOuvertesSchema }),
  asyncHandler(controller.listEntreprisesOuvertes),
);

/**
 * @route GET /candidatures-spontanees/entreprises/:id/creneaux
 * @desc Créneaux encore libres, calculés depuis les journées programmées.
 * @access Jeune validé
 */
candidatureSpontaneeRouter.get(
  "/entreprises/:id/creneaux",
  authenticate,
  requireJeune,
  validate({ params: idParamSchema }),
  asyncHandler(controller.getCalendrier),
);

/**
 * @route POST /candidatures-spontanees/entreprises/:id/reservation
 * @desc Réserve un créneau : crée la demande d'entretien spontanée.
 * @access Jeune validé
 */
candidatureSpontaneeRouter.post(
  "/entreprises/:id/reservation",
  authenticate,
  requireJeune,
  validate({ params: idParamSchema, body: reserverCreneauSchema }),
  asyncHandler(controller.reserverCreneau),
);
