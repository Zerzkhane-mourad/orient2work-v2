/**
 * Contact et newsletter — routes PUBLIQUES.
 *
 * Aucune authentification, donc `emailLimiter` (5 requêtes par fenêtre) sur
 * chacune : sans cela, le formulaire de contact serait un relais de spam et
 * l'inscription newsletter permettrait d'inonder des adresses tierces.
 */
import { Router } from "express";
import * as controller from "../controllers/contact.controller.js";
import { asyncHandler } from "../lib/http.js";
import { contactLimiter, newsletterLimiter } from "../middlewares/rate-limit.js";
import { validate } from "../middlewares/validate.js";
import {
  contactMessageSchema,
  subscribeNewsletterSchema,
  unsubscribeNewsletterSchema,
} from "../validators/contact.validator.js";

export const contactRouter = Router();

/**
 * @route POST /contact
 * @desc Envoie un message à l'équipe OMB. Le contenu est assaini avant
 *       persistance : il est réaffiché tel quel dans l'espace admin.
 * @access Public
 * @returns 201 { message }
 */
contactRouter.post(
  "/",
  contactLimiter,
  validate({ body: contactMessageSchema }),
  asyncHandler(controller.submit),
);

export const newsletterRouter = Router();

/**
 * @route POST /newsletter
 * @desc Inscription idempotente. Réponse identique que l'adresse soit déjà
 *       inscrite ou non (anti-énumération).
 * @access Public
 * @returns 201 { message }
 */
newsletterRouter.post(
  "/",
  newsletterLimiter,
  validate({ body: subscribeNewsletterSchema }),
  asyncHandler(controller.subscribe),
);

/**
 * @route POST /newsletter/desinscription
 * @desc Désinscription par jeton reçu dans l'email. Le jeton évite qu'on
 *       puisse désinscrire quelqu'un en connaissant seulement son adresse.
 * @access Public
 * @returns 200 { message }
 */
newsletterRouter.post(
  "/desinscription",
  newsletterLimiter,
  validate({ body: unsubscribeNewsletterSchema }),
  asyncHandler(controller.unsubscribe),
);
