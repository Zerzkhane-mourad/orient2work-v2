/**
 * Routes d'administration.
 *
 * `authenticate` + `requireAdmin` sont appliqués une fois pour tout le routeur :
 * impossible d'ajouter par inadvertance une route admin non protégée.
 *
 * S'y ajoute, route par route, `requirePermission(...)` : `requireAdmin` dit
 * qu'on est dans le back-office, la permission dit ce qu'on y fait. Les deux
 * sont nécessaires — le premier ferme la porte aux jeunes et aux entreprises,
 * la seconde répartit les clés entre administrateurs.
 *
 * Le catalogue des permissions vit dans `src/domain/permissions.ts` ; toute
 * nouvelle route admin doit en exiger une, faute de quoi elle serait ouverte à
 * n'importe quel administrateur, y compris au rôle le plus restreint.
 */
import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import * as contactController from "../controllers/contact.controller.js";
import * as faqController from "../controllers/faq.controller.js";
import * as jeuneController from "../controllers/jeune.controller.js";
import * as referentielController from "../controllers/referentiel.controller.js";
import * as entrepriseController from "../controllers/entreprise.controller.js";
import * as offreController from "../controllers/offre.controller.js";
import * as roleController from "../controllers/role-admin.controller.js";
import * as testController from "../controllers/test.controller.js";
import * as utilisateurController from "../controllers/utilisateur.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate } from "../middlewares/authenticate.js";
import { requireAdmin, requirePermission } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createRoleSchema,
  listRolesSchema,
  updateRoleSchema,
} from "../validators/role-admin.validator.js";
import {
  createUtilisateurSchema,
  listUtilisateursSchema,
  resetUtilisateurPasswordSchema,
  updateUtilisateurSchema,
} from "../validators/utilisateur.validator.js";
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
adminRouter.get(
  "/statistiques",
  requirePermission("statistiques:read"),
  asyncHandler(adminController.stats),
);

/**
 * @route GET /admin/jeunes
 * @access ADMIN + `jeunes:read`
 */
adminRouter.get(
  "/jeunes",
  requirePermission("jeunes:read"),
  validate({ query: listJeunesSchema }),
  asyncHandler(jeuneController.listForAdmin),
);

/**
 * @route PATCH /admin/jeunes/:id/statut
 * @desc Valide, suspend ou réinitialise le statut d'un compte jeune (§7.1).
 * @access ADMIN + `jeunes:write`
 */
adminRouter.patch(
  "/jeunes/:id/statut",
  requirePermission("jeunes:write"),
  validate({ params: idParamSchema, body: updateJeuneStatusSchema }),
  asyncHandler(jeuneController.updateStatus),
);

/**
 * @route GET /admin/entreprises
 * @access ADMIN + `entreprises:read`
 */
adminRouter.get(
  "/entreprises",
  requirePermission("entreprises:read"),
  validate({ query: listEntreprisesSchema }),
  asyncHandler(entrepriseController.listForAdmin),
);

/**
 * @route PATCH /admin/entreprises/:id/statut
 * @desc Validation OMB d'un compte entreprise (§7.2).
 * @access ADMIN + `entreprises:write`
 */
adminRouter.patch(
  "/entreprises/:id/statut",
  requirePermission("entreprises:write"),
  validate({ params: idParamSchema, body: updateEntrepriseStatusSchema }),
  asyncHandler(entrepriseController.updateStatus),
);

/**
 * @route GET /admin/offres
 * @desc Toutes les offres, tous statuts — file de modération.
 * @access ADMIN + `offres:read`
 */
adminRouter.get(
  "/offres",
  requirePermission("offres:read"),
  validate({ query: listOffresSchema }),
  asyncHandler(offreController.listForAdmin),
);

/**
 * @route PATCH /admin/offres/:id/moderation
 * @desc Publie, refuse ou désactive une offre (§7.3).
 * @access ADMIN + `offres:write`
 */
adminRouter.patch(
  "/offres/:id/moderation",
  requirePermission("offres:write"),
  validate({ params: idParamSchema, body: moderateOffreSchema }),
  asyncHandler(offreController.moderate),
);

/**
 * @route POST /admin/offres/expiration
 * @desc Tâche de maintenance : passe en `expiree` les offres dépassées.
 * @access ADMIN + `offres:write`
 */
adminRouter.post(
  "/offres/expiration",
  requirePermission("offres:write"),
  asyncHandler(adminController.expireOffres),
);

// ── Référentiels (§7.4) ──────────────────────────────────────────────────────
//
// ── Questions fréquentes ────────────────────────────────────────────────────
// Une FAQ est du contenu de vitrine : la lecture est publique (montée dans le
// routeur racine), seules les écritures passent ici.

/**
 * @route GET /admin/faq
 * @desc Toutes les questions, masquées comprises, dans l'ordre d'affichage.
 * @access ADMIN + `faq:read`
 */
adminRouter.get("/faq", requirePermission("faq:read"), asyncHandler(faqController.list));

/**
 * @route POST /admin/faq
 * @desc Ajoute une question, placée en fin de liste.
 * @access ADMIN + `faq:write`
 */
adminRouter.post(
  "/faq",
  requirePermission("faq:write"),
  validate({ body: createFaqSchema }),
  asyncHandler(faqController.create),
);

/**
 * @route PATCH /admin/faq/:id
 * @desc Modifie le libellé, la réponse ou la publication.
 * @access ADMIN + `faq:write`
 */
adminRouter.patch(
  "/faq/:id",
  requirePermission("faq:write"),
  validate({ params: idParamSchema, body: updateFaqSchema }),
  asyncHandler(faqController.update),
);

/**
 * @route POST /admin/faq/:id/position
 * @desc Monte ou descend la question d'un cran et renvoie la liste réordonnée.
 *
 *       POST plutôt que PATCH : le corps décrit un MOUVEMENT, pas l'état visé.
 *       Rejouer un PATCH doit être sans effet ; rejouer un déplacement, non.
 * @access ADMIN + `faq:write`
 */
adminRouter.post(
  "/faq/:id/position",
  requirePermission("faq:write"),
  validate({ params: idParamSchema, body: moveFaqSchema }),
  asyncHandler(faqController.move),
);

/**
 * @route DELETE /admin/faq/:id
 * @access ADMIN + `faq:write`
 */
adminRouter.delete(
  "/faq/:id",
  requirePermission("faq:write"),
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
 * @access ADMIN + `referentiels:read`
 */
adminRouter.get(
  "/referentiels/:referentiel",
  requirePermission("referentiels:read"),
  validate({ params: referentielParamSchema, query: listEntreesSchema }),
  asyncHandler(referentielController.list),
);

/**
 * @route POST /admin/referentiels/:referentiel
 * @desc Crée une entrée. Le nom est unique ; un doublon renvoie 409.
 * @access ADMIN + `referentiels:write`
 */
adminRouter.post(
  "/referentiels/:referentiel",
  requirePermission("referentiels:write"),
  validate({ params: referentielParamSchema, body: createEntreeSchema }),
  asyncHandler(referentielController.create),
);

/**
 * @route PATCH /admin/referentiels/:referentiel/:id
 * @desc Renomme, réordonne ou (dés)active. Un renommage se propage aux
 *       enregistrements : ils pointent sur l'identifiant, pas sur le libellé.
 * @access ADMIN + `referentiels:write`
 */
adminRouter.patch(
  "/referentiels/:referentiel/:id",
  requirePermission("referentiels:write"),
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
 * @access ADMIN + `referentiels:write`
 */
adminRouter.post(
  "/referentiels/:referentiel/:id/position",
  requirePermission("referentiels:write"),
  validate({ params: referentielEntreeParamsSchema, body: moveEntreeSchema }),
  asyncHandler(referentielController.move),
);

/**
 * @route DELETE /admin/referentiels/:referentiel/:id
 * @desc Supprime une entrée INUTILISÉE. Si des enregistrements y sont rattachés,
 *       renvoie 409 : il faut la désactiver ou les déplacer d'abord.
 * @access ADMIN + `referentiels:write`
 */
adminRouter.delete(
  "/referentiels/:referentiel/:id",
  requirePermission("referentiels:write"),
  validate({ params: referentielEntreeParamsSchema }),
  asyncHandler(referentielController.remove),
);

/**
 * @route GET /admin/contact
 * @desc Messages reçus depuis le formulaire de contact public.
 * @access ADMIN + `messages:read`
 */
adminRouter.get(
  "/contact",
  requirePermission("messages:read"),
  validate({ query: listContactMessagesSchema }),
  asyncHandler(contactController.list),
);

/**
 * @route PATCH /admin/contact/:id
 * @desc Marque un message comme traité (ou le rouvre).
 * @access ADMIN + `messages:write`
 */
adminRouter.patch(
  "/contact/:id",
  requirePermission("messages:write"),
  validate({ params: idParamSchema, body: updateContactMessageSchema }),
  asyncHandler(contactController.setTraite),
);

/**
 * @route GET /admin/newsletter
 * @desc Abonnés actifs à la newsletter.
 * @access ADMIN + `messages:read`
 */
adminRouter.get(
  "/newsletter",
  requirePermission("messages:read"),
  asyncHandler(contactController.listSubscriptions),
);

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
 * @access ADMIN + `tests:read`
 */
adminRouter.get("/tests", requirePermission("tests:read"), asyncHandler(testController.list));

/**
 * @route GET /admin/tests/:id
 * @desc Un test avec ses questions — corrigé compris, et désactivées incluses :
 *       le back-office doit pouvoir relire et réactiver ce qui n'est plus servi.
 * @access ADMIN + `tests:read`
 */
adminRouter.get(
  "/tests/:id",
  requirePermission("tests:read"),
  validate({ params: idParamSchema }),
  asyncHandler(testController.getOne),
);

/**
 * @route POST /admin/tests
 * @desc Crée un test, avec ses questions si elles sont fournies.
 * @access ADMIN + `tests:write`
 */
adminRouter.post(
  "/tests",
  requirePermission("tests:write"),
  validate({ body: createTestSchema }),
  asyncHandler(testController.create),
);

/**
 * @route PATCH /admin/tests/:id
 * @desc Titre, consigne, filière ciblée, activation. `filiereId: null` rend le
 *       test commun.
 * @access ADMIN + `tests:write`
 */
adminRouter.patch(
  "/tests/:id",
  requirePermission("tests:write"),
  validate({ params: idParamSchema, body: updateTestSchema }),
  asyncHandler(testController.update),
);

/**
 * @route DELETE /admin/tests/:id
 * @desc Supprime le test et ses questions.
 * @access ADMIN + `tests:write`
 */
adminRouter.delete(
  "/tests/:id",
  requirePermission("tests:write"),
  validate({ params: idParamSchema }),
  asyncHandler(testController.remove),
);

/**
 * @route POST /admin/tests/:id/questions
 * @desc Ajoute une question au test. Les trois types sont acceptés.
 * @access ADMIN + `tests:write`
 */
adminRouter.post(
  "/tests/:id/questions",
  requirePermission("tests:write"),
  validate({ params: idParamSchema, body: createTestQuestionSchema }),
  asyncHandler(testController.addQuestion),
);

/**
 * @route PATCH /admin/tests/:id/questions/:questionId
 * @desc Modifie une question. Elle doit appartenir à CE test, sinon 404.
 * @access ADMIN + `tests:write`
 */
adminRouter.patch(
  "/tests/:id/questions/:questionId",
  requirePermission("tests:write"),
  validate({ params: testQuestionParamsSchema, body: updateTestQuestionSchema }),
  asyncHandler(testController.updateQuestion),
);

/**
 * @route DELETE /admin/tests/:id/questions/:questionId
 * @desc Retire une question. Refusé si le test tombait sous le minimum.
 * @access ADMIN + `tests:write`
 */
adminRouter.delete(
  "/tests/:id/questions/:questionId",
  requirePermission("tests:write"),
  validate({ params: testQuestionParamsSchema }),
  asyncHandler(testController.removeQuestion),
);

/*
 * Gouvernance du back-office : rôles et comptes d'administration.
 *
 * Deux écrans, deux permissions distinctes. `roles:write` est la plus sensible
 * de la plateforme — elle permet de s'octroyer n'importe quelle autre —, d'où
 * une séparation nette d'avec `utilisateurs:write`, qui ne fait qu'attribuer un
 * rôle EXISTANT. On peut ainsi confier l'annuaire à un responsable RH sans lui
 * confier la définition des droits.
 */

/**
 * @route GET /admin/permissions
 * @desc Catalogue des permissions, groupé par domaine — source de la matrice
 *       de cases à cocher du back-office.
 *
 *       `roles:read` et non `roles:write` : l'écran de consultation des rôles a
 *       besoin des libellés pour afficher ce qu'un rôle recouvre.
 * @access ADMIN + `roles:read`
 */
adminRouter.get("/permissions", requirePermission("roles:read"), roleController.permissions);

/**
 * @route GET /admin/roles
 * @desc Rôles d'administration, avec leurs permissions effectives et le nombre
 *       de comptes rattachés.
 * @access ADMIN + `roles:read`
 */
adminRouter.get(
  "/roles",
  requirePermission("roles:read"),
  validate({ query: listRolesSchema }),
  asyncHandler(roleController.list),
);

/**
 * @route GET /admin/roles/:id
 * @access ADMIN + `roles:read`
 */
adminRouter.get(
  "/roles/:id",
  requirePermission("roles:read"),
  validate({ params: idParamSchema }),
  asyncHandler(roleController.getOne),
);

/**
 * @route POST /admin/roles
 * @desc Crée un rôle. Le nom est unique ; un doublon renvoie 409. Les codes de
 *       permission sont validés contre le catalogue — un code inventé part en 422.
 * @access ADMIN + `roles:write`
 */
adminRouter.post(
  "/roles",
  requirePermission("roles:write"),
  validate({ body: createRoleSchema }),
  asyncHandler(roleController.create),
);

/**
 * @route PATCH /admin/roles/:id
 * @desc Renomme, redocumente ou redéfinit les permissions. Le nouveau jeu
 *       REMPLACE l'ancien : l'écran envoie l'état des cases, pas un delta.
 *       Les permissions du rôle système sont refusées en 403.
 * @access ADMIN + `roles:write`
 */
adminRouter.patch(
  "/roles/:id",
  requirePermission("roles:write"),
  validate({ params: idParamSchema, body: updateRoleSchema }),
  asyncHandler(roleController.update),
);

/**
 * @route DELETE /admin/roles/:id
 * @desc Supprime un rôle INUTILISÉ. S'il est encore attribué, renvoie 409 :
 *       réaffecter les comptes est une décision, pas un effet de bord.
 * @access ADMIN + `roles:write`
 */
adminRouter.delete(
  "/roles/:id",
  requirePermission("roles:write"),
  validate({ params: idParamSchema }),
  asyncHandler(roleController.remove),
);

/**
 * @route GET /admin/utilisateurs
 * @desc Annuaire des comptes d'administration, filtrable par rôle et par état.
 * @access ADMIN + `utilisateurs:read`
 */
adminRouter.get(
  "/utilisateurs",
  requirePermission("utilisateurs:read"),
  validate({ query: listUtilisateursSchema }),
  asyncHandler(utilisateurController.list),
);

/**
 * @route GET /admin/utilisateurs/:id
 * @access ADMIN + `utilisateurs:read`
 */
adminRouter.get(
  "/utilisateurs/:id",
  requirePermission("utilisateurs:read"),
  validate({ params: idParamSchema }),
  asyncHandler(utilisateurController.getOne),
);

/**
 * @route POST /admin/utilisateurs
 * @desc Crée un compte d'administration, email déjà vérifié et rôle attribué.
 *
 *       Réservé aux comptes ADMIN : jeunes et entreprises passent par
 *       l'inscription publique, qui crée aussi leur profil métier et les engage
 *       dans un parcours de validation qu'un back-office ne doit pas contourner.
 * @access ADMIN + `utilisateurs:write`
 */
adminRouter.post(
  "/utilisateurs",
  requirePermission("utilisateurs:write"),
  validate({ body: createUtilisateurSchema }),
  asyncHandler(utilisateurController.create),
);

/**
 * @route PATCH /admin/utilisateurs/:id
 * @desc Nom, rôle, activation. Désactiver révoque immédiatement les sessions.
 * @access ADMIN + `utilisateurs:write`
 */
adminRouter.patch(
  "/utilisateurs/:id",
  requirePermission("utilisateurs:write"),
  validate({ params: idParamSchema, body: updateUtilisateurSchema }),
  asyncHandler(utilisateurController.update),
);

/**
 * @route POST /admin/utilisateurs/:id/mot-de-passe
 * @desc Réinitialise le mot de passe et révoque les sessions ouvertes.
 *
 *       POST et non PATCH : le corps décrit une OPÉRATION (réinitialiser), pas
 *       l'état visé d'une ressource — le mot de passe n'est jamais relu.
 * @access ADMIN + `utilisateurs:write`
 */
adminRouter.post(
  "/utilisateurs/:id/mot-de-passe",
  requirePermission("utilisateurs:write"),
  validate({ params: idParamSchema, body: resetUtilisateurPasswordSchema }),
  asyncHandler(utilisateurController.resetPassword),
);

/**
 * @route DELETE /admin/utilisateurs/:id
 * @desc Supprime définitivement un compte. Refusé sur son propre compte et sur
 *       le dernier super administrateur actif.
 * @access ADMIN + `utilisateurs:write`
 */
adminRouter.delete(
  "/utilisateurs/:id",
  requirePermission("utilisateurs:write"),
  validate({ params: idParamSchema }),
  asyncHandler(utilisateurController.remove),
);
