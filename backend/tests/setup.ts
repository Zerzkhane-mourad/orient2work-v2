/**
 * Configuration des tests d'intégration.
 *
 * Les tests tournent contre une VRAIE base PostgreSQL (`TEST_DATABASE_URL`) et non
 * contre des mocks : c'est le seul moyen de vérifier réellement les contraintes
 * d'unicité, les cascades et les règles de propriété, qui sont précisément ce
 * qu'on veut garantir ici.
 */
import { config as loadDotenv } from "dotenv";

loadDotenv();

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

// Valeurs par défaut pour que la validation d'environnement passe sans .env complet.
process.env.APP_URL ??= "http://localhost:3000";
process.env.JWT_ACCESS_SECRET ??= "test_access_secret_de_32_caracteres_minimum__";
process.env.JWT_REFRESH_SECRET ??= "test_refresh_secret_de_32_caracteres_minimum_";
process.env.COOKIE_SECRET ??= "test_cookie_secret_de_32_caracteres_minimum__";
process.env.CORS_ORIGINS ??= "http://localhost:3000";
process.env.LOG_LEVEL = "silent";
// Coût bcrypt minimal : les tests enchaînent beaucoup de hachages.
process.env.BCRYPT_ROUNDS = "10";
process.env.UPLOAD_DIR ??= "./storage/test-uploads";
