/**
 * Tests d'intégration — filtres de la liste d'entretiens.
 *
 * Ces filtres portent la structure de l'écran « Mes entretiens » :
 *  • `from` sépare ce qui vient de ce qui est passé — sans lui, un entretien du
 *    mois dernier trônait en tête de « À venir » et passait pour le prochain ;
 *  • `spontanee` sépare les invitations REÇUES des demandes ENVOYÉES, qui
 *    n'attendent pas la même personne ;
 *  • `ordre` permet à l'historique de s'ouvrir sur le plus récent.
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
  type TestEntreprise,
  type TestJeune,
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

async function entretien(
  entreprise: TestEntreprise,
  jeune: TestJeune,
  options: { jours: number; spontanee?: boolean; status?: "en_attente" | "accepte" | "refuse" },
) {
  return prisma.entretien.create({
    data: {
      jeuneId: jeune.jeuneId,
      entrepriseId: entreprise.entrepriseId,
      offreTitre: options.spontanee ? "Candidature spontanée" : "Développeur frontend",
      date: new Date(`${isoInDays(options.jours)}T00:00:00.000Z`),
      heure: "10:00",
      spontanee: options.spontanee ?? false,
      status: options.status ?? "accepte",
    },
  });
}

const titres = (body: { data: Array<{ offreTitre: string }> }) =>
  body.data.map((e) => e.offreTitre);

describe("Filtre par date", () => {
  it("ne renvoie que les entretiens à venir avec `from`", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    await entretien(entreprise, jeune, { jours: -20 });
    const futur = await entretien(entreprise, jeune, { jours: 5 });

    const reponse = await request(app)
      .get(`${API}/entretiens?status=accepte&from=${isoInDays(0)}`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(reponse.body.data).toHaveLength(1);
    expect(reponse.body.data[0].id).toBe(futur.id);
  });

  it("inclut un entretien du jour même", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    await entretien(entreprise, jeune, { jours: 0 });

    const reponse = await request(app)
      .get(`${API}/entretiens?status=accepte&from=${isoInDays(0)}`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    // Un rendez-vous à 10h ne doit pas disparaître à 11h : la borne est le JOUR.
    expect(reponse.body.data).toHaveLength(1);
  });

  it("borne l'historique à la veille avec `to`", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    const passe = await entretien(entreprise, jeune, { jours: -3 });
    await entretien(entreprise, jeune, { jours: 0 });
    await entretien(entreprise, jeune, { jours: 5 });

    const reponse = await request(app)
      .get(`${API}/entretiens?status=accepte&to=${isoInDays(-1)}`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(reponse.body.data).toHaveLength(1);
    expect(reponse.body.data[0].id).toBe(passe.id);
  });
});

describe("Filtre par origine", () => {
  it("sépare les invitations reçues des demandes envoyées", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    await entretien(entreprise, jeune, { jours: 3, status: "en_attente" });
    await entretien(entreprise, jeune, { jours: 4, status: "en_attente", spontanee: true });

    const invitations = await request(app)
      .get(`${API}/entretiens?status=en_attente&spontanee=false`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    const envoyees = await request(app)
      .get(`${API}/entretiens?status=en_attente&spontanee=true`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(titres(invitations.body)).toEqual(["Développeur frontend"]);
    expect(titres(envoyees.body)).toEqual(["Candidature spontanée"]);
    expect(invitations.body.meta.total).toBe(1);
    expect(envoyees.body.meta.total).toBe(1);
  });

  it("« false » filtre bien, au lieu de tout laisser passer", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    await entretien(entreprise, jeune, { jours: 3, status: "en_attente", spontanee: true });

    // Piège classique de `z.coerce.boolean()` : la chaîne « false » y vaut
    // `true`, et le filtre renverrait exactement l'inverse de la demande.
    const reponse = await request(app)
      .get(`${API}/entretiens?status=en_attente&spontanee=false`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(reponse.body.data).toHaveLength(0);
  });

  it("sans le filtre, les deux origines sont renvoyées", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    await entretien(entreprise, jeune, { jours: 3, status: "en_attente" });
    await entretien(entreprise, jeune, { jours: 4, status: "en_attente", spontanee: true });

    const reponse = await request(app)
      .get(`${API}/entretiens?status=en_attente`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(reponse.body.data).toHaveLength(2);
  });

  it("refuse une valeur qui n'est ni true ni false", async () => {
    const jeune = await createJeune(app);

    await request(app)
      .get(`${API}/entretiens?spontanee=oui`)
      .set(...auth(jeune.accessToken))
      .expect(422);
  });
});

describe("Ordre de tri", () => {
  it("classe du plus proche au plus lointain par défaut", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    await entretien(entreprise, jeune, { jours: 9 });
    await entretien(entreprise, jeune, { jours: 2 });

    const reponse = await request(app)
      .get(`${API}/entretiens?status=accepte`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(reponse.body.data.map((e: { date: string }) => e.date)).toEqual([
      isoInDays(2),
      isoInDays(9),
    ]);
  });

  it("ouvre l'historique sur le plus récent avec `ordre=desc`", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);

    await entretien(entreprise, jeune, { jours: -30 });
    await entretien(entreprise, jeune, { jours: -2 });

    const reponse = await request(app)
      .get(`${API}/entretiens?status=accepte&to=${isoInDays(-1)}&ordre=desc`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(reponse.body.data.map((e: { date: string }) => e.date)).toEqual([
      isoInDays(-2),
      isoInDays(-30),
    ]);
  });
});

describe("Étanchéité", () => {
  it("un jeune ne voit jamais les entretiens d'un autre", async () => {
    const entreprise = await createEntreprise(app);
    const jeune = await createJeune(app);
    const autre = await createJeune(app);

    await entretien(entreprise, autre, { jours: 3 });

    const reponse = await request(app)
      .get(`${API}/entretiens?status=accepte`)
      .set(...auth(jeune.accessToken))
      .expect(200);

    expect(reponse.body.data).toHaveLength(0);
  });
});
