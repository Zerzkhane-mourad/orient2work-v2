/**
 * Validation des variables d'environnement au démarrage.
 *
 * Aucun secret n'est écrit en dur dans le code : tout vient de `process.env`, et
 * le processus refuse de démarrer si une variable manque ou est invalide — c'est
 * préférable à une panne silencieuse en production (ex. secret JWT vide).
 */
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

/** "15m", "7d", "3600" — accepté tel quel par jsonwebtoken. */
const durationSchema = z
  .string()
  .regex(/^\d+(ms|s|m|h|d|w|y)?$/, "durée invalide (ex. 15m, 7d, 3600)");

const booleanFromString = z.enum(["true", "false"]).transform((value) => value === "true");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().max(65535).default(4000),
    API_PREFIX: z.string().startsWith("/").default("/api/v1"),
    APP_URL: z.string().url(),
    /**
     * Fuseau dans lequel sont exprimées les heures d'entretien.
     *
     * `Entretien.heure` est une heure MURALE (« 14:00 ») : sans fuseau de
     * référence, impossible de savoir à quel instant réel elle correspond, donc
     * de déclencher un rappel une heure avant.
     */
    APP_TIMEZONE: z.string().min(1).default("Africa/Casablanca"),
    /** Période de balayage du planificateur de rappels, en minutes. */
    RAPPEL_INTERVALLE_MIN: z.coerce.number().int().min(1).max(60).default(5),

    DATABASE_URL: z.string().url(),
    TEST_DATABASE_URL: z.string().url().optional(),

    // Deux secrets distincts : un access token volé ne doit jamais pouvoir être
    // reforgé en refresh token.
    JWT_ACCESS_SECRET: z.string().min(32, "32 caractères minimum"),
    JWT_REFRESH_SECRET: z.string().min(32, "32 caractères minimum"),
    JWT_ACCESS_TTL: durationSchema.default("15m"),
    JWT_REFRESH_TTL: durationSchema.default("7d"),
    JWT_ISSUER: z.string().min(1).default("orient2work-api"),
    JWT_AUDIENCE: z.string().min(1).default("orient2work-web"),

    COOKIE_DOMAIN: z.string().min(1).default("localhost"),
    COOKIE_SECURE: booleanFromString.default("false"),
    COOKIE_SECRET: z.string().min(32, "32 caractères minimum"),

    CORS_ORIGINS: z
      .string()
      .min(1)
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .refine((origins) => origins.length > 0, "au moins une origine autorisée")
      .refine(
        (origins) => !origins.includes("*"),
        "`*` est interdit : la whitelist doit être explicite (les cookies sont envoyés avec credentials)",
      ),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

    UPLOAD_DIR: z.string().min(1).default("./storage/uploads"),
    UPLOAD_MAX_SIZE_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(5 * 1024 * 1024),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
    SMTP_SECURE: booleanFromString.default("false"),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().min(1).default("Orient2Work <no-reply@orient2work.ma>"),
    EMAIL_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(15),

    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    SEED_ADMIN_EMAIL: z.string().email().default("admin@orient2work.ma"),
    SEED_ADMIN_PASSWORD: z.string().min(12).default("Admin!2026Change"),
  })
  .superRefine((value, ctx) => {
    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "doit être différent de JWT_ACCESS_SECRET",
      });
    }
    if (value.NODE_ENV === "production") {
      if (!value.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["COOKIE_SECURE"],
          message: "doit valoir `true` en production (cookies uniquement en HTTPS)",
        });
      }
      if (value.CORS_ORIGINS.some((origin) => origin.startsWith("http://"))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ORIGINS"],
          message: "les origines doivent être en HTTPS en production",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(racine)"} : ${issue.message}`)
    .join("\n");
  // Volontairement `console.error` : le logger n'est pas encore construit ici.
  console.error(
    `\n[config] Variables d'environnement invalides — démarrage annulé.\n${details}\n\nVoir .env.example.\n`,
  );
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
export const isDevelopment = env.NODE_ENV === "development";
