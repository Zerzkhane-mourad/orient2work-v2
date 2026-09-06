import type { Request, Response } from "express";
import { sendSuccess } from "../lib/http.js";
import { paginationSchema } from "../lib/pagination.js";
import { body, params, query } from "../middlewares/validate.js";
import * as contactService from "../services/contact.service.js";
import type {
  ContactMessageInput,
  ListContactMessagesInput,
} from "../validators/contact.validator.js";

export async function submit(req: Request, res: Response): Promise<void> {
  // L'IP n'est tracée que pour diagnostiquer un abus ; elle n'est jamais renvoyée.
  const result = await contactService.submitMessage(body<ContactMessageInput>(req), req.ip ?? null);
  sendSuccess(res, result, 201);
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await contactService.listMessages(query<ListContactMessagesInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function setTraite(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const { traite } = body<{ traite: boolean }>(req);
  sendSuccess(res, await contactService.setTraite(id, traite));
}

// ── Newsletter ───────────────────────────────────────────────────────────────

export async function subscribe(req: Request, res: Response): Promise<void> {
  const { email } = body<{ email: string }>(req);
  sendSuccess(res, await contactService.subscribe(email), 201);
}

export async function unsubscribe(req: Request, res: Response): Promise<void> {
  const { token } = body<{ token: string }>(req);
  sendSuccess(res, await contactService.unsubscribe(token));
}

export async function listSubscriptions(req: Request, res: Response): Promise<void> {
  const pagination = paginationSchema.parse(req.query);
  const result = await contactService.listSubscriptions(pagination);
  sendSuccess(res, result.items, 200, result.meta);
}
