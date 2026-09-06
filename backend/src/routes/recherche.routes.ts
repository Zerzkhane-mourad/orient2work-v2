/** Recherche globale de l'Espace Jeune (§5). */
import { Router } from "express";
import { asyncHandler, sendSuccess } from "../lib/http.js";
import { authenticate } from "../middlewares/authenticate.js";
import { query, validate } from "../middlewares/validate.js";
import * as rechercheService from "../services/recherche.service.js";
import { rechercheSchema, type RechercheInput } from "../validators/recherche.validator.js";

export const rechercheRouter = Router();

/**
 * @route GET /recherche
 * @desc Offres, formations et entreprises correspondant à un terme, groupées.
 *
 *       Un seul appel là où le navigateur en aurait fait trois par frappe, et
 *       surtout : c'est le SERVEUR qui décide de ce qui est visible — offres
 *       publiées et ouvertes, formations publiées, entreprises validées et
 *       recevant des candidatures spontanées.
 * @access Authentifié
 */
rechercheRouter.get(
  "/",
  authenticate,
  validate({ query: rechercheSchema }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await rechercheService.rechercher(query<RechercheInput>(req)));
  }),
);
