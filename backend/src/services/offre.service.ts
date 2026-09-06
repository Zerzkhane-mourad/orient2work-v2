/**
 * Offres d'emploi / stage.
 *
 * Deux règles métier structurantes :
 *  • une entreprise ne gère QUE ses propres offres (`assertOwnership` sur
 *    `entrepriseId`), y compris en lecture des offres non publiées ;
 *  • la publication est une décision d'administrateur : l'entreprise soumet, OMB
 *    valide (§7.3). Le champ `status` du payload est donc restreint côté zod, et
 *    re-vérifié ici.
 */
import { EntrepriseStatus, OffreStatus, Role } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { buildMeta, toSkipTake } from "../lib/pagination.js";
import { stripTags } from "../lib/sanitize.js";
import { assertOwnership, isAdmin, type Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/offre.repository.js";
import * as entrepriseRepository from "../repositories/entreprise.repository.js";
import { toOffreDto, toOffrePublicDto, type OffreDto } from "../mappers/offre.mapper.js";
import { notify } from "./notification.service.js";
import { filiereRelation, assertFiliereId } from "./referentiel.service.js";
import type { ApiMeta } from "../lib/http.js";
import type {
  CreateOffreInput,
  ListOffresInput,
  ModerateOffreInput,
  UpdateOffreInput,
} from "../validators/offre.validator.js";

/** Statuts qu'un visiteur a le droit de voir. */
const PUBLIC_STATUSES: OffreStatus[] = [OffreStatus.publiee];

export async function listPublic(
  input: ListOffresInput,
): Promise<{ items: OffreDto[]; meta: ApiMeta }> {
  const where = repository.buildOffreWhere({
    q: input.q,
    type: input.type,
    mode: input.mode,
    filiereId: input.filiereId,
    ville: input.ville,
    niveauDemande: input.niveauDemande,
    entrepriseId: input.entrepriseId,
    // Le `status` fourni par le client est volontairement ignoré ici : le public
    // ne voit que les offres publiées, quoi qu'il demande.
    status: PUBLIC_STATUSES,
    ouvertesSeulement: true,
  });

  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listOffres(where, skip, take, input.sort);
  return { items: rows.map(toOffrePublicDto), meta: buildMeta(input, total) };
}

/** Offres de l'entreprise connectée, tous statuts confondus. */
export async function listMine(
  actor: Actor,
  entrepriseId: string,
  input: ListOffresInput,
): Promise<{ items: OffreDto[]; meta: ApiMeta }> {
  assertOwnership(actor, entrepriseId);

  const where = repository.buildOffreWhere({
    q: input.q,
    type: input.type,
    mode: input.mode,
    filiereId: input.filiereId,
    ville: input.ville,
    niveauDemande: input.niveauDemande,
    status: input.status,
    entrepriseId,
  });

  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listOffres(where, skip, take, input.sort);
  return { items: rows.map(toOffreDto), meta: buildMeta(input, total) };
}

export async function listForAdmin(
  input: ListOffresInput,
): Promise<{ items: OffreDto[]; meta: ApiMeta }> {
  const where = repository.buildOffreWhere({
    q: input.q,
    type: input.type,
    mode: input.mode,
    filiereId: input.filiereId,
    ville: input.ville,
    niveauDemande: input.niveauDemande,
    status: input.status,
    entrepriseId: input.entrepriseId,
  });
  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listOffres(where, skip, take, input.sort);
  return { items: rows.map(toOffreDto), meta: buildMeta(input, total) };
}

export async function getOne(actor: Actor | null, id: string): Promise<OffreDto> {
  const offre = await repository.findOffreById(id);
  if (!offre) throw new NotFoundError("Offre introuvable.");

  const privileged =
    actor &&
    (isAdmin(actor) || (actor.role === Role.ENTREPRISE && actor.profileId === offre.entrepriseId));

  if (privileged) return toOffreDto(offre);

  // Une offre non publiée est invisible du public — 404 plutôt que 403, pour ne
  // pas confirmer son existence.
  if (offre.status !== OffreStatus.publiee) throw new NotFoundError("Offre introuvable.");
  return toOffrePublicDto(offre);
}

export async function create(
  actor: Actor,
  entrepriseId: string,
  input: CreateOffreInput,
): Promise<OffreDto> {
  assertOwnership(actor, entrepriseId);

  const entreprise = await entrepriseRepository.findEntrepriseById(entrepriseId);
  if (!entreprise) throw new NotFoundError("Entreprise introuvable.");

  // Garde métier : publier suppose un compte validé par OMB.
  if (!isAdmin(actor) && entreprise.status !== EntrepriseStatus.valide) {
    throw new ForbiddenError(
      "Votre compte entreprise doit être validé par OMB avant de publier une offre.",
    );
  }

  const offre = await repository.createOffre({
    entrepriseId,
    titre: input.titre,
    type: input.type,
    ville: input.ville,
    mode: input.mode,
    niveauDemande: input.niveauDemande,
    // La filière est obligatoire sur une offre : l'identifiant doit désigner une
    // entrée existante ET active du référentiel.
    filiereId: await assertFiliereId(input.filiereId),
    competences: input.competences,
    description: stripTags(input.description),
    dateLimite: input.dateLimite,
    nombrePostes: input.nombrePostes,
    status: input.status,
  });

  return toOffreDto(offre);
}

export async function update(actor: Actor, id: string, input: UpdateOffreInput): Promise<OffreDto> {
  const offre = await repository.findOffreOwner(id);
  if (!offre) throw new NotFoundError("Offre introuvable.");
  assertOwnership(actor, offre.entrepriseId);

  // Une modification substantielle repasse par la validation admin : sans cela,
  // une entreprise pourrait faire valider une offre anodine puis en changer le
  // contenu après coup.
  const { filiereId, ...rest } = input;

  const returnsToReview =
    !isAdmin(actor) &&
    offre.status === OffreStatus.publiee &&
    (rest.titre !== undefined || rest.description !== undefined || filiereId !== undefined);

  const updated = await repository.updateOffre(id, {
    ...rest,
    ...(await filiereRelation(filiereId)),
    ...(rest.description !== undefined ? { description: stripTags(rest.description) } : {}),
    ...(returnsToReview ? { status: OffreStatus.attente_validation, publieeLe: null } : {}),
  });

  return toOffreDto(updated);
}

export async function remove(actor: Actor, id: string): Promise<void> {
  const offre = await repository.findOffreOwner(id);
  if (!offre) throw new NotFoundError("Offre introuvable.");
  assertOwnership(actor, offre.entrepriseId);

  // Une offre ayant reçu des candidatures n'est jamais supprimée (contrainte
  // `Restrict` en base) : on la désactive pour préserver l'historique côté jeunes.
  await repository.updateOffre(id, { status: OffreStatus.desactivee });
}

/** Modération : seul l'admin peut faire passer une offre en `publiee`. */
export async function moderate(id: string, input: ModerateOffreInput): Promise<OffreDto> {
  const offre = await repository.findOffreById(id);
  if (!offre) throw new NotFoundError("Offre introuvable.");

  const updated = await repository.updateOffre(id, {
    status: input.status,
    ...(input.status === OffreStatus.publiee && !offre.publieeLe ? { publieeLe: new Date() } : {}),
  });

  const entreprise = await entrepriseRepository.findEntrepriseById(offre.entrepriseId);
  if (entreprise) {
    await notify({
      userId: entreprise.userId,
      icon: input.status === OffreStatus.publiee ? "check_circle" : "info",
      title: `Offre « ${offre.titre} » : ${input.status}`,
      detail: input.motif ? stripTags(input.motif) : undefined,
      href: "/espace-entreprise/offres",
      accent: input.status === OffreStatus.publiee,
    });
  }

  return toOffreDto(updated);
}

/** Tâche de maintenance : passe en `expiree` les offres dont la date limite est dépassée. */
export async function expireOutdated(): Promise<number> {
  const result = await repository.expireOutdatedOffres();
  return result.count;
}
