/**
 * Construction de l'application Express.
 *
 * L'ordre des middlewares est un choix de sécurité, pas de style :
 *  1. `helmet` en premier — les en-têtes doivent être posés même si un middleware
 *     ultérieur échoue ;
 *  2. CORS avant tout parsing, pour rejeter une origine interdite au plus tôt ;
 *  3. limites de taille sur le corps AVANT que les routes ne s'exécutent ;
 *  4. `notFoundHandler` puis `errorHandler` en tout dernier.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { env, isProduction, isTest } from "./config/env.js";
import { logger } from "./config/logger.js";
import { AppError } from "./lib/errors.js";
import { sendSuccess } from "./lib/http.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { apiLimiter } from "./middlewares/rate-limit.js";
import { requestLogger } from "./middlewares/request-logger.js";
import { apiRouter } from "./routes/index.js";

/** Whitelist stricte : `*` est refusé par la validation d'environnement. */
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Origine absente = appel serveur-à-serveur ou outil CLI : autorisé, car
    // aucun cookie de navigateur n'est en jeu dans ce cas.
    if (!origin) {
      callback(null, true);
      return;
    }
    if (env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    logger.warn({ origin }, "Origine CORS refusée");
    callback(new AppError(403, "FORBIDDEN", "Origine non autorisée."));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token", "x-request-id"],
  exposedHeaders: ["x-request-id"],
  maxAge: 600,
};

export function createApp(): Express {
  const app = express();

  // Nécessaire derrière un reverse proxy pour que `req.ip` et les cookies
  // `secure` reflètent la vraie requête cliente (rate limiting fiable).
  app.set("trust proxy", isProduction ? 1 : false);
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // L'API ne sert pas de HTML applicatif : tout est verrouillé.
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "no-referrer" },
      hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    }),
  );

  app.use(cors(corsOptions));
  app.use(requestLogger);

  // Plafond de 10 ko : largement suffisant pour les payloads JSON de l'API, et
  // suffisamment bas pour couper court aux tentatives de saturation mémoire.
  // Le contenu HTML des formations, plus volumineux, a sa propre limite.
  app.use("/api/v1/formations", express.json({ limit: "512kb" }));
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));
  app.use(cookieParser(env.COOKIE_SECRET));

  app.use(apiLimiter);

  /**
   * @route GET /health
   * @desc Sonde de disponibilité (load balancer, conteneur).
   * @access Public
   */
  app.get("/health", (_req, res) => {
    sendSuccess(res, { status: "ok", uptime: Math.round(process.uptime()) });
  });

  app.use(env.API_PREFIX, apiRouter);

  // Documentation interactive — jamais exposée en production.
  if (!isProduction && !isTest) {
    try {
      const specPath = path.resolve(process.cwd(), "openapi.yaml");
      const spec: unknown = YAML.parse(readFileSync(specPath, "utf8"));
      app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec as Record<string, unknown>));
      logger.info("Documentation disponible sur /docs");
    } catch (error) {
      logger.warn({ err: error }, "openapi.yaml introuvable — /docs désactivé");
    }
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
