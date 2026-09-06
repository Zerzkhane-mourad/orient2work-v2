/**
 * Client Prisma unique pour tout le processus.
 *
 * Le singleton évite d'épuiser le pool de connexions lors des rechargements à
 * chaud en développement (tsx watch recharge le module, pas le processus).
 */
import { PrismaClient } from "@prisma/client";
import { isProduction, isTest } from "../config/env.js";
import { logger } from "../config/logger.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction || isTest ? ["error"] : ["warn", "error"],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.debug("Prisma déconnecté");
}

/** Codes d'erreur Prisma utilisés par la couche service. */
export const PrismaErrorCode = {
  UNIQUE_CONSTRAINT: "P2002",
  FOREIGN_KEY_CONSTRAINT: "P2003",
  RECORD_NOT_FOUND: "P2025",
} as const;
