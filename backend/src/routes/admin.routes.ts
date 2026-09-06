/**
 * Routes d'administration.
 *
 * `authenticate` + `requireAdmin` sont appliqués une fois pour tout le routeur :
 * impossible d'ajouter par inadvertance une route admin non protégée.
 */
import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import * as contactController from "../controllers/contact.controller.js";
import * as faqController from "../controllers/faq.controller.js";
import * as jeuneController from "../controllers/jeune.controller.js";
import * as referentielController from "../controllers/referentiel.controller.js";
import * as entrepriseController from "../controllers/entreprise.controller.js";
import * as offreController from "../controllers/offre.controller.js";
import * as testController from "../controllers/test.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate } from "../middlewares/authenticate.js";
import { requireAdmin } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import { listJeunesSchema, updateJeuneStatusSchema } from "../validators/jeune.validator.js";
import {
  listEntreprisesSchema,
  updateEntrepriseStatusSchema,
} from "../validators/entreprise.validator.js";
import { listOffresSchema, moderateOffreSchema } from "../validators/offre.validator.js";
import {
  listContactMessagesSchema,
  updateContactMessageSchema,
} from "../validators/contact.validator.js";
import {
  createEntreeSchema,
  listEntreesSchema,
  moveEntreeSchema,
  referentielEntreeParamsSchema,
  referentielParamSchema,
  updateEntreeSchema,
} from "../validators/referentiel.validator.js";
import { createFaqSchema, moveFaqSchema, updateFaqSchema } from "../validators/faq.validator.js";
import {
  createTestQuestionSchema,
  createTestSchema,
  testQuestionParamsSchema,
  updateTestQuestionSchema,
  updateTestSchema,
} from "../validators/test.validator.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

/**
 * @route GET /admin/statistiques
 * @desc Agrégats du tableau de bord (§7.6).
 * @access ADMIN
 */
adminRouter.get("/statistiques", asyncHandler(adminController.stats));

/**
 * @route GET /admin/jeunes
 * @access ADMIN
 */
adminRouter.get(
  "/jeunes",
  validate({ query: listJeunesSchema }),
  asyncHandler(jeuneController.listForAdmin),
);

/**
 * @route PATCH /admin/jeunes/:id/statut
 * @desc Valide, suspend ou réinitialise le statut d'un compte jeune (§7.1).
 * @access ADMIN
 */
adminRouter.patch(
  "/jeunes/:id/statut",
  validate({ params: idParamSchema, body: updateJeuneStatusSchema }),
  asyncHandler(jeuneController.updateStatus),
);

/**
 * @route GET /admin/entreprises
 * @access ADMIN
 */
adminRouter.get(
  "/entreprises",
  validate({ query: listEntreprisesSchema }),
  asyncHandler(entrepriseController.listForAdmin),
);

/**
 * @route PATCH /admin/entreprises/:id/statut
 * @desc Validation OMB d'un compte entreprise (§7.2).
 * @access ADMIN
 */
adminRouter.patch(
  "/entreprises/:id/statut",
  validate({ params: idParamSchema, body: updateEntrepriseStatusSchema }),
  asyncHandler(entrepriseController.updateStatus),
);

/**
 * @route GET /admin/offres
 * @desc Toutes les offres, tous statuts — file de modération.
 * @access ADMIN
 */
adminRouter.get(
  "/offres",
  validate({ query: listOffresSchema }),
  asyncHandler(offreController.listForAdmin),
);

/**
 * @route PATCH /admin/offres/:id/moderation
 * @desc Publie, refuse ou désactive une offre (§7.3).
 * @access ADMIN
 */
adminRouter.patch(
  "/offres/:id/moderation",
  validate({ params: idParamSchema, body: moderateOffreSchema }),
  asyncHandler(offreController.moderate),
);

/**
 * @route POST /admin/offres/expiration
 * @desc Tâche de maintenance : passe en `expiree` les offres dépassées.
 * @access ADMIN
 */
adminRouter.post("/offres/expiration", asyncHandler(adminController.expireOffres));

// ── Référentiels (§7.4) ──────────────────────────────────────────────────────
//
// ── Questions fréquentes ────────────────────────────────────────────────────
// Une FAQ est du contenu de vitrine : la lecture est publique (montée dans le
// routeur racine), seules les écritures passent ici.

/**
 * @route GET /admin/faq
 * @desc Toutes les questions, masquées comprises, dans l'ordre d'affichage.
 * @access ADMIN
 */
adminRouter.get("/faq", asyncHandler(faqController.list));

/**
 * @route POST /admin/faq
 * @desc Ajoute une question, placée en fin de liste.
 * @access ADMIN
 */
adminRouter.post("/faq", validate({ body: createFaqSchema }), asyncHandler(faqController.create));

/**
 * @route PATCH /admin/faq/:id
 * @desc Modifie le libellé, la réponse ou la publication.
 * @access ADMIN
 */
adminRouter.patch(
  "/faq/:id",
  validate({ params: idParamSchema, body: updateFaqSchema }),
  asyncHandler(faqController.update),
);

/**
 * @route POST /admin/faq/:id/position
 * @desc Monte ou descend la question d'un cran et renvoie la liste réordonnée.
 *
 *       POST plutôt que PATCH : le corps décrit un MOUVEMENT, pas l'état visé.
 *       Rejouer un PATCH doit être sans effet ; rejouer un déplacement, non.
 * @access ADMIN
 */
adminRouter.post(
  "/faq/:id/position",
  validate({ params: idParamSchema, body: moveFaqSchema }),
  asyncHandler(faqController.move),
);

/**
 * @route DELETE /admin/faq/:id
 * @access ADMIN
 */
adminRouter.delete(
  "/faq/:id",
  validate({ params: idParamSchema }),
  asyncHandler(faqController.remove),
);

// Un seul jeu de routes pour tous les référentiels : `:referentiel` vaut
// `categories-formation` ou `filieres`. La validation du segment est faite par
// `referentielParamSchema`, adossé à la table des adaptateurs — une clé inconnue
// est rejetée en 422, elle n'atteint jamais le contrôleur.

/**
 * @route GET /admin/referentiels/:referentiel
 * @desc Entrées du référentiel, désactivées comprises avec `?inactives=true`.
 *       Chaque entrée porte son nombre d'enregistrements rattachés.
 * @access ADMIN
 */
adminRouter.get(
  "/referentiels/:referentiel",
  validate({ params: referentielParamSchema, query: listEntreesSchema }),
  asyncHandler(referentielController.list),
);

/**
 * @route POST /admin/referentiels/:referentiel
 * @desc Crée une entrée. Le nom est unique ; un doublon renvoie 409.
 * @access ADMIN
 */
adminRouter.post(
  "/referentiels/:referentiel",
  validate({ params: referentielParamSchema, body: createEntreeSchema }),
  asyncHandler(referentielController.create),
);

/**
 * @route PATCH /admin/referentiels/:referentiel/:id
 * @desc Renomme, réordonne ou (dés)active. Un renommage se propage aux
 *       enregistrements : ils pointent sur l'identifiant, pas sur le libellé.
 * @access ADMIN
 */
adminRouter.patch(
  "/referentiels/:referentiel/:id",
  validate({ params: referentielEntreeParamsSchema, body: updateEntreeSchema }),
  asyncHandler(referentielController.update),
);

/**
 * @route POST /admin/referentiels/:referentiel/:id/position
 * @desc Déplace l'entrée d'un cran vers le haut ou vers le bas.
 *
 *       Le calcul est fait côté serveur : le voisin peut se trouver sur une
 *       autre page, et l'ordre complet est réécrit en une transaction plutôt
 *       qu'échangé en deux requêtes séparables.
 * @access ADMIN
 */
adminRouter.post(
  "/referentiels/:referentiel/:id/position",
  validate({ params: referentielEntreeParamsSchema, body: moveEntreeSchema }),
  asyncHandler(referentielController.move),
);

/**
 * @route DELETE /admin/referentiels/:referentiel/:id
 * @desc Supprime une entrée INUTILISÉE. Si des enregistrements y sont rattachés,
 *       renvoie 409 : il faut la désactiver ou les déplacer d'abord.
 * @access ADMIN
 */
adminRouter.delete(
  "/referentiels/:referentiel/:id",
  validate({ params: referentielEntreeParamsSchema }),
  asyncHandler(referentielController.remove),
);

/**
 * @route GET /admin/contact
 * @desc Messages reçus depuis le formulaire de contact public.
 * @access ADMIN
 */
adminRouter.get(
  "/contact",
  validate({ query: listContactMessagesSchema }),
  asyncHandler(contactController.list),
);

/**
 * @route PATCH /admin/contact/:id
 * @desc Marque un message comme traité (ou le rouvre).
 * @access ADMIN
 */
adminRouter.patch(
  "/contact/:id",
  validate({ params: idParamSchema, body: updateContactMessageSchema }),
  asyncHandler(contactController.setTraite),
);

/**
 * @route GET /admin/newsletter
 * @desc Abonnés actifs à la newsletter.
 * @access ADMIN
 */
adminRouter.get("/newsletter", asyncHandler(contactController.listSubscriptions));

/*
 * Tests de validation des comptes (§5.3).
 *
 * Une question appartient toujours à un test — d'où des routes imbriquées et
 * non une banque de questions à plat. Un seul test par filière, plus un test
 * commun : le service refuse le second en 409.
 */

/**
 * @route GET /admin/tests
 * @desc Liste paginée des tests, avec leur filière et leur nombre de questions.
 * @access ADMIN
 */
adminRouter.get("/tests", asyncHandler(testController.list));

/**
 * @route GET /admin/tests/:id
 * @desc Un test avec ses questions — corrigé compris, et désactivées incluses :
 *       le back-office doit pouvoir relire et réactiver ce qui n'est plus servi.
 * @access ADMIN
 */
adminRouter.get(
  "/tests/:id",
  validate({ params: idParamSchema }),
  asyncHandler(testController.getOne),
);

/**
 * @route POST /admin/tests
 * @desc Crée un test, avec ses questions si elles sont fournies.
 * @access ADMIN
 */
adminRouter.post(
  "/tests",
  validate({ body: createTestSchema }),
  asyncHandler(testController.create),
);

/**
 * @route PATCH /admin/tests/:id
 * @desc Titre, consigne, filière ciblée, activation. `filiereId: null` rend le
 *       test commun.
 * @access ADMIN
 */
adminRouter.patch(
  "/tests/:id",
  validate({ params: idParamSchema, body: updateTestSchema }),
  asyncHandler(testController.update),
);

/**
 * @route DELETE /admin/tests/:id
 * @desc Supprime le test et ses questions.
 * @access ADMIN
 */
adminRouter.delete(
  "/tests/:id",
  validate({ params: idParamSchema }),
  asyncHandler(testController.remove),
);

/**
 * @route POST /admin/tests/:id/questions
 * @desc Ajoute une question au test. Les trois types sont acceptés.
 * @access ADMIN
 */
adminRouter.post(
  "/tests/:id/questions",
  validate({ params: idParamSchema, body: createTestQuestionSchema }),
  asyncHandler(testController.addQuestion),
);

/**
 * @route PATCH /admin/tests/:id/questions/:questionId
 * @desc Modifie une question. Elle doit appartenir à CE test, sinon 404.
 * @access ADMIN
 */
adminRouter.patch(
  "/tests/:id/questions/:questionId",
  validate({ params: testQuestionParamsSchema, body: updateTestQuestionSchema }),
  asyncHandler(testController.updateQuestion),
);

/**
 * @route DELETE /admin/tests/:id/questions/:questionId
 * @desc Retire une question. Refusé si le test tombait sous le minimum.
 * @access ADMIN
 */
adminRouter.delete(
  "/tests/:id/questions/:questionId",
  validate({ params: testQuestionParamsSchema }),
  asyncHandler(testController.removeQuestion),
);
