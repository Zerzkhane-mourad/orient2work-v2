/**
 * Tests d'intégration — authentification.
 *
 * On vérifie surtout ce qui compte en sécurité : le hash n'est jamais renvoyé,
 * le refresh token ne sort qu'en cookie httpOnly, la rotation invalide l'ancien
 * token, et l'API ne permet pas d'énumérer les comptes existants.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { API, VALID_PASSWORD, filiereId, prisma, resetDatabase } from "./helpers.js";

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

/**
 * La filière est désignée par IDENTIFIANT : le référentiel vit en base, un
 * libellé n'est plus une clé. `filiereId` est résolu dans chaque test.
 */
const validJeune = {
  email: "nouveau.jeune@test.ma",
  password: VALID_PASSWORD,
  prenom: "Nouveau",
  nom: "Candidat",
  telephone: "+212 600 112 233",
  ville: "Rabat",
  niveauEtudes: "Bac+3",
  etablissement: "ENSIAS",
};

/**
 * Corps d'inscription complet.
 *
 * Tous les champs sont exigés depuis que l'inscription conditionne le test de
 * validation servi au candidat : la filière est donc résolue depuis le
 * référentiel, et non codée en dur.
 */
async function inscriptionJeune(overrides: Record<string, unknown> = {}) {
  return { ...validJeune, filiereId: await filiereId("Informatique"), ...overrides };
}

describe("POST /auth/inscription/jeune", () => {
  it("crée le compte et ne renvoie jamais le mot de passe", async () => {
    const response = await request(app)
      .post(`${API}/auth/inscription/jeune`)
      .send(await inscriptionJeune())
      .expect(201);

    expect(JSON.stringify(response.body)).not.toContain(VALID_PASSWORD);

    const user = await prisma.user.findUnique({ where: { email: validJeune.email } });
    expect(user).not.toBeNull();
    expect(user?.passwordHash).not.toBe(VALID_PASSWORD);
    expect(user?.emailVerified).toBe(false);
  });

  it("rejette un mot de passe trop faible", async () => {
    const response = await request(app)
      .post(`${API}/auth/inscription/jeune`)
      .send(await inscriptionJeune({ password: "azerty" }))
      .expect(422);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejette un champ inconnu (protection contre le mass-assignment)", async () => {
    // `role` n'existe pas dans le schéma : un client ne doit pas pouvoir
    // s'auto-attribuer un rôle en l'ajoutant au payload.
    const response = await request(app)
      .post(`${API}/auth/inscription/jeune`)
      .send(await inscriptionJeune({ role: "ADMIN" }))
      .expect(422);

    expect(response.body.success).toBe(false);
  });

  it("ne révèle pas qu'un email est déjà inscrit", async () => {
    await request(app)
      .post(`${API}/auth/inscription/jeune`)
      .send(await inscriptionJeune())
      .expect(201);

    const second = await request(app)
      .post(`${API}/auth/inscription/jeune`)
      .send(await inscriptionJeune())
      .expect(201);

    // Réponse identique au premier appel : aucune fuite d'information.
    expect(second.body.data.message).toBeDefined();
    expect(await prisma.user.count({ where: { email: validJeune.email } })).toBe(1);
  });
});

describe("POST /auth/connexion", () => {
  beforeEach(async () => {
    await request(app)
      .post(`${API}/auth/inscription/jeune`)
      .send(await inscriptionJeune());
  });

  it("renvoie un access token et pose le refresh token en cookie httpOnly", async () => {
    const response = await request(app)
      .post(`${API}/auth/connexion`)
      .send({ email: validJeune.email, password: VALID_PASSWORD })
      .expect(200);

    expect(response.body.data.accessToken).toBeTypeOf("string");
    // Le refresh token ne doit apparaître nulle part dans le corps.
    expect(response.body.data.refreshToken).toBeUndefined();

    const cookies = response.headers["set-cookie"] as unknown as string[];
    const refreshCookie = cookies.find((cookie) => cookie.startsWith("o2w_refresh="));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("SameSite=Strict");
  });

  it("renvoie le même message pour un email inconnu et un mot de passe erroné", async () => {
    const wrongPassword = await request(app)
      .post(`${API}/auth/connexion`)
      .send({ email: validJeune.email, password: "MauvaisMotDePasse1" })
      .expect(401);

    const unknownEmail = await request(app)
      .post(`${API}/auth/connexion`)
      .send({ email: "inconnu@test.ma", password: VALID_PASSWORD })
      .expect(401);

    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("Rotation du refresh token", () => {
  async function loginAndGetCookies(): Promise<{ cookies: string[]; csrfToken: string }> {
    await request(app)
      .post(`${API}/auth/inscription/jeune`)
      .send(await inscriptionJeune());
    const response = await request(app)
      .post(`${API}/auth/connexion`)
      .send({ email: validJeune.email, password: VALID_PASSWORD })
      .expect(200);

    return {
      cookies: response.headers["set-cookie"] as unknown as string[],
      csrfToken: response.body.data.csrfToken as string,
    };
  }

  it("délivre un nouveau couple de tokens et révoque l'ancien refresh token", async () => {
    const { cookies, csrfToken } = await loginAndGetCookies();

    await request(app)
      .post(`${API}/auth/refresh`)
      .set("Cookie", cookies)
      .set("x-csrf-token", csrfToken)
      .expect(200);

    // Le token initial a été marqué révoqué lors de la rotation.
    const revoked = await prisma.refreshToken.count({ where: { revokedAt: { not: null } } });
    expect(revoked).toBe(1);
  });

  it("révoque toutes les sessions si un refresh token est rejoué", async () => {
    const { cookies, csrfToken } = await loginAndGetCookies();

    await request(app)
      .post(`${API}/auth/refresh`)
      .set("Cookie", cookies)
      .set("x-csrf-token", csrfToken)
      .expect(200);

    // Rejeu du token déjà consommé : traité comme un vol de cookie.
    await request(app)
      .post(`${API}/auth/refresh`)
      .set("Cookie", cookies)
      .set("x-csrf-token", csrfToken)
      .expect(401);

    const actifs = await prisma.refreshToken.count({ where: { revokedAt: null } });
    expect(actifs).toBe(0);
  });

  it("refuse le refresh sans en-tête CSRF", async () => {
    const { cookies } = await loginAndGetCookies();

    const response = await request(app)
      .post(`${API}/auth/refresh`)
      .set("Cookie", cookies)
      .expect(403);

    expect(response.body.error.code).toBe("CSRF_ERROR");
  });
});

describe("GET /auth/moi", () => {
  it("refuse l'accès sans token", async () => {
    const response = await request(app).get(`${API}/auth/moi`).expect(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("refuse un token forgé", async () => {
    const response = await request(app)
      .get(`${API}/auth/moi`)
      .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrIn0.signature")
      .expect(401);

    expect(response.body.error.code).toBe("TOKEN_INVALID");
  });
});

describe("Gestion des erreurs", () => {
  it("renvoie une 404 structurée sur une route inconnue", async () => {
    const response = await request(app).get(`${API}/inexistant`).expect(404);
    expect(response.body).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
  });

  it("rejette un corps JSON dépassant la limite de taille", async () => {
    await request(app)
      .post(`${API}/auth/connexion`)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a@b.ma", password: "x".repeat(20_000) }))
      .expect(413);
  });
});
