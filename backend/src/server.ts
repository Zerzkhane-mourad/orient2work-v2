/** Point d'entrée : démarrage HTTP et arrêt propre. */
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { disconnectPrisma, prisma } from "./lib/prisma.js";
import { ensureUploadDir } from "./lib/upload.js";
import { demarrerPlanificateurRappels } from "./services/rappel.service.js";

async function main(): Promise<void> {
  // Échouer au démarrage plutôt qu'à la première requête.
  await prisma.$connect();
  await ensureUploadDir();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API démarrée sur http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  // Rappels « dans 1 heure ». Démarré après l'écoute : un échec de balayage ne
  // doit pas empêcher l'API de servir.
  const arreterRappels = demarrerPlanificateurRappels();

  /** Arrêt gracieux : on laisse les requêtes en cours se terminer. */
  const shutdown = (signal: string): void => {
    logger.info({ signal }, "Arrêt en cours");
    arreterRappels();
    server.close(() => {
      void disconnectPrisma().finally(() => process.exit(0));
    });
    // Filet de sécurité si une connexion reste ouverte.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Une erreur non gérée laisse le processus dans un état incertain : mieux vaut
  // redémarrer proprement que continuer à servir des requêtes.
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "Rejet de promesse non géré");
    shutdown("unhandledRejection");
  });
  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "Exception non capturée");
    shutdown("uncaughtException");
  });
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, "Impossible de démarrer l'API");
  process.exit(1);
});
