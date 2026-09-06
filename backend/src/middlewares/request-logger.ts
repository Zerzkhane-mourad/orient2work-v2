/** Journalisation des requêtes (pino-http), avec identifiant de corrélation. */
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";
import { isTest } from "../config/env.js";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    const id = typeof existing === "string" && existing.length <= 64 ? existing : randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  autoLogging: { ignore: (req) => isTest || req.url === "/health" },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // Sérialiseurs minimalistes : le corps des requêtes n'est jamais loggué, ce qui
  // écarte tout risque de tracer un mot de passe ou un token.
  serializers: {
    req: (req: IncomingMessage & { id?: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },
});
