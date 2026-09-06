import type { Request, Response } from "express";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { currentActor, requireProfileId } from "../middlewares/authorize.js";
import { body, params, query } from "../middlewares/validate.js";
import * as offreService from "../services/offre.service.js";
import type {
  CreateOffreInput,
  ListOffresInput,
  ModerateOffreInput,
  UpdateOffreInput,
} from "../validators/offre.validator.js";

export async function listPublic(req: Request, res: Response): Promise<void> {
  const result = await offreService.listPublic(query<ListOffresInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const actor = req.user ? currentActor(req) : null;
  sendSuccess(res, await offreService.getOne(actor, id));
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const entrepriseId = requireProfileId(actor);
  const result = await offreService.listMine(actor, entrepriseId, query<ListOffresInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function create(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const entrepriseId = requireProfileId(actor);
  sendSuccess(
    res,
    await offreService.create(actor, entrepriseId, body<CreateOffreInput>(req)),
    201,
  );
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await offreService.update(currentActor(req), id, body<UpdateOffreInput>(req)));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  await offreService.remove(currentActor(req), id);
  sendNoContent(res);
}

export async function listForAdmin(req: Request, res: Response): Promise<void> {
  const result = await offreService.listForAdmin(query<ListOffresInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function moderate(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await offreService.moderate(id, body<ModerateOffreInput>(req)));
}
