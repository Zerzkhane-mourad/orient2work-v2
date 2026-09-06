/**
 * Tests d'intégration — questions fréquentes.
 *
 * Deux enjeux, et deux seulement :
 *
 *  1. La séparation des publics. La vitrine ne doit JAMAIS laisser filtrer une
 *     question dépubliée — c'est le seul moyen pour l'administrateur de retirer
 *     une réponse devenue fausse sans la perdre.
 *  2. L'ordre. Il est administré à la main, donc il doit rester dense et stable
 *     après une suppression ou un déplacement — sinon les boutons « monter » et
 *     « descendre » finissent par ne plus rien faire.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { API, auth, createAdmin, createJeune, prisma, resetDatabase } from "./helpers.js";

let app: Express;
let adminToken: string;

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await resetDatabase();
  await prisma.faq.deleteMany();
  adminToken = (await createAdmin(app)).accessToken;
});

afterAll(async () => {
  await prisma.$disconnect();
});

interface FaqAdmin {
  id: string;
  question: string;
  reponse: string;
  ordre: number;
  publiee: boolean;
}

async function ajouter(question: string, publiee = true): Promise<FaqAdmin> {
  const reponse = await request(app)
    .post(`${API}/admin/faq`)
    .set(...auth(adminToken))
    .send({ question, reponse: `Réponse à la question ${question}.`, publiee });

  expect(reponse.status).toBe(201);
  return (reponse.body as { data: FaqAdmin }).data;
}

async function questionsPubliques(): Promise<string[]> {
  const reponse = await request(app).get(`${API}/faq`);
  expect(reponse.status).toBe(200);
  return (reponse.body as { data: Array<{ question: string }> }).data.map((f) => f.question);
}

async function questionsAdmin(): Promise<string[]> {
  const reponse = await request(app)
    .get(`${API}/admin/faq`)
    .set(...auth(adminToken));
  expect(reponse.status).toBe(200);
  return (reponse.body as { data: FaqAdmin[] }).data.map((f) => f.question);
}

describe("GET /faq (vitrine)", () => {
  it("renvoie une liste vide quand rien n'est saisi", async () => {
    expect(await questionsPubliques()).toEqual([]);
  });

  it("masque les questions dépubliées", async () => {
    await ajouter("Visible");
    await ajouter("Brouillon", false);

    expect(await questionsPubliques()).toEqual(["Visible"]);
    // Elle n'est pas perdue pour autant : le back-office la voit toujours.
    expect(await questionsAdmin()).toEqual(["Visible", "Brouillon"]);
  });

  it("n'expose ni l'ordre ni l'état de publication", async () => {
    await ajouter("Comment m'inscrire ?");

    const reponse = await request(app).get(`${API}/faq`);
    const premiere = (reponse.body as { data: object[] }).data[0]!;
    expect(Object.keys(premiere).sort()).toEqual(["id", "question", "reponse"]);
  });

  it("respecte l'ordre défini au back-office", async () => {
    const premiere = await ajouter("A");
    await ajouter("B");

    await request(app)
      .post(`${API}/admin/faq/${premiere.id}/position`)
      .set(...auth(adminToken))
      .send({ direction: "bas" });

    expect(await questionsPubliques()).toEqual(["B", "A"]);
  });

  it("reste ouverte sans session", async () => {
    await ajouter("Publique");
    const reponse = await request(app).get(`${API}/faq`);
    expect(reponse.status).toBe(200);
  });
});

describe("POST /admin/faq", () => {
  it("place la nouvelle question EN FIN de liste", async () => {
    await ajouter("Premiere");
    await ajouter("Deuxieme");
    const troisieme = await ajouter("Troisieme");

    // Sans le calcul du rang maximum, elle arriverait à 0 et passerait devant.
    expect(troisieme.ordre).toBe(2);
    expect(await questionsAdmin()).toEqual(["Premiere", "Deuxieme", "Troisieme"]);
  });

  it("est publiée par défaut", async () => {
    const creee = await ajouter("Sans mention de publication");
    expect(creee.publiee).toBe(true);
  });

  it("refuse une question vide", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/faq`)
      .set(...auth(adminToken))
      .send({ question: "   ", reponse: "Une réponse." });

    expect(reponse.status).toBe(422);
  });

  it("refuse une réponse trop longue", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/faq`)
      .set(...auth(adminToken))
      .send({ question: "Trop long ?", reponse: "x".repeat(2001) });

    expect(reponse.status).toBe(422);
  });

  it("refuse un champ inconnu", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/faq`)
      .set(...auth(adminToken))
      .send({ question: "Question", reponse: "Réponse.", ordre: 99 });

    // `ordre` est calculé par le serveur : l'accepter laisserait un client
    // casser la numérotation dense.
    expect(reponse.status).toBe(422);
  });
});

describe("PATCH /admin/faq/:id", () => {
  it("modifie la réponse sans toucher au reste", async () => {
    const creee = await ajouter("Question");

    const reponse = await request(app)
      .patch(`${API}/admin/faq/${creee.id}`)
      .set(...auth(adminToken))
      .send({ reponse: "Réponse corrigée." });

    expect(reponse.status).toBe(200);
    const modifiee = (reponse.body as { data: FaqAdmin }).data;
    expect(modifiee.reponse).toBe("Réponse corrigée.");
    expect(modifiee.question).toBe("Question");
    expect(modifiee.ordre).toBe(creee.ordre);
  });

  it("dépublie sans supprimer", async () => {
    const creee = await ajouter("A retirer");

    await request(app)
      .patch(`${API}/admin/faq/${creee.id}`)
      .set(...auth(adminToken))
      .send({ publiee: false });

    expect(await questionsPubliques()).toEqual([]);
    expect(await questionsAdmin()).toEqual(["A retirer"]);
  });

  it("refuse un corps vide", async () => {
    const creee = await ajouter("Question");
    const reponse = await request(app)
      .patch(`${API}/admin/faq/${creee.id}`)
      .set(...auth(adminToken))
      .send({});

    expect(reponse.status).toBe(422);
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const reponse = await request(app)
      .patch(`${API}/admin/faq/6d2f7f2e-0000-4000-8000-000000000000`)
      .set(...auth(adminToken))
      .send({ publiee: false });

    expect(reponse.status).toBe(404);
  });
});

describe("POST /admin/faq/:id/position", () => {
  it("descend une question et renvoie la liste réordonnée", async () => {
    const premiere = await ajouter("A");
    await ajouter("B");
    await ajouter("C");

    const reponse = await request(app)
      .post(`${API}/admin/faq/${premiere.id}/position`)
      .set(...auth(adminToken))
      .send({ direction: "bas" });

    expect(reponse.status).toBe(200);
    const liste = (reponse.body as { data: FaqAdmin[] }).data;
    expect(liste.map((f) => f.question)).toEqual(["B", "A", "C"]);
    // Numérotation dense : c'est elle qui garde les déplacements suivants sûrs.
    expect(liste.map((f) => f.ordre)).toEqual([0, 1, 2]);
  });

  it("remonte une question", async () => {
    await ajouter("A");
    await ajouter("B");
    const troisieme = await ajouter("C");

    await request(app)
      .post(`${API}/admin/faq/${troisieme.id}/position`)
      .set(...auth(adminToken))
      .send({ direction: "haut" });

    expect(await questionsAdmin()).toEqual(["A", "C", "B"]);
  });

  it("refuse de sortir de la liste", async () => {
    const premiere = await ajouter("A");
    await ajouter("B");

    const reponse = await request(app)
      .post(`${API}/admin/faq/${premiere.id}/position`)
      .set(...auth(adminToken))
      .send({ direction: "haut" });

    // 422 et non 404 : la question existe, c'est le mouvement qui est impossible.
    expect(reponse.status).toBe(422);
    expect(await questionsAdmin()).toEqual(["A", "B"]);
  });

  it("reste correct après une suppression au milieu", async () => {
    const a = await ajouter("A");
    const b = await ajouter("B");
    const c = await ajouter("C");

    await request(app)
      .delete(`${API}/admin/faq/${b.id}`)
      .set(...auth(adminToken));

    // Les rangs restants sont 0 et 2 : un simple échange de valeurs marcherait
    // encore, mais laisserait un trou. La réécriture complète le comble.
    const reponse = await request(app)
      .post(`${API}/admin/faq/${c.id}/position`)
      .set(...auth(adminToken))
      .send({ direction: "haut" });

    const liste = (reponse.body as { data: FaqAdmin[] }).data;
    expect(liste.map((f) => f.question)).toEqual(["C", "A"]);
    expect(liste.map((f) => f.ordre)).toEqual([0, 1]);
    expect(a.ordre).toBe(0);
  });
});

describe("DELETE /admin/faq/:id", () => {
  it("supprime la question", async () => {
    const creee = await ajouter("A supprimer");

    const reponse = await request(app)
      .delete(`${API}/admin/faq/${creee.id}`)
      .set(...auth(adminToken));

    expect(reponse.status).toBe(204);
    expect(await questionsAdmin()).toEqual([]);
  });

  it("renvoie 404 deux fois de suite", async () => {
    const creee = await ajouter("A supprimer");
    await request(app)
      .delete(`${API}/admin/faq/${creee.id}`)
      .set(...auth(adminToken));

    const seconde = await request(app)
      .delete(`${API}/admin/faq/${creee.id}`)
      .set(...auth(adminToken));

    expect(seconde.status).toBe(404);
  });
});

describe("Accès au back-office", () => {
  it("refuse un visiteur non connecté", async () => {
    const reponse = await request(app).get(`${API}/admin/faq`);
    expect(reponse.status).toBe(401);
  });

  it("refuse un jeune connecté", async () => {
    const jeune = await createJeune(app);

    const lecture = await request(app)
      .get(`${API}/admin/faq`)
      .set(...auth(jeune.accessToken));
    expect(lecture.status).toBe(403);

    const ecriture = await request(app)
      .post(`${API}/admin/faq`)
      .set(...auth(jeune.accessToken))
      .send({ question: "Question", reponse: "Réponse." });
    expect(ecriture.status).toBe(403);
  });
});
