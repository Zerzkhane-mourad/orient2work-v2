/** Helpers de transport HTTP : enveloppe de réponse et wrapper async. */
import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface ApiMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: ApiMeta): void {
  const body: ApiSuccess<T> = meta ? { success: true, data, meta } : { success: true, data };
  res.status(statusCode).json(body);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

/**
 * Express 4 n'attrape pas les rejets de promesses : sans ce wrapper, une erreur
 * async laisse la requête pendante au lieu d'atteindre le middleware d'erreur.
 */
export function asyncHandler<Req extends Request = Request, Res extends Response = Response>(
  handler: (req: Req, res: Res, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req as Req, res as Res, next).catch(next);
  };
}
