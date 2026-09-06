/**
 * Tests d'intégration — candidatures.
 *
 * Vérifie les gardes métier (profil validé, offre ouverte, unicité) et
 * l'étanchéité entre entreprises : une entreprise ne doit jamais voir les
 * candidatures reçues par une autre.
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
  createOffre,
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

describe("POST /candidatures", () => {
  it("enregistre la candidature d'un jeune validé", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    const response = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId, message: "Je suis très motivé par ce poste." })
      .expect(201);

    expect(response.body.data.status).toBe("envoyee");
    expect(response.body.data.offre.id).toBe(offreId);
  });

  it("refuse un jeune dont le profil n'est pas validé", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app, { status: "test_echoue" });
    const offreId = await createOffre(entreprise.entrepriseId);

    const response = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(403);

    expect(response.body.error.message).toContain("validé");
  });

  it("refuse une seconde candidature à la même offre", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(201);

    const response = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(409);

    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("refuse une candidature sur une offre non publiée", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId, { status: "brouillon" });

    await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(404);
  });

  it("refuse une candidature après la date limite", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId, {
      dateLimite: new Date(Date.now() - 86_400_000),
    });

    await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(409);
  });

  /*
   * Règle §5.8 : un CV doit avoir été déposé AVANT de candidater. Le formulaire
   * n'a pas besoin de le désigner — c'est le dernier CV du compte qui part —
   * mais son absence bloque l'envoi.
   */
  it("refuse la candidature d'un jeune sans CV déposé", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app, { withCv: false });
    const offreId = await createOffre(entreprise.entrepriseId);

    const response = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(403);

    // Le message doit dire QUOI FAIRE : c'est lui que l'interface affiche.
    expect(response.body.error.message).toContain("CV");
  });

  it("joint automatiquement le dernier CV quand aucun n'est précisé", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    const recent = await prisma.document.create({
      data: {
        ownerId: jeune.userId,
        type: "CV",
        filename: "cv-a-jour.pdf",
        storedName: `stored-cv-recent-${jeune.userId}.pdf`,
        mimeType: "application/pdf",
        size: 2048,
      },
    });

    const response = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(201);

    expect(response.body.data.cv.id).toBe(recent.id);
    expect(response.body.data.cv.filename).toBe("cv-a-jour.pdf");
  });

  it("refuse qu'un jeune joigne le CV d'un autre", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app, { email: "candidat1@test.ma" });
    const autre = await createJeune(app, { email: "candidat2@test.ma" });
    const offreId = await createOffre(entreprise.entrepriseId);

    const cvAutre = await prisma.document.create({
      data: {
        ownerId: autre.userId,
        type: "CV",
        filename: "cv.pdf",
        storedName: "stored-cv-autre.pdf",
        mimeType: "application/pdf",
        size: 1024,
      },
    });

    await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId, cvId: cvAutre.id })
      .expect(404);
  });
});

describe("Étanchéité entre entreprises", () => {
  it("ne renvoie à une entreprise que les candidatures de ses propres offres", async () => {
    const entrepriseA = await createEntreprise(app, { email: "a@test.ma" });
    const entrepriseB = await createEntreprise(app, { email: "b@test.ma" });
    const jeune = await createJeune(app);

    const offreA = await createOffre(entrepriseA.entrepriseId, { titre: "Offre A" });
    await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId: offreA })
      .expect(201);

    const response = await request(app)
      .get(`${API}/candidatures/recues`)
      .set(...auth(entrepriseB.accessToken))
      .expect(200);

    expect(response.body.data).toHaveLength(0);
  });

  it("empêche une entreprise tierce de changer le statut d'une candidature", async () => {
    const entrepriseA = await createEntreprise(app, { email: "a2@test.ma" });
    const entrepriseB = await createEntreprise(app, { email: "b2@test.ma" });
    const jeune = await createJeune(app);
    const offreA = await createOffre(entrepriseA.entrepriseId);

    const created = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId: offreA })
      .expect(201);

    const candidatureId = created.body.data.id as string;

    await request(app)
      .patch(`${API}/candidatures/${candidatureId}/statut`)
      .set(...auth(entrepriseB.accessToken))
      .send({ status: "refusee" })
      .expect(403);
  });

  it("empêche un jeune de lire la candidature d'un autre", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app, { email: "j1@test.ma" });
    const autre = await createJeune(app, { email: "j2@test.ma" });
    const offreId = await createOffre(entreprise.entrepriseId);

    const created = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(201);

    await request(app)
      .get(`${API}/candidatures/${created.body.data.id}`)
      .set(...auth(autre.accessToken))
      .expect(404);
  });
});

describe("Cycle de vie", () => {
  it("permet à l'entreprise de faire évoluer le statut", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    const created = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(201);

    const response = await request(app)
      .patch(`${API}/candidatures/${created.body.data.id}/statut`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "preselectionnee" })
      .expect(200);

    expect(response.body.data.status).toBe("preselectionnee");
  });

  it("interdit à l'entreprise de forcer le statut `retiree`", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    const created = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(201);

    // `retiree` est l'action du jeune : elle n'est pas dans l'énumération acceptée.
    await request(app)
      .patch(`${API}/candidatures/${created.body.data.id}/statut`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "retiree" })
      .expect(422);
  });

  it("permet au jeune de retirer sa candidature", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    const created = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(201);

    const response = await request(app)
      .post(`${API}/candidatures/${created.body.data.id}/retrait`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(response.body.data.status).toBe("retiree");
  });
});

/**
 * Synchronisation candidature ↔ entretien.
 *
 * Le bug : le recruteur planifiait un entretien depuis l'écran des
 * candidatures, l'entretien était créé et accepté, mais la candidature restait
 * sur « envoyée ». Le candidat lisait « En attente » avec un rendez-vous
 * confirmé à l'agenda.
 */
describe("Progression de la candidature", () => {
  it("passe à `entretien` quand un entretien est planifié", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    const candidature = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(201);
    expect(candidature.body.data.status).toBe("envoyee");

    await request(app)
      .post(`${API}/entretiens`)
      .set(...auth(entreprise.accessToken))
      .send({
        jeuneId: jeune.jeuneId,
        candidatureId: candidature.body.data.id,
        offreId,
        offreTitre: "Développeur frontend",
        date: isoInDays(7),
        heure: "17:00",
      })
      .expect(201);

    const apres = await prisma.candidature.findUnique({
      where: { id: candidature.body.data.id },
      select: { status: true, vueLe: true },
    });
    expect(apres?.status).toBe("entretien");
    // Planifier suppose d'avoir consulté le dossier.
    expect(apres?.vueLe).not.toBeNull();
  });

  it("ne fait jamais reculer une candidature déjà acceptée", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    const candidature = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(201);

    await prisma.candidature.update({
      where: { id: candidature.body.data.id },
      data: { status: "acceptee" },
    });

    await request(app)
      .post(`${API}/entretiens`)
      .set(...auth(entreprise.accessToken))
      .send({
        jeuneId: jeune.jeuneId,
        candidatureId: candidature.body.data.id,
        offreId,
        offreTitre: "Second entretien",
        date: isoInDays(9),
        heure: "10:00",
      })
      .expect(201);

    const apres = await prisma.candidature.findUnique({
      where: { id: candidature.body.data.id },
      select: { status: true },
    });
    expect(apres?.status).toBe("acceptee");
  });

  it("laisse intacte une candidature sans lien avec l'entretien", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const offreId = await createOffre(entreprise.entrepriseId);

    const candidature = await request(app)
      .post(`${API}/candidatures`)
      .set(...auth(jeune.accessToken))
      .send({ offreId })
      .expect(201);

    // Entretien spontané : aucun `candidatureId`.
    await request(app)
      .post(`${API}/entretiens`)
      .set(...auth(entreprise.accessToken))
      .send({
        jeuneId: jeune.jeuneId,
        offreTitre: "Échange informel",
        date: isoInDays(5),
        heure: "11:00",
      })
      .expect(201);

    const apres = await prisma.candidature.findUnique({
      where: { id: candidature.body.data.id },
      select: { status: true },
    });
    expect(apres?.status).toBe("envoyee");
  });
});
