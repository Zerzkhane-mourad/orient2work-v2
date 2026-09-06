/**
 * Limitation de débit.
 *
 * `apiLimiter` protège l'ensemble de l'API ; `authLimiter` est nettement plus
 * strict et s'applique aux routes de connexion, d'inscription et de
 * réinitialisation de mot de passe, qui sont les cibles du bruteforce et de
 * l'énumération de comptes.
 *
 * Note déploiement : derrière un reverse proxy, `app.set("trust proxy", 1)` est
 * indispensable, sinon toutes les requêtes partagent l'IP du proxy et un seul
 * client peut bloquer tout le monde.
 */
import rateLimit, { type Options } from "express-rate-limit";
import type { Request } from "express";
import { env, isTest } from "../config/env.js";
import type { ApiFailure } from "../lib/http.js";

const failureBody: ApiFailure = {
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Trop de tentatives. Réessayez dans quelques minutes.",
  },
};

const shared: Partial<Options> = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: failureBody,
  // Les tests d'intégration enchaînent volontairement les appels.
  skip: () => isTest,
};

export const apiLimiter = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/**
 * Clé = IP + email visé. Un attaquant qui teste des mots de passe sur un même
 * compte est bloqué même s'il change d'IP lentement, et un utilisateur légitime
 * n'est pas puni parce qu'un voisin de NAT s'est trompé de mot de passe.
 */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  keyGenerator: (req: Request): string => {
    const body = req.body as { email?: unknown } | undefined;
    const email = typeof body?.email === "string" ? body.email.toLowerCase() : "";
    return `${req.ip ?? "unknown"}:${email}`;
  },
});

/**
 * Renvoi d'email d'authentification (vérification d'adresse, reset).
 *
 * Chaque appel à `rateLimit()` crée son PROPRE compteur : les trois limiteurs
 * ci-dessous ont donc des budgets indépendants. Les partager reviendrait à ce
 * qu'un utilisateur ayant écrit via le formulaire de contact ne puisse plus
 * demander une réinitialisation de mot de passe.
 */
export const emailLimiter = rateLimit({
  ...shared,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: 5,
});

/** Formulaire de contact public — protection anti-spam. */
export const contactLimiter = rateLimit({
  ...shared,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: 5,
});

/**
 * Filière proposée depuis le formulaire d'inscription (§5.1).
 *
 * La seule écriture qu'un visiteur non connecté puisse faire dans un
 * référentiel. Un candidat en saisit une, exceptionnellement deux s'il se
 * trompe : au-delà, c'est du remplissage automatique.
 */
export const referentielLimiter = rateLimit({
  ...shared,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: 5,
});

/**
 * Newsletter.
 *
 * Un peu plus permissif : inscription, correction de faute de frappe et
 * désinscription partagent ce compteur, et aucune de ces actions n'envoie
 * d'email à une adresse déjà abonnée.
 */
export const newsletterLimiter = rateLimit({
  ...shared,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: 10,
});
