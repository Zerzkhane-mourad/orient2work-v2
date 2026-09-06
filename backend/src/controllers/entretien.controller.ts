import type { Request, Response } from "express";
import { sendSuccess } from "../lib/http.js";
import { currentActor, requireProfileId } from "../middlewares/authorize.js";
import { body, params, query } from "../middlewares/validate.js";
import * as entretienService from "../services/entretien.service.js";
import type {
  CreateEntretienInput,
  ListEntretiensInput,
  RespondEntretienInput,
  SubmitQuizInput,
  UpdateEntretienInput,
} from "../validators/entretien.validator.js";

export async function list(req: Request, res: Response): Promise<void> {
  const result = await entretienService.list(currentActor(req), query<ListEntretiensInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function countByStatus(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await entretienService.countByStatus(currentActor(req)));
}

export async function create(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const entrepriseId = requireProfileId(actor);
  sendSuccess(
    res,
    await entretienService.create(actor, entrepriseId, body<CreateEntretienInput>(req)),
    201,
  );
}

export async function respond(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(
    res,
    await entretienService.respond(currentActor(req), id, body<RespondEntretienInput>(req)),
  );
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(
    res,
    await entretienService.update(currentActor(req), id, body<UpdateEntretienInput>(req)),
  );
}

// ── Test de validation général ───────────────────────────────────────────────

export async function getQuiz(req: Request, res: Response): Promise<void> {
  const { filiereId } = query<{ filiereId?: string }>(req) ?? {};
  sendSuccess(res, await entretienService.getQuiz(currentActor(req), filiereId));
}

export async function submitQuiz(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await entretienService.submitQuiz(currentActor(req), body<SubmitQuizInput>(req)),
  );
}

export async function listAttempts(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await entretienService.listAttempts(currentActor(req)));
}
