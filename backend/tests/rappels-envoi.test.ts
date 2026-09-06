/**
 * Envoi des rappels — contre la vraie base.
 *
 * Ce que les tests unitaires ne peuvent pas prouver : le verrou tient, et un
 * second passage n'envoie rien.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { instantEntretien } from "../src/domain/rappels.js";
import { envoyerRappelsDus } from "../src/services/rappel.service.js";
import { createEntreprise, createJeune, prisma, resetDatabase } from "./helpers.js";

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

/** Crée un entretien dont le début tombe dans `minutes` minutes. */
async function entretienDans(minutes: number, status: "accepte" | "en_attente" = "accepte") {
  const entreprise = await createEntreprise(app);
  const jeune = await createJeune(app);

  // On part de l'instant voulu, puis on retrouve le couple (date, heure murale)
  // qui le produit dans le fuseau de l'application.
  const debut = new Date(Date.now() + minutes * 60 * 1000);
  const jour = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(debut);
  const heure = new Intl.DateTimeFormat("en-GB", {
    timeZone: env.APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(debut);

  const entretien = await prisma.entretien.create({
    data: {
      jeuneId: jeune.jeuneId,
      entrepriseId: entreprise.entrepriseId,
      offreTitre: "Développeur frontend",
      date: new Date(`${jour}T00:00:00.000Z`),
      heure,
      status,
    },
  });
  return { entretien, jeune, entreprise, debutAttendu: instantEntretien(jour, heure, env.APP_TIMEZONE) };
}

describe("Envoi des rappels", () => {
  it("rappelle un entretien confirmé qui commence dans une heure", async () => {
    const { entretien, jeune, entreprise } = await entretienDans(58);

    const envoyes = await envoyerRappelsDus();
    expect(envoyes).toBe(1);

    // Les DEUX parties sont prévenues dans l'application.
    const pourJeune = await prisma.notification.count({
      where: { userId: jeune.userId, title: { contains: "1 heure" } },
    });
    const pourEntreprise = await prisma.notification.count({
      where: { userId: entreprise.userId, title: { contains: "1 heure" } },
    });
    expect(pourJeune).toBe(1);
    expect(pourEntreprise).toBe(1);

    const apres = await prisma.entretien.findUnique({
      where: { id: entretien.id },
      select: { rappelEnvoyeAt: true },
    });
    expect(apres?.rappelEnvoyeAt).not.toBeNull();
  });

  it("n'envoie jamais deux fois, même sur plusieurs passages", async () => {
    const { jeune } = await entretienDans(58);

    expect(await envoyerRappelsDus()).toBe(1);
    expect(await envoyerRappelsDus()).toBe(0);
    expect(await envoyerRappelsDus()).toBe(0);

    const notifications = await prisma.notification.count({
      where: { userId: jeune.userId, title: { contains: "1 heure" } },
    });
    expect(notifications).toBe(1);
  });

  it("résiste à deux passages SIMULTANÉS (verrou en base)", async () => {
    const { jeune } = await entretienDans(58);

    const [a, b] = await Promise.all([envoyerRappelsDus(), envoyerRappelsDus()]);
    expect(a + b).toBe(1);

    const notifications = await prisma.notification.count({
      where: { userId: jeune.userId, title: { contains: "1 heure" } },
    });
    expect(notifications).toBe(1);
  });

  it("ignore un entretien trop lointain", async () => {
    await entretienDans(180);
    expect(await envoyerRappelsDus()).toBe(0);
  });

  it("ignore un entretien déjà commencé", async () => {
    await entretienDans(-30);
    expect(await envoyerRappelsDus()).toBe(0);
  });

  it("ignore une demande non confirmée", async () => {
    // Rappeler une demande en attente laisserait croire qu'elle est acceptée.
    await entretienDans(58, "en_attente");
    expect(await envoyerRappelsDus()).toBe(0);
  });
});
