import type { Request, Response } from "express";
import { sendSuccess } from "../lib/http.js";
import { currentActor, requireProfileId } from "../middlewares/authorize.js";
import { body, params, query } from "../middlewares/validate.js";
import * as candidatureService from "../services/candidature.service.js";
import type {
  CreateCandidatureInput,
  ListCandidaturesInput,
  UpdateCandidatureStatusInput,
} from "../validators/candidature.validator.js";

export async function apply(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const jeuneId = requireProfileId(actor);
  sendSuccess(
    res,
    await candidatureService.apply(actor, jeuneId, body<CreateCandidatureInput>(req)),
    201,
  );
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const jeuneId = requireProfileId(actor);
  const result = await candidatureService.listMine(
    actor,
    jeuneId,
    query<ListCandidaturesInput>(req),
  );
  sendSuccess(res, result.items, 200, result.meta);
}

export async function countMine(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  sendSuccess(res, await candidatureService.countMineByStatus(actor, requireProfileId(actor)));
}

export async function listReceived(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const entrepriseId = requireProfileId(actor);
  const result = await candidatureService.listReceived(
    actor,
    entrepriseId,
    query<ListCandidaturesInput>(req),
  );
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await candidatureService.getOne(currentActor(req), id));
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(
    res,
    await candidatureService.updateStatus(
      currentActor(req),
      id,
      body<UpdateCandidatureStatusInput>(req),
    ),
  );
}

export async function withdraw(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await candidatureService.withdraw(currentActor(req), id));
}
