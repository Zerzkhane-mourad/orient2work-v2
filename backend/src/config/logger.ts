/**
 * Logger applicatif (pino).
 *
 * `redact` garantit qu'aucune donnée sensible ne finit dans les logs, même si
 * un objet complet (req.body, réponse Prisma…) est loggué par erreur.
 */
import pino from "pino";
import { env, isProduction, isTest } from "./env.js";

/** Chemins masqués dans toute entrée de log. */
const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['set-cookie']",
  "res.headers['set-cookie']",
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
  "tokenHash",
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.tokenHash",
  "body.password",
  "body.newPassword",
  "body.currentPassword",
  "body.token",
];

export const logger = pino({
  level: isTest ? "silent" : env.LOG_LEVEL,
  redact: { paths: REDACTED_PATHS, censor: "[redacted]" },
  base: { service: "orient2work-api", env: env.NODE_ENV },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname,service,env",
          },
        },
      }),
});

export type Logger = typeof logger;
