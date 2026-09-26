/**
 * Tests d'intégration — parcours de la candidature spontanée.
 *
 * Deux manques du parcours, corrigés ensemble :
 *
 *  • La LISTE des entreprises ouvertes ne disait pas qu'une demande y était
 *    déjà posée. Le candidat ouvrait un calendrier pour y apprendre qu'il n'y
 *    avait rien à faire — une seule réservation active étant permise par
 *    entreprise.
 *  • Le candidat ne pouvait pas RENONCER. `respond` appartient à l'entreprise
 *    sur une demande spontanée, `update` à l'entreprise organisatrice : une
 *    erreur de créneau l'enfermait jusqu'à la réponse du recruteur, sans
 *    pouvoir corriger ni réserver ailleurs chez elle.
 *
 * Le retrait doit par ailleurs RENDRE le créneau : un créneau resté occupé par
 * une demande abandonnée disparaîtrait du calendrier pour tout le monde.
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

/** Journée ouverte par l'entreprise, de 09:00 à 11:00. */
async function ouvrirJournee(entrepriseId: string, date: string) {
  await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { spontaneeOuverte: true, creneauDureeMin: 30, reservationSemaines: 4 },
  });
  await prisma.disponibiliteDate.create({
    data: {
      entrepriseId,
      date: new Date(`${date}T00:00:00.000Z`),
      debut: "09:00",
      fin: "11:00",
    },
  });
}

/** Rend la requête supertest elle-même, et non une promesse : `.expect()` s'y chaîne. */
function reserver(token: string, entrepriseId: string, date: string, heure: string) {
  return request(app)
    .post(`${API}/candidatures-spontanees/entreprises/${entrepriseId}/reservation`)
    .set(...auth(token))
    .send({ date, heure });
}

describe("Demande en cours, annoncée dès la liste", () => {
  it("ne porte aucune demande tant que le candidat n'a rien réservé", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    await ouvrirJournee(entreprise.entrepriseId, isoInDays(3));

    const reponse = await request(app)
      .get(`${API}/candidatures-spontanees/entreprises`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(reponse.body.data).toHaveLength(1);
    expect(reponse.body.data[0].demandeEnCours).toBeNull();
  });

  it("annonce la demande en attente sans ouvrir le calendrier", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const date = isoInDays(3);
    await ouvrirJournee(entreprise.entrepriseId, date);

    await reserver(jeune.accessToken, entreprise.entrepriseId, date, "09:30").expect(201);

    const reponse = await request(app)
      .get(`${API}/candidatures-spontanees/entreprises`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(reponse.body.data[0].demandeEnCours).toMatchObject({
      date,
      heure: "09:30",
      status: "en_attente",
    });
  });

  it("ne montre à un candidat que SES demandes", async () => {
    const entreprise = await createEntreprise(app);
    const premier = await createJeune(app);
    const second = await createJeune(app);
    const date = isoInDays(3);
    await ouvrirJournee(entreprise.entrepriseId, date);

    await reserver(premier.accessToken, entreprise.entrepriseId, date, "09:30").expect(201);

    const reponse = await request(app)
      .get(`${API}/candidatures-spontanees/entreprises`)
      .set(...auth(second.accessToken))
      .expect(200);

    expect(reponse.body.data[0].demandeEnCours).toBeNull();
  });
});

describe("Retrait d'une candidature spontanée", () => {
  it("laisse le candidat retirer sa demande en attente", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const date = isoInDays(3);
    await ouvrirJournee(entreprise.entrepriseId, date);

    const creation = await reserver(
      jeune.accessToken,
      entreprise.entrepriseId,
      date,
      "09:30",
    ).expect(201);

    const retrait = await request(app)
      .post(`${API}/entretiens/${creation.body.data.id}/retrait`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(retrait.body.data.status).toBe("annule");
  });

  it("rend le créneau : il redevient réservable, y compris par un autre", async () => {
    const entreprise = await createEntreprise(app);
    const premier = await createJeune(app);
    const second = await createJeune(app);
    const date = isoInDays(3);
    await ouvrirJournee(entreprise.entrepriseId, date);

    const creation = await reserver(
      premier.accessToken,
      entreprise.entrepriseId,
      date,
      "09:30",
    ).expect(201);

    // Occupé : le créneau a disparu du calendrier des autres candidats.
    const avant = await request(app)
      .get(`${API}/candidatures-spontanees/entreprises/${entreprise.entrepriseId}/creneaux`)
      .set(...auth(second.accessToken))
      .expect(200);
    expect(avant.body.data.journees[0].creneaux).not.toContain("09:30");

    await request(app)
      .post(`${API}/entretiens/${creation.body.data.id}/retrait`)
      .set(...auth(premier.accessToken))
      .expect(200);

    const apres = await request(app)
      .get(`${API}/candidatures-spontanees/entreprises/${entreprise.entrepriseId}/creneaux`)
      .set(...auth(second.accessToken))
      .expect(200);
    expect(apres.body.data.journees[0].creneaux).toContain("09:30");

    // Et le retrait débloque l'auteur, qui n'était plus autorisé qu'à attendre.
    await reserver(premier.accessToken, entreprise.entrepriseId, date, "10:00").expect(201);
  });

  it("prévient l'entreprise, dont la file « à traiter » gardait la demande", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const date = isoInDays(3);
    await ouvrirJournee(entreprise.entrepriseId, date);

    const creation = await reserver(
      jeune.accessToken,
      entreprise.entrepriseId,
      date,
      "09:30",
    ).expect(201);

    await request(app)
      .post(`${API}/entretiens/${creation.body.data.id}/retrait`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    const notifications = await prisma.notification.findMany({
      where: { userId: entreprise.userId },
      orderBy: { createdAt: "desc" },
    });
    expect(notifications[0]?.title).toContain("retiré sa candidature spontanée");
  });

  it("refuse le retrait par un autre candidat", async () => {
    const entreprise = await createEntreprise(app);
    const auteur = await createJeune(app);
    const intrus = await createJeune(app);
    const date = isoInDays(3);
    await ouvrirJournee(entreprise.entrepriseId, date);

    const creation = await reserver(
      auteur.accessToken,
      entreprise.entrepriseId,
      date,
      "09:30",
    ).expect(201);

    await request(app)
      .post(`${API}/entretiens/${creation.body.data.id}/retrait`)
      .set(...auth(intrus.accessToken))
      .expect(403);
  });

  it("refuse le retrait par l'entreprise : elle répond, elle ne retire pas", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const date = isoInDays(3);
    await ouvrirJournee(entreprise.entrepriseId, date);

    const creation = await reserver(
      jeune.accessToken,
      entreprise.entrepriseId,
      date,
      "09:30",
    ).expect(201);

    await request(app)
      .post(`${API}/entretiens/${creation.body.data.id}/retrait`)
      .set(...auth(entreprise.accessToken))
      .expect(403);
  });

  it("refuse le retrait d'une demande déjà tranchée", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const date = isoInDays(3);
    await ouvrirJournee(entreprise.entrepriseId, date);

    const creation = await reserver(
      jeune.accessToken,
      entreprise.entrepriseId,
      date,
      "09:30",
    ).expect(201);

    await request(app)
      .post(`${API}/entretiens/${creation.body.data.id}/reponse`)
      .set(...auth(entreprise.accessToken))
      .send({ status: "accepte" })
      .expect(200);

    await request(app)
      .post(`${API}/entretiens/${creation.body.data.id}/retrait`)
      .set(...auth(jeune.accessToken))
      .expect(403);
  });

  it("refuse le retrait d'une invitation reçue : elle s'accepte ou se refuse", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    const invitation = await prisma.entretien.create({
      data: {
        jeuneId: jeune.jeuneId,
        entrepriseId: entreprise.entrepriseId,
        offreTitre: "Développeur Front-end",
        date: new Date(`${isoInDays(3)}T00:00:00.000Z`),
        heure: "14:00",
        spontanee: false,
        status: "en_attente",
      },
    });

    await request(app)
      .post(`${API}/entretiens/${invitation.id}/retrait`)
      .set(...auth(jeune.accessToken))
      .expect(403);
  });
});
