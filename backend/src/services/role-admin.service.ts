/**
 * Rôles d'administration.
 *
 * Un rôle porte un jeu de permissions du catalogue (`src/domain/permissions.ts`)
 * et se distribue aux comptes ADMIN. Trois invariants, tous destinés à empêcher
 * qu'une manipulation du back-office n'enferme la plateforme dehors :
 *
 *  • le rôle SYSTÈME n'est ni supprimable ni modifiable dans ses permissions —
 *    il reste le trousseau de secours, et ses droits suivent le catalogue ;
 *  • un rôle encore porté par des comptes ne se supprime pas : ils perdraient
 *    tout accès sans que personne ne l'ait décidé pour eux ;
 *  • le nom est unique, puisque c'est lui qu'on lit dans l'annuaire.
 */
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import type { ApiMeta } from "../lib/http.js";
import { buildMeta, toSkipTake } from "../lib/pagination.js";
import { plainText } from "../lib/sanitize.js";
import { toRoleAdminDto, type RoleAdminDto } from "../mappers/role-admin.mapper.js";
import * as repository from "../repositories/role-admin.repository.js";
import type {
  CreateRoleInput,
  ListRolesInput,
  UpdateRoleInput,
} from "../validators/role-admin.validator.js";

/**
 * `plainText` et non `stripTags` : un rôle « Modération & contenus » doit rester
 * lisible tel quel, pas devenir « Modération &amp; contenus » dans la liste.
 */
function normaliser(valeur: string): string {
  return plainText(valeur);
}

async function assertNomLibre(nom: string, exceptId?: string): Promise<void> {
  const collision = await repository.findRoleByNom(nom);
  if (collision && collision.id !== exceptId) {
    throw new ConflictError("Un rôle porte déjà ce nom.");
  }
}

async function getRoleOrThrow(id: string) {
  const role = await repository.findRoleById(id);
  if (!role) throw new NotFoundError("Rôle introuvable.");
  return role;
}

export async function list(
  input: ListRolesInput,
): Promise<{ items: RoleAdminDto[]; meta: ApiMeta }> {
  const where = repository.buildRoleWhere(input);
  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listRoles(where, skip, take);
  return { items: rows.map(toRoleAdminDto), meta: buildMeta(input, total) };
}

export async function getOne(id: string): Promise<RoleAdminDto> {
  return toRoleAdminDto(await getRoleOrThrow(id));
}

export async function create(input: CreateRoleInput): Promise<RoleAdminDto> {
  const nom = normaliser(input.nom);
  await assertNomLibre(nom);

  return toRoleAdminDto(
    await repository.createRole({
      nom,
      description: input.description ? normaliser(input.description) : "",
      permissions: input.permissions,
    }),
  );
}

export async function update(id: string, input: UpdateRoleInput): Promise<RoleAdminDto> {
  const role = await getRoleOrThrow(id);

  // Le rôle système reste renommable et redocumentable — c'est cosmétique. Ses
  // PERMISSIONS, non : les rogner reviendrait à se couper la branche sur
  // laquelle on est assis, puisqu'il est le seul dont les droits ne peuvent pas
  // être reconstruits depuis un autre écran.
  if (role.systeme && input.permissions !== undefined) {
    throw new ForbiddenError(
      "Les permissions du rôle système ne se modifient pas : il détient l'intégralité du catalogue.",
    );
  }

  const nom = input.nom !== undefined ? normaliser(input.nom) : undefined;
  if (nom !== undefined) await assertNomLibre(nom, id);

  return toRoleAdminDto(
    await repository.updateRole(id, {
      ...(nom !== undefined ? { nom } : {}),
      ...(input.description !== undefined ? { description: normaliser(input.description) } : {}),
      ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
    }),
  );
}

export async function remove(id: string): Promise<void> {
  const role = await getRoleOrThrow(id);

  if (role.systeme) {
    throw new ForbiddenError("Le rôle système ne peut pas être supprimé.");
  }

  // La contrainte `Restrict` refuserait de toute façon ; le message explicite
  // vaut mieux qu'un 409 générique traduit d'une erreur de clé étrangère.
  if (role._count.utilisateurs > 0) {
    throw new ConflictError(
      `Ce rôle est attribué à ${role._count.utilisateurs} compte(s). Réaffectez-les avant de le supprimer.`,
    );
  }

  await repository.deleteRole(id);
}

/**
 * Vérifie qu'un identifiant de rôle fourni par le client désigne un rôle réel.
 *
 * Appelé avant la création ou la réaffectation d'un compte : sans lui, la
 * contrainte de clé étrangère produirait un 409 opaque au lieu d'un 404 clair.
 */
export async function assertRoleExists(id: string): Promise<string> {
  return (await getRoleOrThrow(id)).id;
}
