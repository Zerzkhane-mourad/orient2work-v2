/**
 * Accès aux données d'identité (User, RefreshToken, ActionToken).
 *
 * Cette couche ne contient AUCUNE règle métier : elle traduit des intentions en
 * requêtes Prisma. Les décisions (« ce token est-il rejouable ? ») appartiennent
 * au service.
 */
import { type Prisma, type Role, type TokenPurpose, type User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type UserWithProfiles = Prisma.UserGetPayload<{
  include: { jeune: { select: { id: true } }; entreprise: { select: { id: true } } };
}>;

const withProfiles = {
  jeune: { select: { id: true } },
  entreprise: { select: { id: true } },
} satisfies Prisma.UserInclude;

export function findUserByEmail(email: string): Promise<UserWithProfiles | null> {
  return prisma.user.findUnique({ where: { email }, include: withProfiles });
}

export function findUserById(id: string): Promise<UserWithProfiles | null> {
  return prisma.user.findUnique({ where: { id }, include: withProfiles });
}

export function emailExists(email: string): Promise<boolean> {
  return prisma.user.count({ where: { email } }).then((count) => count > 0);
}

export function createUser(
  data: { email: string; passwordHash: string; role: Role },
  tx: Prisma.TransactionClient = prisma,
): Promise<User> {
  return tx.user.create({ data });
}

export function updatePassword(userId: string, passwordHash: string): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export function markEmailVerified(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true, emailVerifiedAt: new Date() },
  });
}

export function touchLastLogin(userId: string): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

// ── Refresh tokens ───────────────────────────────────────────────────────────

export function createRefreshToken(data: {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
}) {
  return prisma.refreshToken.create({ data });
}

export function findRefreshToken(tokenHash: string) {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: withProfiles } },
  });
}

export function revokeRefreshToken(id: string, replacedById?: string) {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date(), ...(replacedById ? { replacedById } : {}) },
  });
}

/** Révoque toutes les sessions d'un utilisateur (déconnexion globale, vol détecté). */
export function revokeAllRefreshTokens(userId: string) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function deleteExpiredRefreshTokens() {
  return prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

// ── Tokens à usage unique ────────────────────────────────────────────────────

export function createActionToken(data: {
  tokenHash: string;
  purpose: TokenPurpose;
  userId: string;
  expiresAt: Date;
}) {
  return prisma.actionToken.create({ data });
}

export function findActionToken(tokenHash: string, purpose: TokenPurpose) {
  return prisma.actionToken.findFirst({
    where: { tokenHash, purpose },
    include: { user: { include: withProfiles } },
  });
}

export function consumeActionToken(id: string) {
  return prisma.actionToken.update({ where: { id }, data: { usedAt: new Date() } });
}

/** Invalide les anciens tokens du même usage avant d'en émettre un neuf. */
export function invalidateActionTokens(userId: string, purpose: TokenPurpose) {
  return prisma.actionToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
}
