import type { Request, Response } from "express";
import { sendSuccess } from "../lib/http.js";
import { currentActor } from "../middlewares/authorize.js";
import { body, params, query } from "../middlewares/validate.js";
import * as service from "../services/disponibilite.service.js";
import type {
  ListEntreprisesOuvertesInput,
  ReserverCreneauInput,
  UpdateDisponibilitesInput,
} from "../validators/disponibilite.validator.js";

export async function getReglages(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getReglages(currentActor(req)));
}

export async function updateReglages(req: Request, res: Response): Promise<void> {
  const input = body<UpdateDisponibilitesInput>(req);
  sendSuccess(res, await service.updateReglages(currentActor(req), input));
}

export async function listEntreprisesOuvertes(req: Request, res: Response): Promise<void> {
  const { items, meta } = await service.listEntreprisesOuvertes(
    query<ListEntreprisesOuvertesInput>(req),
  );
  sendSuccess(res, items, 200, meta);
}

export async function getCalendrier(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await service.getCalendrier(currentActor(req), id));
}

export async function reserverCreneau(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const input = body<ReserverCreneauInput>(req);
  sendSuccess(res, await service.reserverCreneau(currentActor(req), id, input), 201);
}
