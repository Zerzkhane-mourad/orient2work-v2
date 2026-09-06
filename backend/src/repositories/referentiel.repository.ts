/**
 * Accès aux référentiels administrables (§7.4).
 *
 * Catégories de formation et filières partagent exactement les mêmes règles
 * (nom unique, ordre d'affichage, activation, suppression bloquée si utilisé).
 * Plutôt que de dupliquer ce CRUD, chaque table expose un `ReferentielAdapter`
 * et le service travaille contre cette interface.
 *
 * Ce qui les distingue reste local : la manière de compter les usages. Une
 * catégorie n'est référencée que par les formations ; une filière l'est par
 * quatre tables.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/** Ligne normalisée, quelle que soit la table sous-jacente. */
export interface ReferentielRow {
  id: string;
  nom: string;
  ordre: number;
  active: boolean;
  createdAt: Date;
  /** Nombre d'enregistrements qui référencent cette entrée. */
  usages: number;
}

export interface ReferentielAdapter {
  /** Libellé au singulier, pour les messages d'erreur. */
  readonly libelle: string;
  /** Liste complète, dans l'ordre d'affichage — alimente les `<select>`. */
  list(activeOnly: boolean): Promise<ReferentielRow[]>;
  /** Tranche paginée, pour l'écran d'administration. */
  paginate(activeOnly: boolean, skip: number, take: number): Promise<[ReferentielRow[], number]>;
  /**
   * Réécrit l'ordre d'affichage : la position de chaque identifiant devient son
   * `ordre`. En une transaction — un ordre à moitié réécrit serait pire que pas
   * de réordonnancement du tout.
   */
  reorder(ids: string[]): Promise<void>;
  findById(id: string): Promise<ReferentielRow | null>;
  findByNom(nom: string): Promise<{ id: string; active: boolean } | null>;
  create(data: { nom: string; ordre: number; active: boolean }): Promise<ReferentielRow>;
  update(
    id: string,
    data: Partial<{ nom: string; ordre: number; active: boolean }>,
  ): Promise<ReferentielRow>;
  remove(id: string): Promise<void>;
  /** Position suivante, pour qu'une nouvelle entrée arrive en fin de liste. */
  nextOrdre(): Promise<number>;
}

/** Tri commun : l'ordre choisi par l'admin, le nom en départage. */
const ORDER_BY = [{ ordre: "asc" as const }, { nom: "asc" as const }];

// ── Catégories de formation ──────────────────────────────────────────────────

const CATEGORIE_COUNT = { _count: { select: { formations: true } } };

type CategorieRaw = {
  id: string;
  nom: string;
  ordre: number;
  active: boolean;
  createdAt: Date;
  _count: { formations: number };
};

function toCategorieRow(row: CategorieRaw): ReferentielRow {
  const { _count, ...rest } = row;
  return { ...rest, usages: _count.formations };
}

export const categoriesFormation: ReferentielAdapter = {
  libelle: "catégorie",

  async list(activeOnly) {
    const rows = await prisma.formationCategorie.findMany({
      where: activeOnly ? { active: true } : {},
      include: CATEGORIE_COUNT,
      orderBy: ORDER_BY,
    });
    return rows.map(toCategorieRow);
  },

  async paginate(activeOnly, skip, take) {
    const where = activeOnly ? { active: true } : {};
    const [rows, total] = await Promise.all([
      prisma.formationCategorie.findMany({
        where,
        include: CATEGORIE_COUNT,
        orderBy: ORDER_BY,
        skip,
        take,
      }),
      prisma.formationCategorie.count({ where }),
    ]);
    return [rows.map(toCategorieRow), total];
  },

  async reorder(ids) {
    await prisma.$transaction(
      ids.map((id, ordre) => prisma.formationCategorie.update({ where: { id }, data: { ordre } })),
    );
  },

  async findById(id) {
    const row = await prisma.formationCategorie.findUnique({
      where: { id },
      include: CATEGORIE_COUNT,
    });
    return row ? toCategorieRow(row) : null;
  },

  findByNom(nom) {
    return prisma.formationCategorie.findUnique({
      where: { nom },
      select: { id: true, active: true },
    });
  },

  async create(data) {
    return toCategorieRow(
      await prisma.formationCategorie.create({ data, include: CATEGORIE_COUNT }),
    );
  },

  async update(id, data) {
    return toCategorieRow(
      await prisma.formationCategorie.update({ where: { id }, data, include: CATEGORIE_COUNT }),
    );
  },

  async remove(id) {
    await prisma.formationCategorie.delete({ where: { id } });
  },

  async nextOrdre() {
    const last = await prisma.formationCategorie.findFirst({
      orderBy: { ordre: "desc" },
      select: { ordre: true },
    });
    return (last?.ordre ?? -1) + 1;
  },
};

// ── Filières ─────────────────────────────────────────────────────────────────

/**
 * Le test est une relation un-à-un, que `_count` ne sait pas compter : on le
 * sélectionne donc, et sa seule présence vaut un usage. Sans quoi une filière
 * portant un test passerait pour libre et sa suppression échouerait plus loin,
 * sur la contrainte de clé étrangère.
 */
const FILIERE_COUNT = {
  _count: { select: { jeunes: true, offres: true, formations: true } },
  test: { select: { id: true } },
  // `satisfies` et non une simple annotation : le compilateur confronte ces
  // relations au schéma tout en gardant le type littéral pour `FiliereRaw`.
  // Sans lui, renommer une relation ne se voyait qu'à l'exécution, en 400.
} satisfies Prisma.FiliereInclude;

type FiliereRaw = Prisma.FiliereGetPayload<{ include: typeof FILIERE_COUNT }>;

/** Une filière est utilisée dès qu'une seule des quatre tables la référence. */
function toFiliereRow(row: FiliereRaw): ReferentielRow {
  const { _count, test, ...rest } = row;
  return {
    ...rest,
    usages: _count.jeunes + _count.offres + _count.formations + (test ? 1 : 0),
  };
}

export const filieres: ReferentielAdapter = {
  libelle: "filière",

  async list(activeOnly) {
    const rows = await prisma.filiere.findMany({
      where: activeOnly ? { active: true } : {},
      include: FILIERE_COUNT,
      orderBy: ORDER_BY,
    });
    return rows.map(toFiliereRow);
  },

  async paginate(activeOnly, skip, take) {
    const where = activeOnly ? { active: true } : {};
    const [rows, total] = await Promise.all([
      prisma.filiere.findMany({ where, include: FILIERE_COUNT, orderBy: ORDER_BY, skip, take }),
      prisma.filiere.count({ where }),
    ]);
    return [rows.map(toFiliereRow), total];
  },

  async reorder(ids) {
    await prisma.$transaction(
      ids.map((id, ordre) => prisma.filiere.update({ where: { id }, data: { ordre } })),
    );
  },

  async findById(id) {
    const row = await prisma.filiere.findUnique({ where: { id }, include: FILIERE_COUNT });
    return row ? toFiliereRow(row) : null;
  },

  findByNom(nom) {
    return prisma.filiere.findUnique({ where: { nom }, select: { id: true, active: true } });
  },

  async create(data) {
    return toFiliereRow(await prisma.filiere.create({ data, include: FILIERE_COUNT }));
  },

  async update(id, data) {
    return toFiliereRow(
      await prisma.filiere.update({ where: { id }, data, include: FILIERE_COUNT }),
    );
  },

  async remove(id) {
    await prisma.filiere.delete({ where: { id } });
  },

  async nextOrdre() {
    const last = await prisma.filiere.findFirst({
      orderBy: { ordre: "desc" },
      select: { ordre: true },
    });
    return (last?.ordre ?? -1) + 1;
  },
};

/** Table des référentiels exposés par l'API, indexée par segment d'URL. */
export const REFERENTIELS = {
  "categories-formation": categoriesFormation,
  filieres,
} as const;

export type ReferentielKey = keyof typeof REFERENTIELS;
