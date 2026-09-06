/** Routeur racine de l'API — assemble les routeurs de ressources sous `API_PREFIX`. */
import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { jeuneRouter } from "./jeune.routes.js";
import { entrepriseRouter } from "./entreprise.routes.js";
import {
  candidatureSpontaneeRouter,
  disponibiliteRouter,
} from "./disponibilite.routes.js";
import { offreRouter } from "./offre.routes.js";
import { candidatureRouter } from "./candidature.routes.js";
import { formationRouter } from "./formation.routes.js";
import { entretienRouter, testRouter } from "./entretien.routes.js";
import { notificationRouter } from "./notification.routes.js";
import { rechercheRouter } from "./recherche.routes.js";
import { documentRouter } from "./document.routes.js";
import { contactRouter, newsletterRouter } from "./contact.routes.js";
import { adminRouter } from "./admin.routes.js";
import * as faqController from "../controllers/faq.controller.js";
import * as referentielController from "../controllers/referentiel.controller.js";
import { asyncHandler, sendSuccess } from "../lib/http.js";
import {
  categoriesFormation,
  filieres,
} from "../repositories/referentiel.repository.js";
import * as referentielService from "../services/referentiel.service.js";
import { referentielLimiter } from "../middlewares/rate-limit.js";
import { validate } from "../middlewares/validate.js";
import { proposeEntreeSchema } from "../validators/referentiel.validator.js";
import {
  NIVEAUX_ETUDES,
  OPPORTUNITY_TYPES,
  QUIZ_PASS_SCORE,
  WORK_MODES,
} from "../domain/enums.js";

export const apiRouter = Router();

/**
 * @route GET /referentiels
 * @desc Listes de valeurs pour alimenter les formulaires du frontend.
 *
 *       Types d'opportunité, modes de travail et niveaux d'études restent des
 *       constantes : ils structurent la validation métier et ne changent pas
 *       sans évolution du code. Filières et catégories de formation, elles,
 *       viennent de la base — elles sont administrables (§7.4).
 * @access Public
 */
apiRouter.get(
  "/referentiels",
  asyncHandler(async (_req, res) => {
    const [listeFilieres, listeCategories] = await Promise.all([
      referentielService.listNames(filieres),
      referentielService.listNames(categoriesFormation),
    ]);
    sendSuccess(res, {
      filieres: listeFilieres,
      typesOpportunite: OPPORTUNITY_TYPES,
      modesTravail: WORK_MODES,
      niveauxEtudes: NIVEAUX_ETUDES,
      categoriesFormation: listeCategories,
      scoreMinimumTest: QUIZ_PASS_SCORE,
    });
  }),
);

/**
 * @route GET /referentiels/categories-formation
 * @route GET /referentiels/filieres
 * @desc Entrées actives, avec leur ordre d'affichage. Alimentent les onglets du
 *       catalogue et les filtres, y compris pour un visiteur non connecté.
 *
 *       Chemins figés plutôt que `/:referentiel` : ces deux-là sont publics par
 *       décision explicite, un futur référentiel ne le devient pas par défaut.
 * @access Public
 */
apiRouter.get(
  "/referentiels/categories-formation",
  asyncHandler(referentielController.listPublic(categoriesFormation)),
);
apiRouter.get(
  "/referentiels/filieres",
  asyncHandler(referentielController.listPublic(filieres)),
);

/**
 * @route POST /referentiels/filieres
 * @desc Filière proposée par un candidat qui ne trouve pas la sienne à
 *       l'inscription (§5.1). Créée active, donc immédiatement proposée aux
 *       visiteurs suivants.
 *
 *       Un nom équivalent — à la casse, aux accents et aux espaces près —
 *       renvoie l'entrée EXISTANTE au lieu d'en créer une jumelle : c'est la
 *       seule protection contre les doublons sur un champ libre public.
 *
 *       SEULE écriture ouverte à un visiteur non connecté dans un référentiel,
 *       d'où la limite de débit dédiée. Les filières ne sont pas ouvertes de la
 *       même façon aux catégories de formation : celles-ci restent purement
 *       administratives.
 * @access Public
 */
apiRouter.post(
  "/referentiels/filieres",
  referentielLimiter,
  validate({ body: proposeEntreeSchema }),
  asyncHandler(referentielController.proposePublic(filieres)),
);

/**
 * @route GET /faq
 * @desc Questions fréquentes publiées, dans l'ordre défini au back-office.
 *       Alimente l'accordéon de la page d'accueil, sans session.
 * @access Public
 */
apiRouter.get("/faq", asyncHandler(faqController.listPublic));

apiRouter.use("/auth", authRouter);
apiRouter.use("/jeunes", jeuneRouter);
// Monté AVANT `entrepriseRouter` : sans cela, « /entreprises/disponibilites »
// serait capté par la route « /entreprises/:id » et traité comme un identifiant.
apiRouter.use("/entreprises/disponibilites", disponibiliteRouter);
apiRouter.use("/entreprises", entrepriseRouter);
apiRouter.use("/candidatures-spontanees", candidatureSpontaneeRouter);
apiRouter.use("/offres", offreRouter);
apiRouter.use("/candidatures", candidatureRouter);
apiRouter.use("/formations", formationRouter);
apiRouter.use("/entretiens", entretienRouter);
apiRouter.use("/test", testRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/recherche", rechercheRouter);
apiRouter.use("/documents", documentRouter);
apiRouter.use("/contact", contactRouter);
apiRouter.use("/newsletter", newsletterRouter);
apiRouter.use("/admin", adminRouter);
