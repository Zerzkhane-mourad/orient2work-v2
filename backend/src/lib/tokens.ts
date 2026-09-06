/**
 * Jetons : access token JWT, refresh token opaque, tokens d'action à usage unique.
 *
 * Les refresh tokens et les tokens d'action sont des chaînes aléatoires opaques :
 * seul leur SHA-256 est stocké en base, donc une lecture de la base ne suffit pas
 * à usurper une session. L'access token, lui, est un JWT signé : il est vérifiable
 * sans requête SQL sur chaque appel.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { UnauthenticatedError } from "./errors.js";

export interface AccessTokenPayload {
  /** Id du User. */
  sub: string;
  role: Role;
  /** Id du profil Jeune ou Entreprise associé — évite une jointure sur chaque requête. */
  profileId: string | null;
  emailVerified: boolean;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    subject: payload.sub,
  };
  return jwt.sign(
    { role: payload.role, profileId: payload.profileId, emailVerified: payload.emailVerified },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthenticatedError("Session expirée.", "TOKEN_EXPIRED");
    }
    throw new UnauthenticatedError("Jeton invalide.", "TOKEN_INVALID");
  }

  if (typeof decoded === "string" || !decoded.sub) {
    throw new UnauthenticatedError("Jeton invalide.", "TOKEN_INVALID");
  }

  return {
    sub: decoded.sub,
    role: decoded.role as Role,
    profileId: (decoded.profileId as string | null) ?? null,
    emailVerified: Boolean(decoded.emailVerified),
  };
}

/** Chaîne aléatoire cryptographiquement sûre, sûre pour une URL. */
export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString("base64url");
}

/** Empreinte stockée en base à la place du token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Comparaison à temps constant de deux empreintes hexadécimales. */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Convertit "15m" / "7d" en millisecondes (pour l'expiration des cookies et des tokens). */
export function durationToMs(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d|w|y)?$/.exec(duration);
  if (!match) throw new Error(`Durée invalide : ${duration}`);
  const amount = Number(match[1]);
  const unit = match[2] ?? "ms";
  const factors: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
    y: 31_536_000_000,
  };
  return amount * (factors[unit] ?? 1);
}
