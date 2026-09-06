import type { Request, Response } from "express";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { body, params } from "../middlewares/validate.js";
import * as faqService from "../services/faq.service.js";
import type {
  CreateFaqInput,
  MoveFaqInput,
  UpdateFaqInput,
} from "../validators/faq.validator.js";

/**
 * Vitrine : questions publiées, dans l'ordre choisi par l'administrateur.
 *
 * Pas de pagination — c'est une liste tenue à la main, bornée par nature, et
 * l'accordéon de la page d'accueil a besoin de tout d'un coup.
 */
export async function listPublic(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await faqService.listPubliques());
}

/** Back-office : masquées comprises, avec leur ordre. */
export async function list(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await faqService.listToutes());
}

export async function create(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await faqService.create(body<CreateFaqInput>(req)), 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await faqService.update(id, body<UpdateFaqInput>(req)));
}

/**
 * Renvoie la LISTE COMPLÈTE réordonnée, pas la seule question déplacée : un
 * déplacement en modifie deux au minimum, et le client doit pouvoir réafficher
 * l'ordre exact sans second appel.
 */
export async function move(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await faqService.move(id, body<MoveFaqInput>(req)));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  await faqService.remove(id);
  sendNoContent(res);
}
