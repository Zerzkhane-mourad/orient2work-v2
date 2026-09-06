/**
 * Tests d'intégration — lien de réunion.
 *
 * Le point sensible est la candidature spontanée : c'est le CANDIDAT qui crée
 * le rendez-vous, l'entreprise ne peut donc pas fournir la salle de visio à la
 * création. Sans passage par la réponse, un entretien confirmé restait
 * définitivement sans lien — et le rappel envoyé une heure avant partait sans
 * bouton « rejoindre ».
 *
 * On vérifie aussi qui a le droit de poser ce lien : l'organisateur, jamais
 * l'invité.
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

const LIEN = "https://meet.google.com/abc-defg-hij";

/** Demande spontanée en attente : réservée par le jeune, l'entreprise tranche. */
async function demandeSpontanee(entrepriseId: string, jeuneId: string) {
  return prisma.entretien.create({
    data: {
      jeuneId,
      entrepriseId,
      offreTitre: "Candidature spontanée",
      date: new Date(`${isoInDays(3)}T00:00:00.000Z`),
      heure: "10:00",
      spontanee: true,
      status: "en_attente",
    },
  });
}

describe("Acceptation d'une candidature spontanée", () => {
  it("enregistre le lien fourni à l'acceptation et le renvoie au candidat", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const entretien = await demandeSpontanee(entreprise.entrepriseId, jeune.jeuneId);

    const reponse = await request(app)
      .post(`${API}/entretiens/${entretien.id}/reponse`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "accepte", lienReunion: LIEN })
      .expect(200);

    expect(reponse.body.data.status).toBe("accepte");
    expect(reponse.body.data.lienReunion).toBe(LIEN);

    // Le candidat doit le voir de son côté : c'est lui qui doit se connecter.
    const vueJeune = await request(app)
      .get(`${API}/entretiens`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(vueJeune.body.data[0].lienReunion).toBe(LIEN);
  });

  it("accepte sans lien — tout entretien n'est pas en visio", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const entretien = await demandeSpontanee(entreprise.entrepriseId, jeune.jeuneId);

    const reponse = await request(app)
      .post(`${API}/entretiens/${entretien.id}/reponse`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "accepte", commentaire: "Rendez-vous au 12 rue Ibn Sina, 3e étage." })
      .expect(200);

    expect(reponse.body.data.status).toBe("accepte");
    expect(reponse.body.data.lienReunion).toBeUndefined();
    expect(reponse.body.data.commentaire).toContain("Ibn Sina");
  });

  it("refuse un lien mal formé", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const entretien = await demandeSpontanee(entreprise.entrepriseId, jeune.jeuneId);

    await request(app)
      .post(`${API}/entretiens/${entretien.id}/reponse`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "accepte", lienReunion: "meet.google.com/abc" })
      .expect(422);

    // La demande n'a PAS été traitée : elle doit rester à traiter.
    const apres = await prisma.entretien.findUniqueOrThrow({ where: { id: entretien.id } });
    expect(apres.status).toBe("en_attente");
  });

  it("refuse un lien accompagnant un refus", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const entretien = await demandeSpontanee(entreprise.entrepriseId, jeune.jeuneId);

    await request(app)
      .post(`${API}/entretiens/${entretien.id}/reponse`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "refuse", lienReunion: LIEN })
      .expect(422);
  });
});

describe("Qui fournit le lien", () => {
  it("interdit au candidat d'en poser un sur un entretien qu'on lui propose", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    const propose = await request(app)
      .post(`${API}/entretiens`)
      .set(...auth(entreprise.accessToken))
      .send({
        jeuneId: jeune.jeuneId,
        offreTitre: "Développeur frontend",
        date: isoInDays(4),
        heure: "14:00",
      })
      .expect(201);

    // Ici c'est le JEUNE qui répond : il ne convoque pas le recruteur chez lui.
    await request(app)
      .post(`${API}/entretiens/${propose.body.data.id}/reponse`)
      .set(...auth(jeune.accessToken))
      .send({ status: "accepte", lienReunion: LIEN })
      .expect(403);

    const apres = await prisma.entretien.findUniqueOrThrow({
      where: { id: propose.body.data.id },
    });
    expect(apres.lienReunion).toBeNull();
    expect(apres.status).toBe("en_attente");
  });

  it("laisse le candidat accepter normalement, sans lien", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    const propose = await request(app)
      .post(`${API}/entretiens`)
      .set(...auth(entreprise.accessToken))
      .send({
        jeuneId: jeune.jeuneId,
        offreTitre: "Développeur frontend",
        date: isoInDays(4),
        heure: "14:00",
        lienReunion: LIEN,
      })
      .expect(201);

    const reponse = await request(app)
      .post(`${API}/entretiens/${propose.body.data.id}/reponse`)
      .set(...auth(jeune.accessToken))
      .send({ status: "accepte" })
      .expect(200);

    // Le lien posé par l'entreprise à la création se dévoile à l'acceptation.
    expect(reponse.body.data.lienReunion).toBe(LIEN);
  });
});

describe("Pose du lien après coup", () => {
  it("permet à l'entreprise d'ajouter un lien sur un entretien déjà accepté", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const entretien = await demandeSpontanee(entreprise.entrepriseId, jeune.jeuneId);

    await request(app)
      .post(`${API}/entretiens/${entretien.id}/reponse`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "accepte" })
      .expect(200);

    const maj = await request(app)
      .patch(`${API}/entretiens/${entretien.id}`)
      .set(...auth(entreprise.accessToken))
      .send({ lienReunion: LIEN })
      .expect(200);

    expect(maj.body.data.lienReunion).toBe(LIEN);
    // Poser un lien ne remet PAS l'accord du candidat en jeu : seule une
    // nouvelle date le ferait.
    expect(maj.body.data.status).toBe("accepte");
  });

  it("prévient le candidat d'un lien ajouté sans parler de replanification", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const entretien = await demandeSpontanee(entreprise.entrepriseId, jeune.jeuneId);

    await request(app)
      .post(`${API}/entretiens/${entretien.id}/reponse`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "accepte" })
      .expect(200);

    await request(app)
      .patch(`${API}/entretiens/${entretien.id}`)
      .set(...auth(entreprise.accessToken))
      .send({ lienReunion: LIEN })
      .expect(200);

    const notifications = await prisma.notification.findMany({
      where: { userId: jeune.userId },
      orderBy: { createdAt: "desc" },
    });

    expect(notifications[0]?.title).toContain("Lien de connexion");
    expect(notifications.some((n) => n.title.includes("replanifié"))).toBe(false);
  });

  it("interdit au candidat de modifier le lien", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const entretien = await demandeSpontanee(entreprise.entrepriseId, jeune.jeuneId);

    await request(app)
      .post(`${API}/entretiens/${entretien.id}/reponse`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "accepte", lienReunion: LIEN })
      .expect(200);

    await request(app)
      .patch(`${API}/entretiens/${entretien.id}`)
      .set(...auth(jeune.accessToken))
      .send({ lienReunion: "https://malveillant.example/salle" })
      .expect(403);

    const apres = await prisma.entretien.findUniqueOrThrow({ where: { id: entretien.id } });
    expect(apres.lienReunion).toBe(LIEN);
  });
});

describe("Diffusion du lien", () => {
  it("ne dévoile pas le lien tant que la demande n'est pas acceptée", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    await request(app)
      .post(`${API}/entretiens`)
      .set(...auth(entreprise.accessToken))
      .send({
        jeuneId: jeune.jeuneId,
        offreTitre: "Développeur frontend",
        date: isoInDays(4),
        heure: "14:00",
        lienReunion: LIEN,
      })
      .expect(201);

    const vueJeune = await request(app)
      .get(`${API}/entretiens`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    // En base il existe ; l'API le retient jusqu'à l'accord des deux parties.
    expect(vueJeune.body.data[0].status).toBe("en_attente");
    expect(vueJeune.body.data[0].lienReunion).toBeUndefined();
  });
});
