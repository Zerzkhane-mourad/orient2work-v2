/** Profil entreprise et modération par l'admin (§7.2). */
import { EntrepriseStatus } from "@prisma/client";
import { NotFoundError } from "../lib/errors.js";
import { buildMeta, toSkipTake } from "../lib/pagination.js";
import { stripTags } from "../lib/sanitize.js";
import { assertOwnership, isAdmin, type Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/entreprise.repository.js";
import {
  toEntrepriseDto,
  toEntreprisePublicDto,
  type EntrepriseDto,
  type EntreprisePublicDto,
} from "../mappers/entreprise.mapper.js";
import { notify } from "./notification.service.js";
import type { ApiMeta } from "../lib/http.js";
import type {
  ListEntreprisesInput,
  UpdateEntrepriseInput,
} from "../validators/entreprise.validator.js";

export async function getMyProfile(actor: Actor): Promise<EntrepriseDto> {
  if (!actor.profileId) throw new NotFoundError("Aucun profil entreprise associé à ce compte.");
  const entreprise = await repository.findEntrepriseById(actor.profileId);
  if (!entreprise) throw new NotFoundError("Entreprise introuvable.");
  return toEntrepriseDto(entreprise);
}

/** Un visiteur ne voit qu'une entreprise validée, et sans les coordonnées du responsable. */
export async function getProfile(
  actor: Actor | null,
  id: string,
): Promise<EntrepriseDto | EntreprisePublicDto> {
  const entreprise = await repository.findEntrepriseById(id);
  if (!entreprise) throw new NotFoundError("Entreprise introuvable.");

  if (actor && (isAdmin(actor) || actor.profileId === entreprise.id)) {
    return toEntrepriseDto(entreprise);
  }
  if (entreprise.status !== EntrepriseStatus.valide) {
    throw new NotFoundError("Entreprise introuvable.");
  }
  return toEntreprisePublicDto(entreprise);
}

export async function updateProfile(
  actor: Actor,
  id: string,
  input: UpdateEntrepriseInput,
): Promise<EntrepriseDto> {
  const entreprise = await repository.findEntrepriseById(id);
  if (!entreprise) throw new NotFoundError("Entreprise introuvable.");
  assertOwnership(actor, entreprise.id);

  const updated = await repository.updateEntreprise(id, {
    ...input,
    ...(input.description !== undefined ? { description: stripTags(input.description) } : {}),
  });
  return toEntrepriseDto(updated);
}

export async function listPublic(
  input: ListEntreprisesInput,
): Promise<{ items: EntreprisePublicDto[]; meta: ApiMeta }> {
  const where = repository.buildEntrepriseWhere({
    q: input.q,
    ville: input.ville,
    secteur: input.secteur,
    status: EntrepriseStatus.valide,
  });
  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listEntreprises(where, skip, take);
  return { items: rows.map(toEntreprisePublicDto), meta: buildMeta(input, total) };
}

export async function listForAdmin(
  input: ListEntreprisesInput,
): Promise<{ items: EntrepriseDto[]; meta: ApiMeta }> {
  const where = repository.buildEntrepriseWhere(input);
  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listEntreprises(where, skip, take);
  return { items: rows.map(toEntrepriseDto), meta: buildMeta(input, total) };
}

export async function updateStatus(
  id: string,
  status: EntrepriseStatus,
  motif?: string,
): Promise<EntrepriseDto> {
  const entreprise = await repository.findEntrepriseById(id);
  if (!entreprise) throw new NotFoundError("Entreprise introuvable.");

  await repository.updateEntrepriseStatus(id, status);

  const labels: Record<EntrepriseStatus, string> = {
    inscrit: "Votre compte a été enregistré.",
    attente_contact: "Un conseiller OMB va vous contacter.",
    attente_validation: "Votre dossier est en cours de validation.",
    valide: "Votre compte entreprise est validé : vous pouvez publier des offres.",
    refuse: "Votre demande d'inscription a été refusée.",
    suspendu: "Votre compte a été suspendu.",
  };

  await notify({
    userId: entreprise.userId,
    icon: status === EntrepriseStatus.valide ? "verified" : "business_center",
    title: "Statut de votre compte entreprise",
    detail: motif ? `${labels[status]} ${stripTags(motif)}` : labels[status],
    href: "/espace-entreprise/profil",
    accent: status === EntrepriseStatus.valide,
  });

  const updated = await repository.findEntrepriseById(id);
  return toEntrepriseDto(updated!);
}

/** Statut courant, utilisé par les gardes métier (publication d'offre, accès talents). */
export async function getStatus(entrepriseId: string): Promise<EntrepriseStatus | null> {
  const entreprise = await repository.findEntrepriseById(entrepriseId);
  return entreprise?.status ?? null;
}
