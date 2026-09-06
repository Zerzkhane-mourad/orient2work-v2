import { Router } from "express";
import * as controller from "../controllers/entretien.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate } from "../middlewares/authenticate.js";
import { requireEntreprise, requireJeune } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createEntretienSchema,
  listEntretiensSchema,
  respondEntretienSchema,
  startQuizSchema,
  submitQuizSchema,
  updateEntretienSchema,
} from "../validators/entretien.validator.js";

export const entretienRouter = Router();

/**
 * @route GET /entretiens
 * @desc Entretiens de l'utilisateur connecté (périmètre déduit du rôle).
 * @access Authentifié
 */
entretienRouter.get(
  "/",
  authenticate,
  validate({ query: listEntretiensSchema }),
  asyncHandler(controller.list),
);

/**
 * @route GET /entretiens/compteurs
 * @desc Nombre d'entretiens par statut, sur la TOTALITÉ du périmètre de
 *       l'appelant. Alimente les cartes de synthèse pendant que chaque section
 *       est paginée séparément.
 * @access Authentifié
 */
entretienRouter.get("/compteurs", authenticate, asyncHandler(controller.countByStatus));

/**
 * @route POST /entretiens
 * @desc Propose un entretien à un candidat validé.
 * @access ENTREPRISE validée
 */
entretienRouter.post(
  "/",
  authenticate,
  requireEntreprise,
  validate({ body: createEntretienSchema }),
  asyncHandler(controller.create),
);

/**
 * @route POST /entretiens/:id/reponse
 * @desc Accepte ou refuse la proposition.
 * @access La partie qui n'a PAS pris l'initiative — le candidat sur un
 *         entretien proposé par l'entreprise, l'entreprise sur une candidature
 *         spontanée. Le service tranche : `requireJeune` ici aurait interdit à
 *         l'entreprise de traiter les demandes spontanées.
 */
entretienRouter.post(
  "/:id/reponse",
  authenticate,
  validate({ params: idParamSchema, body: respondEntretienSchema }),
  asyncHandler(controller.respond),
);

/**
 * @route PATCH /entretiens/:id
 * @desc Replanifie ou annule. Un changement de date remet le statut en attente.
 * @access ENTREPRISE organisatrice
 */
entretienRouter.patch(
  "/:id",
  authenticate,
  requireEntreprise,
  validate({ params: idParamSchema, body: updateEntretienSchema }),
  asyncHandler(controller.update),
);

// ── Test de validation général (§5.3) ────────────────────────────────────────

export const testRouter = Router();

/**
 * @route GET /test/questions
 * @desc Questions du test, SANS les bonnes réponses.
 * @access JEUNE
 */
testRouter.get(
  "/questions",
  authenticate,
  requireJeune,
  validate({ query: startQuizSchema }),
  asyncHandler(controller.getQuiz),
);

/**
 * @route POST /test/soumission
 * @desc Corrige le test côté serveur et met à jour le statut du compte.
 * @access JEUNE
 */
testRouter.post(
  "/soumission",
  authenticate,
  requireJeune,
  validate({ body: submitQuizSchema }),
  asyncHandler(controller.submitQuiz),
);

/**
 * @route GET /test/tentatives
 * @access JEUNE
 */
testRouter.get("/tentatives", authenticate, requireJeune, asyncHandler(controller.listAttempts));
