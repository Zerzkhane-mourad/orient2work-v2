/**
 * Comptes d'administration (back-office).
 *
 * Créés ici et non par le formulaire public : un administrateur n'a pas de
 * profil métier à remplir, pas de test de validation à passer, et son adresse
 * est saisie par quelqu'un qui répond déjà de son usage.
 *
 * ── Ce qui protège de l'auto-verrouillage ───────────────────────────────────
 *
 *  • on n'agit jamais sur SON PROPRE compte depuis cet écran — se retirer son
 *    rôle ou se désactiver est l'erreur la plus facile à commettre, et la seule
 *    qu'on ne puisse pas réparer soi-même ;
 *  • le dernier administrateur système actif ne peut être ni désactivé ni
 *    supprimé : il reste toujours quelqu'un capable de rouvrir les droits.
 *
 * ── Pourquoi l'unicité de l'email répond ici, alors qu'elle se tait ailleurs ─
 *
 * L'inscription publique masque les doublons pour ne pas laisser énumérer les
 * comptes. L'appelant est ici un administrateur authentifié qui voit déjà
 * l'annuaire complet : un 409 explicite lui évite de créer un doublon à
 * l'aveugle.
 */
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import type { ApiMeta } from "../lib/http.js";
import { buildMeta, toSkipTake } from "../lib/pagination.js";
import { hashPassword } from "../lib/password.js";
import { plainText } from "../lib/sanitize.js";
import type { Actor } from "../middlewares/authorize.js";
import {
  toUtilisateurAdminDto,
  type UtilisateurAdminDto,
} from "../mappers/utilisateur.mapper.js";
import * as repository from "../repositories/utilisateur.repository.js";
import * as roleRepository from "../repositories/role-admin.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { assertRoleExists } from "./role-admin.service.js";
import type {
  CreateUtilisateurInput,
  ListUtilisateursInput,
  UpdateUtilisateurInput,
} from "../validators/utilisateur.validator.js";

async function getAdminOrThrow(id: string) {
  const user = await repository.findAdminById(id);
  if (!user) throw new NotFoundError("Compte d'administration introuvable.");
  return user;
}

/**
 * Interdit toute action sur son propre compte depuis cet écran.
 *
 * Changer son mot de passe passe par `POST /auth/mot-de-passe`, qui exige
 * l'ancien ; le reste (rôle, activation, suppression) doit venir d'un tiers.
 */
function assertPasSoi(actor: Actor, cibleId: string): void {
  if (actor.id === cibleId) {
    throw new ForbiddenError(
      "Vous ne pouvez pas modifier votre propre compte depuis cet écran. Demandez-le à un autre administrateur.",
    );
  }
}

/**
 * Refuse de retirer le dernier administrateur système actif.
 *
 * Compté en excluant la cible : c'est le nombre de responsables qui RESTERAIENT
 * si l'action aboutissait.
 */
async function assertPasLeDernierResponsable(cible: {
  id: string;
  roleAdmin: { systeme: boolean } | null;
  isActive: boolean;
}): Promise<void> {
  if (!cible.roleAdmin?.systeme || !cible.isActive) return;
  if ((await roleRepository.countActiveSystemAdmins(cible.id)) === 0) {
    throw new ConflictError(
      "C'est le dernier super administrateur actif. Nommez-en un autre avant de retirer celui-ci.",
    );
  }
}

export async function list(
  input: ListUtilisateursInput,
): Promise<{ items: UtilisateurAdminDto[]; meta: ApiMeta }> {
  const where = repository.buildAdminWhere(input);
  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listAdmins(where, skip, take);
  return { items: rows.map(toUtilisateurAdminDto), meta: buildMeta(input, total) };
}

export async function getOne(id: string): Promise<UtilisateurAdminDto> {
  return toUtilisateurAdminDto(await getAdminOrThrow(id));
}

export async function create(input: CreateUtilisateurInput): Promise<UtilisateurAdminDto> {
  if (await userRepository.emailExists(input.email)) {
    throw new ConflictError("Un compte existe déjà avec cette adresse email.");
  }

  // Résolu AVANT la création : un rôle inconnu doit produire un 404 net, pas un
  // échec de contrainte à mi-chemin.
  const roleAdminId = await assertRoleExists(input.roleAdminId);

  return toUtilisateurAdminDto(
    await repository.createAdmin({
      email: input.email,
      nom: plainText(input.nom),
      passwordHash: await hashPassword(input.password),
      roleAdminId,
    }),
  );
}

export async function update(
  actor: Actor,
  id: string,
  input: UpdateUtilisateurInput,
): Promise<UtilisateurAdminDto> {
  assertPasSoi(actor, id);
  const user = await getAdminOrThrow(id);

  if (input.roleAdminId !== undefined || input.actif === false) {
    await assertPasLeDernierResponsable(user);
  }

  const roleAdminId =
    input.roleAdminId !== undefined ? await assertRoleExists(input.roleAdminId) : undefined;

  const updated = await repository.updateAdmin(id, {
    ...(input.nom !== undefined ? { nom: plainText(input.nom) } : {}),
    ...(roleAdminId !== undefined ? { roleAdmin: { connect: { id: roleAdminId } } } : {}),
    ...(input.actif !== undefined ? { isActive: input.actif } : {}),
  });

  // Désactiver doit COUPER les sessions, pas seulement fermer la porte d'entrée :
  // `isActive` n'est relu qu'au rafraîchissement, l'access token en cours
  // resterait valable jusqu'à son expiration. Révoquer les refresh tokens
  // garantit qu'aucune session ne se prolonge au-delà.
  if (input.actif === false) {
    await userRepository.revokeAllRefreshTokens(id);
  }

  return toUtilisateurAdminDto(updated);
}

/**
 * Réinitialise le mot de passe d'un compte d'administration.
 *
 * Toutes les sessions sont révoquées : si la réinitialisation fait suite à une
 * suspicion de compromission, laisser vivre les sessions ouvertes annulerait
 * l'intérêt de l'opération.
 */
export async function resetPassword(
  actor: Actor,
  id: string,
  password: string,
): Promise<UtilisateurAdminDto> {
  assertPasSoi(actor, id);
  const user = await getAdminOrThrow(id);

  await userRepository.updatePassword(user.id, await hashPassword(password));
  await userRepository.revokeAllRefreshTokens(user.id);

  return toUtilisateurAdminDto(user);
}

/**
 * Supprime définitivement un compte d'administration.
 *
 * La désactivation reste la voie normale — elle conserve la date de dernière
 * connexion, donc la trace de ce que le compte a pu faire. La suppression est
 * là pour les créations erronées.
 */
export async function remove(actor: Actor, id: string): Promise<void> {
  assertPasSoi(actor, id);
  const user = await getAdminOrThrow(id);
  await assertPasLeDernierResponsable(user);
  await repository.deleteAdmin(id);
}
