/**
 * Tests d'intégration — certificats de formation.
 *
 * Un certificat se mérite : lecture complète PUIS test réussi. On vérifie qu'il
 * reste inaccessible avant, qu'il est délivré après, et que sa référence ne
 * change plus une fois attribuée.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { PDFDocument } from "pdf-lib";
import { createApp } from "../src/app.js";
import { API, auth, createJeune, prisma, resetDatabase, type TestJeune } from "./helpers.js";

let app: Express;
let jeune: TestJeune;
let formationId: string;
let questionIds: string[];

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await resetDatabase();
  jeune = await createJeune(app);

  const categorie = await prisma.formationCategorie.upsert({
    where: { nom: "Soft skills" },
    update: {},
    create: { nom: "Soft skills" },
  });
  const formation = await prisma.formation.create({
    data: {
      titre: "Réussir son entretien d'embauche",
      description: "Préparer et mener un entretien.",
      categorieId: categorie.id,
      contenuHtml: "<h2>Préparer</h2><p>…</p>",
      quiz: {
        create: {
          titre: "Valider ses acquis",
          scoreMinimum: 50,
          questions: {
            create: [
              { enonce: "Q1", options: ["A", "B"], bonnesReponses: [0], ordre: 0 },
              { enonce: "Q2", options: ["A", "B"], bonnesReponses: [1], ordre: 1 },
            ],
          },
        },
      },
    },
    include: { quiz: { include: { questions: { orderBy: { ordre: "asc" } } } } },
  });
  formationId = formation.id;
  questionIds = formation.quiz!.questions.map((q) => q.id);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function lireEnEntier() {
  const response = await request(app)
    .put(`${API}/formations/${formationId}/progression`)
    .set(...auth(jeune.accessToken))
    .send({ progression: 100 });
  expect(response.status).toBe(200);
}

async function passerLeTest(reponses: [number, number]) {
  const response = await request(app)
    .post(`${API}/formations/${formationId}/quiz`)
    .set(...auth(jeune.accessToken))
    .send({
      reponses: questionIds.map((questionId, i) => ({ questionId, reponses: [reponses[i]] })),
    });
  expect(response.status).toBe(200);
  return response.body.data as { reussi: boolean };
}

function telecharger() {
  return request(app)
    .get(`${API}/formations/${formationId}/certificat`)
    .set(...auth(jeune.accessToken))
    .buffer(true)
    .parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => done(null, Buffer.concat(chunks)));
    });
}

describe("Certificat de formation", () => {
  it("est refusé tant que le test n'est pas réussi", async () => {
    expect((await telecharger()).status).toBe(404);

    await lireEnEntier();
    expect((await telecharger()).status).toBe(404);

    expect((await passerLeTest([1, 0])).reussi).toBe(false);
    expect((await telecharger()).status).toBe(404);

    const liste = await request(app)
      .get(`${API}/formations/certificats`)
      .set(...auth(jeune.accessToken));
    expect(liste.status).toBe(200);
    expect(liste.body.data).toEqual([]);
  });

  it("est délivré en PDF une fois le test réussi", async () => {
    await lireEnEntier();
    expect((await passerLeTest([0, 1])).reussi).toBe(true);

    const response = await telecharger();
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toContain(
      'filename="certificat-reussir-son-entretien-d-embauche.pdf"',
    );

    const pdf = await PDFDocument.load(response.body as Buffer);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("Certificat Orient2Work — Réussir son entretien d'embauche");
  });

  it("garde la même référence d'un appel à l'autre", async () => {
    await lireEnEntier();
    await passerLeTest([0, 1]);

    const lister = () =>
      request(app)
        .get(`${API}/formations/certificats`)
        .set(...auth(jeune.accessToken));

    const premiere = await lister();
    expect(premiere.status).toBe(200);
    expect(premiere.body.data).toHaveLength(1);
    const [certificat] = premiere.body.data as Array<{ reference: string; formation: string }>;
    expect(certificat!.formation).toBe("Réussir son entretien d'embauche");
    expect(certificat!.reference).toMatch(/^O2W-CERT-\d{4}-\d{5}$/);

    await telecharger();
    const seconde = await lister();
    expect(seconde.body.data[0].reference).toBe(certificat!.reference);
  });

  it("n'est pas accessible à un autre jeune", async () => {
    await lireEnEntier();
    await passerLeTest([0, 1]);

    const autre = await createJeune(app, { email: "autre@example.com" });
    const response = await request(app)
      .get(`${API}/formations/${formationId}/certificat`)
      .set(...auth(autre.accessToken));
    expect(response.status).toBe(404);
  });
});
