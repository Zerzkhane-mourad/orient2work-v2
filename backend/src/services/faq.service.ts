/**
 * Questions fréquentes.
 *
 * Deux lectures pour deux publics : la vitrine ne voit que les questions
 * publiées, le back-office voit tout. Les mélanger derrière un paramètre
 * laisserait un client public demander les brouillons.
 */
import { NotFoundError, ValidationError } from "../lib/errors.js";
import * as repository from "../repositories/faq.repository.js";
import type { CreateFaqInput, MoveFaqInput, UpdateFaqInput } from "../validators/faq.validator.js";

export interface FaqPubliqueDto {
  id: string;
  question: string;
  reponse: string;
}

export interface FaqAdminDto extends FaqPubliqueDto {
  ordre: number;
  publiee: boolean;
}

/** Vitrine : publiées uniquement. */
export function listPubliques(): Promise<FaqPubliqueDto[]> {
  return repository.listFaqPubliees();
}

/** Back-office : masquées comprises. */
export async function listToutes(): Promise<FaqAdminDto[]> {
  const lignes = await repository.listFaq();
  return lignes.map(({ id, question, reponse, ordre, publiee }) => ({
    id,
    question,
    reponse,
    ordre,
    publiee,
  }));
}

export async function create(input: CreateFaqInput): Promise<FaqAdminDto> {
  const creee = await repository.createFaq(input);
  return { ...creee };
}

export async function update(id: string, input: UpdateFaqInput): Promise<FaqAdminDto> {
  const existante = await repository.findFaqById(id);
  if (!existante) throw new NotFoundError("Question introuvable.");

  const modifiee = await repository.updateFaq(id, input);
  return { ...modifiee };
}

export async function remove(id: string): Promise<void> {
  const existante = await repository.findFaqById(id);
  if (!existante) throw new NotFoundError("Question introuvable.");
  await repository.deleteFaq(id);
}

export async function move(id: string, input: MoveFaqInput): Promise<FaqAdminDto[]> {
  const deplacee = await repository.moveFaq(id, input.direction);
  if (!deplacee) {
    // 422 plutôt que 404 : la question existe, c'est le mouvement qui est
    // impossible — première entrée vers le haut, dernière vers le bas.
    throw new ValidationError("Déplacement impossible.", [
      { field: "direction", message: "La question est déjà à cette extrémité." },
    ]);
  }
  return listToutes();
}
