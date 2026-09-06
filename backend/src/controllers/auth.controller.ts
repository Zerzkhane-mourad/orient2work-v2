/**
 * Contrôleurs d'authentification.
 *
 * Rôle strictement limité au transport : lire `req.validated`, appeler le service,
 * poser les cookies, formater la réponse. Aucune règle métier ici.
 */
import type { Request, Response } from "express";
import {
  REFRESH_COOKIE_NAME,
  clearCsrfCookie,
  clearRefreshCookie,
  setCsrfCookie,
  setRefreshCookie,
} from "../lib/cookies.js";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { issueCsrfToken } from "../middlewares/csrf.js";
import { currentActor } from "../middlewares/authorize.js";
import { body } from "../middlewares/validate.js";
import * as authService from "../services/auth.service.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterEntrepriseInput,
  RegisterJeuneInput,
  ResetPasswordInput,
} from "../validators/auth.validator.js";

function sessionContext(req: Request): authService.SessionContext {
  return { userAgent: req.get("user-agent") ?? null, ip: req.ip ?? null };
}

/**
 * Le refresh token part UNIQUEMENT en cookie httpOnly ; seul l'access token,
 * à durée de vie courte, est renvoyé dans le corps pour être gardé en mémoire
 * côté client (pas en localStorage).
 */
function respondWithSession(res: Response, result: authService.AuthResult, status = 200): void {
  setRefreshCookie(res, result.refreshToken);
  const csrfToken = issueCsrfToken();
  setCsrfCookie(res, csrfToken);

  sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      csrfToken,
    },
    status,
  );
}

export async function registerJeune(req: Request, res: Response): Promise<void> {
  const result = await authService.registerJeune(body<RegisterJeuneInput>(req));
  sendSuccess(res, result, 201);
}

export async function registerEntreprise(req: Request, res: Response): Promise<void> {
  const result = await authService.registerEntreprise(body<RegisterEntrepriseInput>(req));
  sendSuccess(res, result, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(body<LoginInput>(req), sessionContext(req));
  respondWithSession(res, result);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const cookies = req.cookies as Record<string, string | undefined>;
  const token = cookies[REFRESH_COOKIE_NAME] ?? "";
  const result = await authService.refresh(token, sessionContext(req));
  respondWithSession(res, result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const cookies = req.cookies as Record<string, string | undefined>;
  await authService.logout(cookies[REFRESH_COOKIE_NAME]);
  clearRefreshCookie(res);
  clearCsrfCookie(res);
  sendNoContent(res);
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  await authService.logoutAll(currentActor(req).id);
  clearRefreshCookie(res);
  clearCsrfCookie(res);
  sendNoContent(res);
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = body<{ token: string }>(req);
  sendSuccess(res, await authService.verifyEmail(token));
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  const { email } = body<{ email: string }>(req);
  sendSuccess(res, await authService.resendVerification(email));
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = body<{ email: string }>(req);
  sendSuccess(res, await authService.forgotPassword(email));
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = body<ResetPasswordInput>(req);
  sendSuccess(res, await authService.resetPassword(token, password));
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const result = await authService.changePassword(
    currentActor(req).id,
    body<ChangePasswordInput>(req),
  );
  // Toutes les sessions ont été révoquées : le cookie local n'a plus d'objet.
  clearRefreshCookie(res);
  clearCsrfCookie(res);
  sendSuccess(res, result);
}

export async function me(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await authService.me(currentActor(req).id));
}
