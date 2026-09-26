/**
 * Tests d'intégration — inscription d'une entreprise avec son logo.
 *
 * Ce qui est vérifié ici tient en trois points :
 *  • le logo est réellement OBLIGATOIRE, et refusé s'il n'est pas une image ;
 *  • les couleurs relevées par le navigateur basculent le compte sur le thème
 *    calculé, et rien d'autre ne le fait ;
 *  • aucune tentative refusée ne laisse de fichier derrière elle — la route est
 *    publique, un logo orphelin par requête serait un remplissage de disque à
 *    coût nul pour l'attaquant.
 */
import { readdir } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { UPLOAD_ROOT } from "../src/lib/upload.js";
import { API, VALID_PASSWORD, prisma, resetDatabase } from "./helpers.js";

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

/** PNG 1×1 valide — signature comprise, que `assertRealFileType` vérifie. */
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const CHAMPS = {
  email: "contact@techsolutions.ma",
  password: VALID_PASSWORD,
  nom: "TechSolutions",
  secteur: "Édition de logiciels",
  ville: "Casablanca",
  responsable: "Sophie Martin",
  telephone: "+212 522 000 000",
};

/** Monte la requête multipart, champ par champ — supertest n'a pas d'aide pour cela. */
function inscrire(
  champs: Record<string, string> = {},
  fichier: { buffer: Buffer; nom: string } | null = { buffer: PNG_1x1, nom: "logo.png" },
) {
  const requete = request(app).post(`${API}/auth/inscription/entreprise`);
  for (const [nom, valeur] of Object.entries({ ...CHAMPS, ...champs })) {
    void requete.field(nom, valeur);
  }
  if (fichier) void requete.attach("logo", fichier.buffer, fichier.nom);
  return requete;
}

/** Nombre de fichiers présents dans le dépôt d'uploads. */
async function fichiersStockes(): Promise<number> {
  const entrees = await readdir(UPLOAD_ROOT).catch(() => []);
  return entrees.length;
}

describe("POST /auth/inscription/entreprise — logo", () => {
  it("crée le compte, rattache le logo et calcule le thème", async () => {
    await inscrire({ themeCouleur: "#c81e3a", themeAccent: "#f0a500" }).expect(201);

    const entreprise = await prisma.entreprise.findFirst({
      where: { nom: "TechSolutions" },
      include: { user: true },
    });

    expect(entreprise).not.toBeNull();
    expect(entreprise?.theme).toBe("auto");
    expect(entreprise?.themeCouleur).toBe("#c81e3a");
    expect(entreprise?.themeAccent).toBe("#f0a500");

    // Le logo passe par la route protégée, jamais par une URL de fichier.
    expect(entreprise?.logo).toMatch(/^\/api\/v1\/documents\/[0-9a-f-]{36}\/contenu$/);

    // Le document appartient bien au compte créé.
    const document = await prisma.document.findFirst({ where: { type: "LOGO" } });
    expect(document?.ownerId).toBe(entreprise?.user.id);
    expect(entreprise?.logo).toContain(document!.id);
  });

  it("refuse une inscription sans logo, en désignant le champ", async () => {
    const response = await inscrire({}, null).expect(422);

    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.error.details)).toContain("logo");
    expect(await prisma.entreprise.count()).toBe(0);
    // Le compte ne doit pas exister non plus : tout se joue avant la création.
    expect(await prisma.user.count({ where: { email: CHAMPS.email } })).toBe(0);
  });

  it("refuse un fichier qui n'est pas une image", async () => {
    await inscrire({}, { buffer: Buffer.from("#!/bin/sh\nrm -rf /"), nom: "logo.png" }).expect(415);
    expect(await prisma.entreprise.count()).toBe(0);
  });

  it("garde le thème par défaut quand aucune couleur n'est relevée", async () => {
    // Cas réel : un logo strictement noir et blanc ne donne aucune teinte, le
    // navigateur n'envoie donc pas de couleur.
    await inscrire().expect(201);

    const entreprise = await prisma.entreprise.findFirst({ where: { nom: "TechSolutions" } });
    expect(entreprise?.theme).toBe("marine");
    expect(entreprise?.themeCouleur).toBeNull();
    // Le logo reste obligatoire et rattaché, thème calculé ou non.
    expect(entreprise?.logo).toBeTruthy();
  });

  it("refuse une couleur qui n'est pas un hexadécimal", async () => {
    await inscrire({ themeCouleur: "rouge" }).expect(422);
    expect(await prisma.entreprise.count()).toBe(0);
  });

  describe("aucun fichier orphelin", () => {
    it("supprime le logo quand la validation refuse l'inscription", async () => {
      const avant = await fichiersStockes();

      // Mot de passe trop court : multer a déjà écrit le fichier quand zod refuse.
      await inscrire({ password: "court" }).expect(422);

      expect(await fichiersStockes()).toBe(avant);
      expect(await prisma.document.count()).toBe(0);
    });

    it("supprime le logo de la seconde inscription sur un email déjà pris", async () => {
      await inscrire().expect(201);
      const apresPremiere = await fichiersStockes();

      // Réponse volontairement identique à un succès (anti-énumération), mais
      // rien n'est créé — le fichier ne doit donc pas rester.
      await inscrire({ nom: "Imposteur" }).expect(201);

      expect(await fichiersStockes()).toBe(apresPremiere);
      expect(await prisma.entreprise.count()).toBe(1);
      expect(await prisma.document.count()).toBe(1);
    });
  });
});
