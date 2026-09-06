/**
 * Tests d'intégration — offres.
 *
 * L'enjeu principal est l'autorisation : une entreprise ne doit pouvoir toucher
 * qu'à ses propres offres, et la publication doit rester une décision admin.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import {
  API,
  auth,
  createAdmin,
  createEntreprise,
  createJeune,
  createOffre,
  filiereId,
  isoInDays,
  prisma,
  resetDatabase,
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

const validOffre = {
  titre: "Développeur Full-stack",
  type: "Alternance",
  ville: "Casablanca",
  mode: "Hybride",
  niveauDemande: "Bac+5",
  competences: ["Node.js", "React"],
  description: "Une description d'offre suffisamment détaillée pour passer la validation zod.",
  dateLimite: isoInDays(30),
  nombrePostes: 2,
};

/**
 * Payload complet.
 *
 * `filiereId` est résolu à l'appel : la base est remise à zéro entre chaque
 * test, un identifiant mémorisé serait périmé au deuxième.
 */
const offrePayload = async () => ({
  ...validOffre,
  filiereId: await filiereId("Informatique"),
});

describe("POST /offres", () => {
  it("crée une offre en attente de validation, jamais publiée directement", async () => {
    const entreprise = await createEntreprise(app);

    const response = await request(app)
      .post(`${API}/offres`)
      .set(...auth(entreprise.accessToken))
      .send(await offrePayload())
      .expect(201);

    expect(response.body.data.status).toBe("attente_validation");
    expect(response.body.data.entreprise.id).toBe(entreprise.entrepriseId);
  });

  it("refuse la publication directe même si le client la demande", async () => {
    const entreprise = await createEntreprise(app);

    // `publiee` n'est pas dans l'énumération acceptée par le schéma.
    await request(app)
      .post(`${API}/offres`)
      .set(...auth(entreprise.accessToken))
      .send({ ...(await offrePayload()), status: "publiee" })
      .expect(422);
  });

  it("refuse une entreprise non validée par OMB", async () => {
    const entreprise = await createEntreprise(app, { status: "attente_validation" });

    const response = await request(app)
      .post(`${API}/offres`)
      .set(...auth(entreprise.accessToken))
      .send(await offrePayload())
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("refuse un jeune (mauvais rôle)", async () => {
    const jeune = await createJeune(app);

    await request(app)
      .post(`${API}/offres`)
      .set(...auth(jeune.accessToken))
      .send(await offrePayload())
      .expect(403);
  });

  it("rejette une date limite passée", async () => {
    const entreprise = await createEntreprise(app);

    await request(app)
      .post(`${API}/offres`)
      .set(...auth(entreprise.accessToken))
      .send({ ...(await offrePayload()), dateLimite: isoInDays(-10) })
      .expect(422);
  });

  it("rejette une filière hors référentiel", async () => {
    const entreprise = await createEntreprise(app);

    await request(app)
      .post(`${API}/offres`)
      .set(...auth(entreprise.accessToken))
      // UUID bien formé mais absent du référentiel : rejeté par le service, pas
      // par une contrainte de clé étrangère.
      .send({ ...(await offrePayload()), filiereId: "00000000-0000-4000-8000-000000000000" })
      .expect(422);
  });

  it("rejette un identifiant de filière mal formé", async () => {
    const entreprise = await createEntreprise(app);

    await request(app)
      .post(`${API}/offres`)
      .set(...auth(entreprise.accessToken))
      .send({ ...(await offrePayload()), filiereId: "Informatique" })
      .expect(422);
  });
});

describe("Propriété des offres", () => {
  it("empêche une entreprise de modifier l'offre d'une autre", async () => {
    const proprietaire = await createEntreprise(app, { email: "proprio@test.ma" });
    const intruse = await createEntreprise(app, { email: "intruse@test.ma" });
    const offreId = await createOffre(proprietaire.entrepriseId);

    const response = await request(app)
      .patch(`${API}/offres/${offreId}`)
      .set(...auth(intruse.accessToken))
      .send({ titre: "Titre détourné" })
      .expect(403);

    expect(response.body.error.code).toBe("NOT_OWNER");

    const offre = await prisma.offre.findUnique({ where: { id: offreId } });
    expect(offre?.titre).not.toBe("Titre détourné");
  });

  it("empêche une entreprise de supprimer l'offre d'une autre", async () => {
    const proprietaire = await createEntreprise(app, { email: "p2@test.ma" });
    const intruse = await createEntreprise(app, { email: "i2@test.ma" });
    const offreId = await createOffre(proprietaire.entrepriseId);

    await request(app)
      .delete(`${API}/offres/${offreId}`)
      .set(...auth(intruse.accessToken))
      .expect(403);
  });

  it("autorise le propriétaire à modifier son offre", async () => {
    const entreprise = await createEntreprise(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    const response = await request(app)
      .patch(`${API}/offres/${offreId}`)
      .set(...auth(entreprise.accessToken))
      .send({ nombrePostes: 5 })
      .expect(200);

    expect(response.body.data.nombrePostes).toBe(5);
  });
});

describe("GET /offres", () => {
  it("n'expose que les offres publiées au public", async () => {
    const entreprise = await createEntreprise(app);
    await createOffre(entreprise.entrepriseId, { titre: "Offre publiée", status: "publiee" });
    await createOffre(entreprise.entrepriseId, { titre: "Brouillon secret", status: "brouillon" });

    const response = await request(app).get(`${API}/offres`).expect(200);

    const titres = (response.body.data as Array<{ titre: string }>).map((offre) => offre.titre);
    expect(titres).toContain("Offre publiée");
    expect(titres).not.toContain("Brouillon secret");
  });

  it("ignore un filtre `status` fourni par un visiteur anonyme", async () => {
    const entreprise = await createEntreprise(app);
    await createOffre(entreprise.entrepriseId, { titre: "Brouillon secret", status: "brouillon" });

    const response = await request(app).get(`${API}/offres?status=brouillon`).expect(200);
    expect(response.body.data).toHaveLength(0);
  });

  it("renvoie 404 sur le détail d'une offre non publiée", async () => {
    const entreprise = await createEntreprise(app);
    const offreId = await createOffre(entreprise.entrepriseId, { status: "brouillon" });

    await request(app).get(`${API}/offres/${offreId}`).expect(404);
  });

  it("laisse le propriétaire consulter son brouillon", async () => {
    const entreprise = await createEntreprise(app);
    const offreId = await createOffre(entreprise.entrepriseId, { status: "brouillon" });

    await request(app)
      .get(`${API}/offres/${offreId}`)
      .set(...auth(entreprise.accessToken))
      .expect(200);
  });
});

describe("Modération admin", () => {
  it("permet à l'admin de publier une offre", async () => {
    const entreprise = await createEntreprise(app);
    const admin = await createAdmin(app);
    const offreId = await createOffre(entreprise.entrepriseId, { status: "attente_validation" });

    const response = await request(app)
      .patch(`${API}/admin/offres/${offreId}/moderation`)
      .set(...auth(admin.accessToken))
      .send({ status: "publiee" })
      .expect(200);

    expect(response.body.data.status).toBe("publiee");
  });

  it("interdit l'accès aux routes admin à une entreprise", async () => {
    const entreprise = await createEntreprise(app);

    await request(app)
      .get(`${API}/admin/statistiques`)
      .set(...auth(entreprise.accessToken))
      .expect(403);
  });
});
