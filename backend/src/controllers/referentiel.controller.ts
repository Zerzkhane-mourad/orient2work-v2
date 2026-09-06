import type { Request, Response } from "express";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { body, params, query } from "../middlewares/validate.js";
import {
  REFERENTIELS,
  type ReferentielAdapter,
  type ReferentielKey,
} from "../repositories/referentiel.repository.js";
import * as referentielService from "../services/referentiel.service.js";
import type {
  CreateEntreeInput,
  ListEntreesInput,
  MoveEntreeInput,
  ProposeEntreeInput,
  UpdateEntreeInput,
} from "../validators/referentiel.validator.js";

/**
 * Le référentiel visé est un segment d'URL (`/admin/referentiels/:referentiel`),
 * déjà restreint aux clés connues par `referentielParamSchema`. La conversion en
 * adaptateur est donc totale : pas de cas « clé inconnue » à gérer ici.
 */
function adapterOf(req: Request): ReferentielAdapter {
  const { referentiel } = params<{ referentiel: ReferentielKey }>(req);
  return REFERENTIELS[referentiel];
}

/**
 * Liste publique : uniquement les entrées actives, et SANS pagination.
 *
 * Elle alimente des `<select>` et des onglets, qui ont besoin de TOUTES les
 * valeurs proposables — une page ne suffirait pas. Le volume est borné par
 * nature : c'est une liste administrée à la main.
 */
export function listPublic(adapter: ReferentielAdapter) {
  return async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await referentielService.listAll(adapter, true));
  };
}

/**
 * Entrée proposée par un visiteur, depuis le formulaire d'inscription.
 *
 * Renvoie 200 et l'entrée existante quand un nom équivalent est déjà là : pour
 * l'appelant le résultat est le même — il obtient l'identifiant à rattacher —
 * et un 409 l'obligerait à gérer un cas qui ne le concerne pas.
 */
export function proposePublic(adapter: ReferentielAdapter) {
  return async (req: Request, res: Response): Promise<void> => {
    const { nom } = body<ProposeEntreeInput>(req);
    sendSuccess(res, await referentielService.proposer(adapter, nom));
  };
}

/** Liste d'administration : paginée, et incluant les entrées désactivées. */
export async function list(req: Request, res: Response): Promise<void> {
  const input = query<ListEntreesInput>(req);
  const result = await referentielService.list(adapterOf(req), !input.inactives, input);
  sendSuccess(res, result.items, 200, result.meta);
}

export async function move(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  await referentielService.move(adapterOf(req), id, body<MoveEntreeInput>(req).direction);
  sendNoContent(res);
}

export async function create(req: Request, res: Response): Promise<void> {
  const entree = await referentielService.create(adapterOf(req), body<CreateEntreeInput>(req));
  sendSuccess(res, entree, 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(
    res,
    await referentielService.update(adapterOf(req), id, body<UpdateEntreeInput>(req)),
  );
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  await referentielService.remove(adapterOf(req), id);
  sendNoContent(res);
}
