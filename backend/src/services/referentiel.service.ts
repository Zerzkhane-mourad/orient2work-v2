/**
 * Référentiels administrables (§7.4).
 *
 * Une entrée de référentiel n'est pas une simple étiquette : elle est référencée
 * par d'autres tables. Trois règles en découlent, identiques pour les catégories
 * de formation et les filières —
 *  • le nom est unique et sert de clé fonctionnelle (filtres, listes) ;
 *  • supprimer une entrée utilisée est refusé, on propose de la désactiver ;
 *  • désactiver n'efface rien : l'existant garde son rattachement, l'entrée
 *    cesse simplement d'être proposée à la saisie.
 *
 * La logique est écrite UNE fois, contre `ReferentielAdapter` : ajouter un
 * référentiel se résume à déclarer son adaptateur.
 */
import { ConflictError, NotFoundError, ValidationError } from "../lib/errors.js";
import { buildMeta, toSkipTake, type Pagination } from "../lib/pagination.js";
import type { ApiMeta } from "../lib/http.js";
import { plainText } from "../lib/sanitize.js";
import {
  categoriesFormation,
  filieres,
  type ReferentielAdapter,
  type ReferentielRow,
} from "../repositories/referentiel.repository.js";
import type { CreateEntreeInput, UpdateEntreeInput } from "../validators/referentiel.validator.js";

export interface ReferentielEntreeDto {
  id: string;
  nom: string;
  ordre: number;
  active: boolean;
  /** Nombre d'enregistrements rattachés — conditionne la suppression. */
  usages: number;
  createdAt: string;
}

function toDto(row: ReferentielRow): ReferentielEntreeDto {
  return {
    id: row.id,
    nom: row.nom,
    ordre: row.ordre,
    active: row.active,
    usages: row.usages,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Nettoie et contrôle un nom d'entrée.
 *
 * `plainText` et non `stripTags` : le libellé est affiché tel quel, une filière
 * « Réseaux & télécoms » doit rester lisible et non devenir « &amp; ».
 */
function normaliserNom(brut: string, libelle: string): string {
  const nom = plainText(brut);
  if (nom.length < 2) throw new ValidationError(`Le nom de la ${libelle} est invalide.`);
  return nom;
}

export async function list(
  adapter: ReferentielAdapter,
  activeOnly: boolean,
  pagination: Pagination,
): Promise<{ items: ReferentielEntreeDto[]; meta: ApiMeta }> {
  const { skip, take } = toSkipTake(pagination);
  const [rows, total] = await adapter.paginate(activeOnly, skip, take);
  return { items: rows.map(toDto), meta: buildMeta(pagination, total) };
}

/** Liste complète, sans pagination — pour les `<select>` et les onglets. */
export async function listAll(
  adapter: ReferentielAdapter,
  activeOnly: boolean,
): Promise<ReferentielEntreeDto[]> {
  return (await adapter.list(activeOnly)).map(toDto);
}

/**
 * Déplace une entrée d'un cran dans l'ordre d'affichage.
 *
 * Calculé côté SERVEUR, pour deux raisons :
 *  • le voisin d'une entrée peut se trouver sur une autre page — le client ne
 *    l'a pas forcément sous la main ;
 *  • l'ancienne version échangeait les `ordre` en deux requêtes distinctes ;
 *    si la seconde échouait, deux entrées se retrouvaient au même rang. Ici tout
 *    l'ordre est réécrit en une transaction, donc renuméroté proprement.
 */
export async function move(
  adapter: ReferentielAdapter,
  id: string,
  direction: "haut" | "bas",
): Promise<void> {
  const rows = await adapter.list(false);
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) throw new NotFoundError(`${adapter.libelle} introuvable.`);

  const cible = direction === "haut" ? index - 1 : index + 1;
  // Déjà en bout de liste : rien à faire, ce n'est pas une erreur.
  if (cible < 0 || cible >= rows.length) return;

  const ids = rows.map((row) => row.id);
  [ids[index], ids[cible]] = [ids[cible]!, ids[index]!];
  await adapter.reorder(ids);
}

/** Libellés actifs seuls — format attendu par `GET /referentiels`. */
export async function listNames(adapter: ReferentielAdapter): Promise<string[]> {
  return (await adapter.list(true)).map((row) => row.nom);
}

export async function create(
  adapter: ReferentielAdapter,
  input: CreateEntreeInput,
): Promise<ReferentielEntreeDto> {
  const nom = normaliserNom(input.nom, adapter.libelle);

  if (await adapter.findByNom(nom)) {
    throw new ConflictError(`Une ${adapter.libelle} porte déjà ce nom.`);
  }

  return toDto(
    await adapter.create({
      nom,
      ordre: input.ordre ?? (await adapter.nextOrdre()),
      active: input.active,
    }),
  );
}

/**
 * Clé de rapprochement : minuscules, sans accents, espaces et tirets réduits.
 *
 * `findByNom` cherche à l'identique, ce qui laisserait « Informatique »,
 * « informatique » et « INFORMATIQUE » coexister comme trois filières
 * distinctes — trois listes de talents, trois tests de validation.
 */
function cleDeRapprochement(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s-]+/g, " ")
    .trim();
}

/**
 * Entrée proposée par un visiteur depuis le formulaire d'inscription (§5.1).
 *
 * Renvoie l'entrée EXISTANTE dès qu'un nom équivalent est trouvé, plutôt que
 * d'en créer une seconde : c'est la seule protection contre les doublons sur un
 * champ libre ouvert au public. Sinon l'entrée est créée, active.
 *
 * L'écriture est anonyme par nature — le visiteur n'a pas encore de compte. La
 * route est donc limitée en débit, et le nom passe par le même assainissement
 * que côté back-office.
 */
export async function proposer(
  adapter: ReferentielAdapter,
  nomBrut: string,
): Promise<ReferentielEntreeDto> {
  const nom = normaliserNom(nomBrut, adapter.libelle);
  const cle = cleDeRapprochement(nom);

  // Les désactivées comptent aussi : en recréer une jumelle active serait le
  // moyen le plus simple de contourner une décision d'administration.
  const existante = (await adapter.list(false)).find(
    (row) => cleDeRapprochement(row.nom) === cle,
  );
  if (existante) return toDto(existante);

  return toDto(
    await adapter.create({ nom, ordre: await adapter.nextOrdre(), active: true }),
  );
}

export async function update(
  adapter: ReferentielAdapter,
  id: string,
  input: UpdateEntreeInput,
): Promise<ReferentielEntreeDto> {
  const existing = await adapter.findById(id);
  if (!existing) throw new NotFoundError(`${adapter.libelle} introuvable.`);

  const nom = input.nom !== undefined ? normaliserNom(input.nom, adapter.libelle) : undefined;
  if (nom !== undefined) {
    const collision = await adapter.findByNom(nom);
    if (collision && collision.id !== id) {
      throw new ConflictError(`Une ${adapter.libelle} porte déjà ce nom.`);
    }
  }

  // Renommer est sans risque : les enregistrements pointent sur l'identifiant,
  // pas sur le libellé. Le nouveau nom se propage donc partout d'un coup.
  return toDto(
    await adapter.update(id, {
      ...(nom !== undefined ? { nom } : {}),
      ...(input.ordre !== undefined ? { ordre: input.ordre } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    }),
  );
}

export async function remove(adapter: ReferentielAdapter, id: string): Promise<void> {
  const existing = await adapter.findById(id);
  if (!existing) throw new NotFoundError(`${adapter.libelle} introuvable.`);

  // La base refuserait de toute façon (contrainte `Restrict`), mais un message
  // chiffré vaut mieux qu'une erreur de contrainte traduite en 409 générique.
  if (existing.usages > 0) {
    throw new ConflictError(
      `Cette ${adapter.libelle} est utilisée par ${existing.usages} enregistrement(s). Désactivez-la, ou déplacez-les d'abord.`,
    );
  }

  await adapter.remove(id);
}

/**
 * Contrôle commun aux deux façons de désigner une entrée.
 *
 * Une entrée n'est utilisable à la SAISIE que si elle existe et qu'elle est
 * active — une entrée désactivée reste attachée à l'existant mais ne doit plus
 * pouvoir être choisie. Le champ visé est passé en paramètre pour que l'erreur
 * 422 pointe le bon input côté formulaire.
 */
function assertUsable(
  entree: { id: string; active: boolean } | null,
  adapter: ReferentielAdapter,
  field: string,
): string {
  if (!entree) {
    throw new ValidationError(`${adapter.libelle} inconnue.`, [
      { field, message: `cette ${adapter.libelle} n'existe pas dans le référentiel` },
    ]);
  }
  if (!entree.active) {
    throw new ValidationError(`${adapter.libelle} désactivée.`, [
      { field, message: `cette ${adapter.libelle} est désactivée` },
    ]);
  }
  return entree.id;
}

/**
 * Valide un identifiant fourni par le client.
 *
 * C'est la façon dont une ressource DOIT désigner une entrée de référentiel :
 * l'identifiant est stable, alors qu'un libellé change au premier renommage
 * depuis le back-office. Zod garantit la forme (un UUID), ce contrôle garantit
 * le sens — sans lui, la contrainte de clé étrangère produirait un 500 opaque au
 * lieu d'un 422 sur le bon champ.
 */
export async function assertId(
  adapter: ReferentielAdapter,
  id: string,
  field: string,
): Promise<string> {
  return assertUsable(await adapter.findById(id), adapter, field);
}

/** Raccourcis nommés, pour que les services métier restent lisibles. */
export const assertCategorieId = (id: string) => assertId(categoriesFormation, id, "categorieId");

export const assertFiliereId = (id: string) => assertId(filieres, id, "filiereId");

/** Variante tolérante : `undefined` reste `undefined` (champ facultatif). */
export async function assertFiliereIdOptional(id?: string): Promise<string | undefined> {
  return id === undefined ? undefined : assertFiliereId(id);
}

/**
 * Fragment Prisma rattachant une filière, prêt à être étalé dans un `data`.
 *
 * Champ absent → fragment vide, donc rattachement inchangé sur une mise à jour.
 * Convient aussi bien à la relation obligatoire (offre) qu'aux facultatives.
 */
export async function filiereRelation(
  id?: string,
): Promise<{ filiere?: { connect: { id: string } } }> {
  return id === undefined ? {} : { filiere: { connect: { id: await assertFiliereId(id) } } };
}

/**
 * Variante pour les relations FACULTATIVES, qui accepte en plus `null`.
 *
 *  • absent → rattachement inchangé ;
 *  • `null` → `disconnect` : la question redevient commune à toutes les filières ;
 *  • identifiant → `connect`, après vérification de son existence.
 *
 * Volontairement distincte de `filiereRelation` : le `disconnect` ne doit pas
 * être proposé là où la relation est obligatoire — le compilateur le refuse.
 */
export async function filiereRelationOptionnelle(
  id?: string | null,
): Promise<{ filiere?: { connect: { id: string } } | { disconnect: true } }> {
  return id === null ? { filiere: { disconnect: true } } : filiereRelation(id ?? undefined);
}
