/** Utilitaires partagés par les tests d'intégration. */
import request from "supertest";
import type { Express } from "express";
import { EntrepriseStatus, JeuneStatus, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export const prisma = new PrismaClient();

export const API = process.env.API_PREFIX ?? "/api/v1";

/** Mot de passe conforme à la politique (12+, majuscule, minuscule, chiffre). */
export const VALID_PASSWORD = "MotDePasse2026";

/**
 * Vide la base entre les suites. L'ordre suit les dépendances : `TRUNCATE ...
 * CASCADE` sur `users` et les tables racines suffit grâce aux cascades du schéma.
 */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "notifications", "documents", "avis", "formation_progress",
      "formation_quiz_questions", "formation_quiz", "formations",
      "quiz_attempts", "quiz_questions", "entretiens", "candidatures",
      "offres", "experiences", "liens", "jeunes", "entreprises",
      "action_tokens", "refresh_tokens", "users"
    RESTART IDENTITY CASCADE
  `);
}

export interface TestJeune {
  userId: string;
  jeuneId: string;
  email: string;
  accessToken: string;
  /** CV du compte ; `null` quand il a été créé avec `withCv: false`. */
  cvId: string | null;
}

export interface TestEntreprise {
  userId: string;
  entrepriseId: string;
  email: string;
  accessToken: string;
}

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function loginAs(app: Express, email: string): Promise<string> {
  const response = await request(app)
    .post(`${API}/auth/connexion`)
    .send({ email, password: VALID_PASSWORD });

  if (response.status !== 200) {
    throw new Error(`Connexion impossible pour ${email} : ${response.status}`);
  }
  return (response.body as { data: { accessToken: string } }).data.accessToken;
}

/**
 * Identifiant d'une filière du référentiel, amorcée à la volée si absente.
 *
 * Les tests ne présupposent pas l'exécution du seed : la filière référencée par
 * un jeune ou une offre doit exister en base, la clé étrangère l'exige.
 */
export async function filiereId(nom: string): Promise<string> {
  const filiere = await prisma.filiere.upsert({ where: { nom }, update: {}, create: { nom } });
  return filiere.id;
}

export async function createJeune(
  app: Express,
  overrides: {
    email?: string;
    status?: JeuneStatus;
    filiere?: string;
    /** `false` pour un compte SANS CV — le cas que la règle §5.8 doit refuser. */
    withCv?: boolean;
  } = {},
): Promise<TestJeune> {
  const email = overrides.email ?? `jeune.${Date.now()}.${Math.round(Math.random() * 1e6)}@test.ma`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hash(VALID_PASSWORD),
      role: Role.JEUNE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const jeune = await prisma.jeune.create({
    data: {
      userId: user.id,
      prenom: "Test",
      nom: "Candidat",
      telephone: "+212 600 000 000",
      ville: "Casablanca",
      titre: "Étudiant",
      niveauEtudes: "Bac+3",
      etablissement: "ENSIAS",
      filiereId: await filiereId(overrides.filiere ?? "Informatique"),
      competences: ["React", "TypeScript", "SQL"],
      langues: ["Français"],
      status: overrides.status ?? JeuneStatus.valide,
      scoreQuiz: 85,
    },
  });

  /*
   * Un CV est exigé pour candidater (§5.8). Les comptes de test en reçoivent
   * donc un par défaut : sans cela, chaque test de candidature devrait le créer
   * lui-même, et le seul cas intéressant — l'absence de CV — se confondrait
   * avec un oubli de mise en place.
   */
  const cv =
    overrides.withCv === false
      ? null
      : await prisma.document.create({
          data: {
            ownerId: user.id,
            type: "CV",
            filename: "cv.pdf",
            storedName: `stored-cv-${user.id}.pdf`,
            mimeType: "application/pdf",
            size: 1024,
          },
        });

  return {
    userId: user.id,
    jeuneId: jeune.id,
    email,
    accessToken: await loginAs(app, email),
    cvId: cv?.id ?? null,
  };
}

export async function createEntreprise(
  app: Express,
  overrides: { email?: string; status?: EntrepriseStatus } = {},
): Promise<TestEntreprise> {
  const email =
    overrides.email ?? `entreprise.${Date.now()}.${Math.round(Math.random() * 1e6)}@test.ma`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hash(VALID_PASSWORD),
      role: Role.ENTREPRISE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const entreprise = await prisma.entreprise.create({
    data: {
      userId: user.id,
      nom: "Entreprise Test",
      secteur: "Informatique",
      ville: "Casablanca",
      description: "Entreprise de test.",
      responsable: "Responsable Test",
      emailResponsable: email,
      telephone: "+212 500 000 000",
      status: overrides.status ?? EntrepriseStatus.valide,
    },
  });

  return {
    userId: user.id,
    entrepriseId: entreprise.id,
    email,
    accessToken: await loginAs(app, email),
  };
}

export async function createAdmin(app: Express): Promise<{ accessToken: string }> {
  const email = `admin.${Date.now()}@test.ma`;
  await prisma.user.create({
    data: {
      email,
      passwordHash: await hash(VALID_PASSWORD),
      role: Role.ADMIN,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  return { accessToken: await loginAs(app, email) };
}

/** Date `YYYY-MM-DD` dans N jours — pour les dates limites d'offres. */
export function isoInDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0]!;
}

export async function createOffre(
  entrepriseId: string,
  overrides: Partial<{ titre: string; status: string; dateLimite: Date }> = {},
): Promise<string> {
  const offre = await prisma.offre.create({
    data: {
      entrepriseId,
      titre: overrides.titre ?? "Développeur Front-end",
      type: "Stage",
      ville: "Casablanca",
      mode: "Hybride",
      niveauDemande: "Bac+3",
      filiereId: await filiereId("Développement web"),
      competences: ["React"],
      description: "Une description d'offre suffisamment longue pour la validation.",
      dateLimite: overrides.dateLimite ?? new Date(Date.now() + 30 * 86_400_000),
      nombrePostes: 1,
      status: (overrides.status as "publiee") ?? "publiee",
      publieeLe: new Date(),
    },
  });
  return offre.id;
}

export function auth(token: string): [string, string] {
  return ["Authorization", `Bearer ${token}`];
}
