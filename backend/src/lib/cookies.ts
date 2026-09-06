/**
 * Cookies de session.
 *
 * Le refresh token n'est JAMAIS renvoyé dans le corps de la réponse : il vit dans
 * un cookie `httpOnly` (inaccessible à JavaScript, donc au XSS), `secure` en
 * production et `sameSite=strict` — ce dernier point suffit déjà à bloquer le CSRF
 * classique, le double-submit token de `middlewares/csrf.ts` venant en défense
 * supplémentaire.
 *
 * `path` restreint l'envoi du cookie aux seules routes de rafraîchissement /
 * déconnexion : il ne circule pas sur chaque appel API.
 */
import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";
import { durationToMs } from "./tokens.js";

export const REFRESH_COOKIE_NAME = "o2w_refresh";
export const CSRF_COOKIE_NAME = "o2w_csrf";

function refreshCookiePath(): string {
  return `${env.API_PREFIX}/auth`;
}

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    domain: env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseOptions(),
    path: refreshCookiePath(),
    maxAge: durationToMs(env.JWT_REFRESH_TTL),
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...baseOptions(), path: refreshCookiePath() });
}

/**
 * Cookie CSRF : volontairement lisible par le frontend (`httpOnly: false`) pour
 * qu'il puisse recopier la valeur dans l'en-tête `x-csrf-token` (double submit).
 * Il ne contient aucun secret exploitable seul.
 */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    domain: env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN,
    path: "/",
    maxAge: durationToMs(env.JWT_REFRESH_TTL),
  });
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    domain: env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN,
    path: "/",
  });
}
