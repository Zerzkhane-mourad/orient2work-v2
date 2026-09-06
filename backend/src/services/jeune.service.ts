/**
 * Profil jeune, expériences, liens et recherche de talents.
 *
 * Contrôle de propriété systématique : chaque écriture passe par
 * `assertOwnership`, donc un jeune authentifié ne peut modifier que SON profil,
 * même en devinant l'UUID d'un autre. L'admin est la seule exception.
 */
import { JeuneStatus, Role } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { buildMeta, toSkipTake } from "../lib/pagination.js";
import { stripTags } from "../lib/sanitize.js";
import { assertOwnership, isAdmin, type Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/jeune.repository.js";
import { filiereRelation } from "./referentiel.service.js";
import {
  toJeuneDto,
  toJeunePublicDto,
  type JeuneDto,
  type JeunePublicDto,
} from "../mappers/jeune.mapper.js";
import type { ApiMeta } from "../lib/http.js";
import type {
  ExperienceInput,
  LienInput,
  ListJeunesInput,
  SearchTalentsInput,
  UpdateJeuneInput,
} from "../validators/jeune.validator.js";

async function loadOwned(actor: Actor, jeuneId: string) {
  const jeune = await repository.findJeuneById(jeuneId);
  if (!jeune) throw new NotFoundError("Profil introuvable.");
  assertOwnership(actor, jeune.id);
  return jeune;
}

export async function getMyProfile(actor: Actor): Promise<JeuneDto> {
  if (!actor.profileId) throw new NotFoundError("Aucun profil jeune associé à ce compte.");
  const jeune = await repository.findJeuneById(actor.profileId);
  if (!jeune) throw new NotFoundError("Profil introuvable.");
  return toJeuneDto(jeune);
}

/**
 * Consultation d'un profil par un tiers.
 *
 * Un recruteur ne voit que les profils validés, et uniquement la vue publique
 * (sans email ni téléphone). Le propriétaire et l'admin obtiennent la vue complète.
 */
export async function getProfile(
  actor: Actor | null,
  jeuneId: string,
): Promise<JeuneDto | JeunePublicDto> {
  const jeune = await repository.findJeuneById(jeuneId);
  if (!jeune) throw new NotFoundError("Profil introuvable.");

  if (actor && (isAdmin(actor) || actor.profileId === jeune.id)) {
    return toJeuneDto(jeune);
  }

  if (jeune.status !== JeuneStatus.valide) {
    throw new NotFoundError("Profil introuvable.");
  }
  return toJeunePublicDto(jeune);
}

export async function updateProfile(
  actor: Actor,
  jeuneId: string,
  input: UpdateJeuneInput,
): Promise<JeuneDto> {
  await loadOwned(actor, jeuneId);

  // `input` ne contient que les champs listés dans le schéma strict : ni `status`,
  // ni `scoreQuiz` ne peuvent passer par ici.
  const { filiereId, ...rest } = input;

  const updated = await repository.updateJeune(jeuneId, {
    ...rest,
    ...(rest.bio !== undefined ? { bio: stripTags(rest.bio) } : {}),
    ...(await filiereRelation(filiereId)),
  });

  return toJeuneDto(updated);
}

// ── Expériences ──────────────────────────────────────────────────────────────

export async function addExperience(
  actor: Actor,
  jeuneId: string,
  input: ExperienceInput,
): Promise<JeuneDto> {
  await loadOwned(actor, jeuneId);
  const ordre = await repository.countExperiences(jeuneId);

  await repository.createExperience({
    jeuneId,
    titre: input.titre,
    structure: input.structure,
    periode: input.periode,
    type: input.type,
    description: stripTags(input.description),
    competences: input.competences,
    ordre,
  });

  return getById(jeuneId);
}

export async function updateExperience(
  actor: Actor,
  jeuneId: string,
  experienceId: string,
  input: Partial<ExperienceInput>,
): Promise<JeuneDto> {
  await loadOwned(actor, jeuneId);

  const experience = await repository.findExperience(experienceId);
  // Double vérification : l'expérience doit appartenir AU profil visé, pas
  // seulement exister — sinon un jeune pourrait éditer l'expérience d'un autre
  // en passant son propre `jeuneId` dans l'URL.
  if (!experience || experience.jeuneId !== jeuneId) {
    throw new NotFoundError("Expérience introuvable.");
  }

  await repository.updateExperience(experienceId, {
    ...input,
    ...(input.description !== undefined ? { description: stripTags(input.description) } : {}),
  });

  return getById(jeuneId);
}

export async function removeExperience(
  actor: Actor,
  jeuneId: string,
  experienceId: string,
): Promise<JeuneDto> {
  await loadOwned(actor, jeuneId);
  const experience = await repository.findExperience(experienceId);
  if (!experience || experience.jeuneId !== jeuneId) {
    throw new NotFoundError("Expérience introuvable.");
  }
  await repository.deleteExperience(experienceId);
  return getById(jeuneId);
}

// ── Liens ────────────────────────────────────────────────────────────────────

export async function addLien(actor: Actor, jeuneId: string, input: LienInput): Promise<JeuneDto> {
  await loadOwned(actor, jeuneId);
  await repository.createLien({ jeuneId, type: input.type, url: input.url });
  return getById(jeuneId);
}

export async function removeLien(actor: Actor, jeuneId: string, lienId: string): Promise<JeuneDto> {
  await loadOwned(actor, jeuneId);
  const lien = await repository.findLien(lienId);
  if (!lien || lien.jeuneId !== jeuneId) throw new NotFoundError("Lien introuvable.");
  await repository.deleteLien(lienId);
  return getById(jeuneId);
}

// ── Recherche de talents (espace entreprise) ─────────────────────────────────

/**
 * Réservée aux entreprises VALIDÉES : une entreprise en attente de validation ne
 * doit pas pouvoir aspirer l'annuaire des jeunes (§7.2). Seuls les profils validés
 * remontent, en vue publique.
 */
export async function searchTalents(
  actor: Actor,
  entrepriseStatus: string | null,
  input: SearchTalentsInput,
): Promise<{ items: JeunePublicDto[]; meta: ApiMeta }> {
  if (actor.role === Role.ENTREPRISE && entrepriseStatus !== "valide") {
    throw new ForbiddenError(
      "Votre compte entreprise doit être validé par OMB pour accéder aux talents.",
    );
  }

  const where = repository.buildJeuneWhere({
    q: input.q,
    filiereId: input.filiereId,
    ville: input.ville,
    niveauEtudes: input.niveauEtudes,
    competences: input.competences,
    scoreMin: input.scoreMin,
    status: JeuneStatus.valide,
  });

  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listJeunes(where, skip, take);
  return { items: rows.map(toJeunePublicDto), meta: buildMeta(input, total) };
}

// ── Administration ───────────────────────────────────────────────────────────

export async function listForAdmin(
  input: ListJeunesInput,
): Promise<{ items: JeuneDto[]; meta: ApiMeta }> {
  const where = repository.buildJeuneWhere({
    q: input.q,
    status: input.status,
    filiereId: input.filiereId,
  });
  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listJeunes(where, skip, take);
  return { items: rows.map(toJeuneDto), meta: buildMeta(input, total) };
}

export async function updateStatus(jeuneId: string, status: JeuneStatus): Promise<JeuneDto> {
  const jeune = await repository.findJeuneById(jeuneId);
  if (!jeune) throw new NotFoundError("Profil introuvable.");
  await repository.updateJeuneStatus(jeuneId, status);
  return getById(jeuneId);
}

async function getById(jeuneId: string): Promise<JeuneDto> {
  const jeune = await repository.findJeuneById(jeuneId);
  if (!jeune) throw new NotFoundError("Profil introuvable.");
  return toJeuneDto(jeune);
}
