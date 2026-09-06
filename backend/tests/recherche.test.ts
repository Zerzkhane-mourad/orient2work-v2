/**
 * Tests d'intégration — recherche globale.
 *
 * L'enjeu n'est pas de trouver : c'est de ne renvoyer QUE ce qui mène quelque
 * part. Un brouillon, une offre expirée ou une entreprise qui n'a plus de
 * créneau ouvriraient sur un écran vide, ou pire, sur du contenu non publié.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import {
  API,
  auth,
  createEntreprise,
  createJeune,
  filiereId,
  isoInDays,
  prisma,
  resetDatabase,
  type TestEntreprise,
} from "./helpers.js";

let app: Express;

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function creerOffre(
  entreprise: TestEntreprise,
  overrides: { titre?: string; status?: "brouillon" | "publiee"; jours?: number } = {},
) {
  return prisma.offre.create({
    data: {
      entrepriseId: entreprise.entrepriseId,
      titre: overrides.titre ?? "Développeur React",
      description: "Poste de développement front-end.",
      type: "Emploi",
      mode: "Hybride",
      ville: "Casablanca",
      niveauDemande: "Bac+3",
      filiereId: await filiereId("Informatique"),
      competences: ["React"],
      dateLimite: new Date(`${isoInDays(overrides.jours ?? 30)}T00:00:00.000Z`),
      status: overrides.status ?? "publiee",
    },
  });
}

async function creerFormation(overrides: { titre?: string; publiee?: boolean } = {}) {
  // La catégorie est un référentiel administrable : la clé étrangère l'exige.
  const categorie = await prisma.formationCategorie.upsert({
    where: { nom: "Employabilité" },
    update: {},
    create: { nom: "Employabilité" },
  });

  return prisma.formation.create({
    data: {
      categorieId: categorie.id,
      titre: overrides.titre ?? "Maîtriser React",
      sousTitre: "Les fondamentaux",
      description: "Apprendre React de zéro.",
      tempsLectureMin: 30,
      niveau: "Débutant",
      instructeur: "OMB",
      contenuHtml: "<p>Contenu</p>",
      publiee: overrides.publiee ?? true,
    },
  });
}

/** Journée ouverte à la réservation — condition d'apparition d'une entreprise. */
async function ouvrirCreneaux(entreprise: TestEntreprise, jours: number) {
  await prisma.entreprise.update({
    where: { id: entreprise.entrepriseId },
    data: { spontaneeOuverte: true },
  });
  await prisma.disponibiliteDate.create({
    data: {
      entrepriseId: entreprise.entrepriseId,
      date: new Date(`${isoInDays(jours)}T00:00:00.000Z`),
      debut: "09:00",
      fin: "12:00",
    },
  });
}

const chercher = (token: string, q: string, extra = "") =>
  request(app)
    .get(`${API}/recherche?q=${encodeURIComponent(q)}${extra}`)
    .set(...auth(token));

/** Groupe d'un type donné, ou `undefined` s'il est absent (donc vide). */
const groupe = (body: { data: { groupes: Array<{ type: string }> } }, type: string) =>
  body.data.groupes.find((g) => g.type === type) as
    | { type: string; total: number; items: Array<{ id: string; titre: string; sousTitre: string }> }
    | undefined;

describe("Recherche globale", () => {
  it("regroupe offres, formations et entreprises sur un même terme", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);

    await creerOffre(entreprise, { titre: "Développeur React" });
    await creerFormation({ titre: "Maîtriser React" });
    await prisma.entreprise.update({
      where: { id: entreprise.entrepriseId },
      data: { nom: "React Studio" },
    });
    await ouvrirCreneaux(entreprise, 5);

    const reponse = await chercher(jeune.accessToken, "react").expect(200);

    expect(groupe(reponse.body, "offre")?.total).toBe(1);
    expect(groupe(reponse.body, "formation")?.total).toBe(1);
    expect(groupe(reponse.body, "entreprise")?.total).toBe(1);
    expect(reponse.body.data.total).toBe(3);
  });

  it("renvoie une forme identique pour les trois types", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await creerOffre(entreprise, { titre: "Développeur React" });

    const reponse = await chercher(jeune.accessToken, "react").expect(200);
    const item = groupe(reponse.body, "offre")!.items[0]!;

    // Un seul rendu côté client suppose un seul contrat : id, titre, sousTitre.
    expect(item.id).toBeTruthy();
    expect(item.titre).toBe("Développeur React");
    expect(item.sousTitre).toContain("Casablanca");
  });

  it("omet les groupes vides plutôt que de les renvoyer à zéro", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await creerOffre(entreprise, { titre: "Développeur React" });

    const reponse = await chercher(jeune.accessToken, "react").expect(200);

    expect(reponse.body.data.groupes.map((g: { type: string }) => g.type)).toEqual(["offre"]);
  });

  it("renvoie un total nul sans résultat", async () => {
    const jeune = await createJeune(app);

    const reponse = await chercher(jeune.accessToken, "zzzzzzz").expect(200);

    expect(reponse.body.data.total).toBe(0);
    expect(reponse.body.data.groupes).toEqual([]);
  });
});

describe("Ce qui ne doit PAS remonter", () => {
  it("ignore une offre en brouillon", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await creerOffre(entreprise, { titre: "Développeur React", status: "brouillon" });

    const reponse = await chercher(jeune.accessToken, "react").expect(200);
    expect(reponse.body.data.total).toBe(0);
  });

  it("ignore une offre dont la date limite est passée", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await creerOffre(entreprise, { titre: "Développeur React", jours: -2 });

    const reponse = await chercher(jeune.accessToken, "react").expect(200);
    expect(reponse.body.data.total).toBe(0);
  });

  it("ignore une formation non publiée", async () => {
    const jeune = await createJeune(app);
    await creerFormation({ titre: "Maîtriser React", publiee: false });

    const reponse = await chercher(jeune.accessToken, "react").expect(200);
    expect(reponse.body.data.total).toBe(0);
  });

  it("ignore une entreprise fermée aux candidatures spontanées", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await prisma.entreprise.update({
      where: { id: entreprise.entrepriseId },
      data: { nom: "React Studio" },
    });
    // Ouverte, mais sans aucune journée programmée : elle n'a pas de créneau.
    await prisma.entreprise.update({
      where: { id: entreprise.entrepriseId },
      data: { spontaneeOuverte: true },
    });

    const reponse = await chercher(jeune.accessToken, "react").expect(200);
    expect(groupe(reponse.body, "entreprise")).toBeUndefined();
  });

  it("ignore une entreprise dont les journées sont toutes passées", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await prisma.entreprise.update({
      where: { id: entreprise.entrepriseId },
      data: { nom: "React Studio" },
    });
    await ouvrirCreneaux(entreprise, -3);

    const reponse = await chercher(jeune.accessToken, "react").expect(200);
    expect(groupe(reponse.body, "entreprise")).toBeUndefined();
  });

  it("ignore une entreprise non validée par OMB", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app, { status: "inscrit" });
    await prisma.entreprise.update({
      where: { id: entreprise.entrepriseId },
      data: { nom: "React Studio" },
    });
    await ouvrirCreneaux(entreprise, 5);

    const reponse = await chercher(jeune.accessToken, "react").expect(200);
    expect(groupe(reponse.body, "entreprise")).toBeUndefined();
  });
});

describe("Bornes et contrat", () => {
  it("borne CHAQUE groupe, et annonce le total réel", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    for (let i = 0; i < 4; i++) {
      await creerOffre(entreprise, { titre: `Développeur React ${i}` });
    }

    const reponse = await chercher(jeune.accessToken, "react", "&limit=2").expect(200);
    const offres = groupe(reponse.body, "offre")!;

    expect(offres.items).toHaveLength(2);
    // Le total sert le lien « voir tous les résultats » : il ne doit pas être
    // celui de la page renvoyée.
    expect(offres.total).toBe(4);
  });

  it("cherche aussi par nom d'entreprise sur les offres", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await prisma.entreprise.update({
      where: { id: entreprise.entrepriseId },
      data: { nom: "Cegedim" },
    });
    await creerOffre(entreprise, { titre: "Chargé de mission" });

    const reponse = await chercher(jeune.accessToken, "cegedim").expect(200);
    expect(groupe(reponse.body, "offre")?.total).toBe(1);
  });

  it("est insensible à la casse", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await creerOffre(entreprise, { titre: "Développeur React" });

    for (const terme of ["REACT", "react", "ReAcT"]) {
      const reponse = await chercher(jeune.accessToken, terme).expect(200);
      expect(groupe(reponse.body, "offre")?.total, terme).toBe(1);
    }
  });

  /**
   * Insensibilité aux ACCENTS — indispensable en français, où l'on tape
   * « developpeur » pour trouver « Développeur ».
   *
   * `mode: "insensitive"` de Prisma ne couvre que la casse : sans traitement
   * dédié, ces deux mots ne se rencontrent jamais.
   */
  it("trouve un titre accentué à partir d'une saisie sans accent", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await creerOffre(entreprise, { titre: "Développeur Réseau" });

    const reponse = await chercher(jeune.accessToken, "developpeur").expect(200);
    expect(groupe(reponse.body, "offre")?.total).toBe(1);
  });

  it("trouve un titre sans accent à partir d'une saisie accentuée", async () => {
    const jeune = await createJeune(app);
    const entreprise = await createEntreprise(app);
    await creerOffre(entreprise, { titre: "Developpeur Reseau" });

    const reponse = await chercher(jeune.accessToken, "développeur").expect(200);
    expect(groupe(reponse.body, "offre")?.total).toBe(1);
  });

  it("refuse un terme vide", async () => {
    const jeune = await createJeune(app);

    await request(app)
      .get(`${API}/recherche`)
      .set(...auth(jeune.accessToken))
      .expect(422);

    await chercher(jeune.accessToken, "   ").expect(422);
  });

  it("exige une authentification", async () => {
    await request(app).get(`${API}/recherche?q=react`).expect(401);
  });
});
