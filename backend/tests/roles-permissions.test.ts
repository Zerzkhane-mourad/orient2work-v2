/**
 * Rôles d'administration, permissions et comptes du back-office.
 *
 * Ce qui est vérifié ici n'est pas « le CRUD fonctionne » mais « les refus
 * tiennent » : un garde de permission qui laisse passer est invisible tant que
 * personne ne l'essaie.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import {
  API,
  auth,
  createAdmin,
  createJeune,
  prisma,
  resetDatabase,
  VALID_PASSWORD,
  type TestAdmin,
} from "./helpers.js";

let app: Express;
/** Administrateur complet — rôle système, tout le catalogue. */
let superAdmin: TestAdmin;

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await resetDatabase();
  superAdmin = await createAdmin(app);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Catalogue de permissions", () => {
  it("est servi groupé par domaine", async () => {
    const reponse = await request(app)
      .get(`${API}/admin/permissions`)
      .set(...auth(superAdmin.accessToken));

    expect(reponse.status).toBe(200);
    const groupes = reponse.body.data as { cle: string; permissions: { code: string }[] }[];
    expect(groupes.length).toBeGreaterThan(0);
    expect(groupes.flatMap((groupe) => groupe.permissions.map((p) => p.code))).toContain(
      "roles:write",
    );
  });
});

describe("Rôle système", () => {
  it("détient tout le catalogue sans que ses permissions soient stockées", async () => {
    const catalogue = await request(app)
      .get(`${API}/admin/permissions`)
      .set(...auth(superAdmin.accessToken));
    const codes = (catalogue.body.data as { permissions: { code: string }[] }[]).flatMap((g) =>
      g.permissions.map((p) => p.code),
    );

    const reponse = await request(app)
      .get(`${API}/admin/roles/${superAdmin.roleAdminId}`)
      .set(...auth(superAdmin.accessToken));

    expect(reponse.status).toBe(200);
    expect(reponse.body.data.systeme).toBe(true);
    expect([...reponse.body.data.permissions].sort()).toEqual([...codes].sort());
    // La colonne, elle, reste vide : les droits sont calculés à la lecture.
    const enBase = await prisma.roleAdmin.findUnique({ where: { id: superAdmin.roleAdminId } });
    expect(enBase?.permissions).toEqual([]);
  });

  it("refuse la modification de ses permissions", async () => {
    const reponse = await request(app)
      .patch(`${API}/admin/roles/${superAdmin.roleAdminId}`)
      .set(...auth(superAdmin.accessToken))
      .send({ permissions: [] });

    expect(reponse.status).toBe(403);
  });

  it("refuse sa suppression", async () => {
    const reponse = await request(app)
      .delete(`${API}/admin/roles/${superAdmin.roleAdminId}`)
      .set(...auth(superAdmin.accessToken));

    expect(reponse.status).toBe(403);
  });
});

describe("POST /admin/roles", () => {
  it("crée un rôle avec ses permissions", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/roles`)
      .set(...auth(superAdmin.accessToken))
      .send({ nom: "Modérateur", description: "Contenus.", permissions: ["faq:read", "faq:write"] });

    expect(reponse.status).toBe(201);
    expect(reponse.body.data.permissions).toEqual(["faq:read", "faq:write"]);
    expect(reponse.body.data.systeme).toBe(false);
    expect(reponse.body.data.utilisateurs).toBe(0);
  });

  it("refuse une permission absente du catalogue", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/roles`)
      .set(...auth(superAdmin.accessToken))
      .send({ nom: "Inventif", permissions: ["facturation:write"] });

    expect(reponse.status).toBe(422);
  });

  it("refuse un champ inconnu", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/roles`)
      .set(...auth(superAdmin.accessToken))
      .send({ nom: "Bidouille", systeme: true });

    expect(reponse.status).toBe(422);
  });

  it("refuse un nom déjà pris", async () => {
    await request(app)
      .post(`${API}/admin/roles`)
      .set(...auth(superAdmin.accessToken))
      .send({ nom: "Modérateur" });

    const reponse = await request(app)
      .post(`${API}/admin/roles`)
      .set(...auth(superAdmin.accessToken))
      .send({ nom: "Modérateur" });

    expect(reponse.status).toBe(409);
  });
});

describe("DELETE /admin/roles/:id", () => {
  it("refuse de supprimer un rôle encore attribué", async () => {
    const porteur = await createAdmin(app, { permissions: ["faq:read"] });

    const reponse = await request(app)
      .delete(`${API}/admin/roles/${porteur.roleAdminId}`)
      .set(...auth(superAdmin.accessToken));

    expect(reponse.status).toBe(409);
  });
});

describe("Gardes de permission", () => {
  it("refuse une route dont la permission manque, tout en laissant passer les autres", async () => {
    const restreint = await createAdmin(app, { permissions: ["faq:read"] });

    const autorise = await request(app)
      .get(`${API}/admin/faq`)
      .set(...auth(restreint.accessToken));
    expect(autorise.status).toBe(200);

    const refuse = await request(app)
      .get(`${API}/admin/jeunes`)
      .set(...auth(restreint.accessToken));
    expect(refuse.status).toBe(403);

    // L'écriture ne suit pas la lecture : `faq:read` seul ne modifie rien.
    const ecriture = await request(app)
      .post(`${API}/admin/faq`)
      .set(...auth(restreint.accessToken))
      .send({ question: "Une question ?", reponse: "Une réponse." });
    expect(ecriture.status).toBe(403);
  });

  it("refuse tout à un administrateur sans rôle", async () => {
    const orphelin = await createAdmin(app, { permissions: [] });
    await prisma.user.update({ where: { id: orphelin.userId }, data: { roleAdminId: null } });

    const reponse = await request(app)
      .get(`${API}/admin/statistiques`)
      .set(...auth(orphelin.accessToken));

    expect(reponse.status).toBe(403);
  });

  /*
   * Le point le plus important du module : les permissions sont relues en base
   * à chaque requête. Si elles voyageaient dans le jeton, ce test passerait
   * pendant les quinze minutes de validité de l'access token.
   */
  it("applique un retrait de permission sans attendre l'expiration du jeton", async () => {
    const restreint = await createAdmin(app, { permissions: ["faq:read"] });

    const avant = await request(app)
      .get(`${API}/admin/faq`)
      .set(...auth(restreint.accessToken));
    expect(avant.status).toBe(200);

    await request(app)
      .patch(`${API}/admin/roles/${restreint.roleAdminId}`)
      .set(...auth(superAdmin.accessToken))
      .send({ permissions: [] });

    // Même jeton, sans reconnexion.
    const apres = await request(app)
      .get(`${API}/admin/faq`)
      .set(...auth(restreint.accessToken));
    expect(apres.status).toBe(403);
  });

  /*
   * Deux permissions gouvernent une route OUVERTE à d'autres publics, sur la
   * seule branche administrateur. Elles ne se comportent pas pareil, et c'est
   * délibéré — d'où deux tests plutôt qu'un.
   */
  it("dégrade le catalogue de formations vers la vue publique sans `formations:read`", async () => {
    // Formation transverse : la filière est facultative, et elle n'a aucune
    // part dans la règle qu'on vérifie ici.
    await prisma.formation.create({
      data: {
        titre: "Brouillon interne",
        description: "Non publiée.",
        contenuHtml: "<p>Secret.</p>",
        categorie: {
          connectOrCreate: { where: { nom: "Divers" }, create: { nom: "Divers" } },
        },
        publiee: false,
      },
    });

    const complet = await request(app)
      .get(`${API}/formations`)
      .set(...auth(superAdmin.accessToken));
    expect(complet.status).toBe(200);
    expect((complet.body.data as { titre: string }[]).map((f) => f.titre)).toContain(
      "Brouillon interne",
    );

    const restreint = await createAdmin(app, { permissions: ["faq:read"] });
    const partiel = await request(app)
      .get(`${API}/formations`)
      .set(...auth(restreint.accessToken));
    // Pas de 403 : la route sert aussi le site vitrine. Le brouillon disparaît.
    expect(partiel.status).toBe(200);
    expect((partiel.body.data as { titre: string }[]).map((f) => f.titre)).not.toContain(
      "Brouillon interne",
    );
  });

  it("refuse la vue globale des entretiens sans `entretiens:read`", async () => {
    const autorise = await createAdmin(app, { permissions: ["entretiens:read"] });
    const ouvert = await request(app)
      .get(`${API}/entretiens`)
      .set(...auth(autorise.accessToken));
    expect(ouvert.status).toBe(200);

    const restreint = await createAdmin(app, { permissions: ["faq:read"] });
    const refuse = await request(app)
      .get(`${API}/entretiens`)
      .set(...auth(restreint.accessToken));
    expect(refuse.status).toBe(403);

    // Le compteur suit la même règle : sans cela il chiffrerait ce que la
    // liste refuse de montrer.
    const compteurs = await request(app)
      .get(`${API}/entretiens/compteurs`)
      .set(...auth(restreint.accessToken));
    expect(compteurs.status).toBe(403);
  });

  it("laisse un jeune consulter ses propres entretiens", async () => {
    // La règle ne doit toucher QUE la branche administrateur.
    const jeune = await createJeune(app);
    const reponse = await request(app)
      .get(`${API}/entretiens`)
      .set(...auth(jeune.accessToken));
    expect(reponse.status).toBe(200);
  });

  it("refuse le back-office à un jeune connecté, permission ou non", async () => {
    const jeune = await createJeune(app);

    const lecture = await request(app)
      .get(`${API}/admin/roles`)
      .set(...auth(jeune.accessToken));
    expect(lecture.status).toBe(403);
  });

  it("refuse une requête sans session", async () => {
    const reponse = await request(app).get(`${API}/admin/roles`);
    expect(reponse.status).toBe(401);
  });
});

describe("POST /admin/utilisateurs", () => {
  it("crée un compte d'administration connectable", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/utilisateurs`)
      .set(...auth(superAdmin.accessToken))
      .send({
        nom: "Karim Bennani",
        email: "karim.bennani@omb.ma",
        password: VALID_PASSWORD,
        roleAdminId: superAdmin.roleAdminId,
      });

    expect(reponse.status).toBe(201);
    expect(reponse.body.data.actif).toBe(true);
    expect(reponse.body.data.role.nom).toBe("Super administrateur");
    // Aucune trace du secret dans la réponse.
    expect(JSON.stringify(reponse.body)).not.toContain(VALID_PASSWORD);

    const connexion = await request(app)
      .post(`${API}/auth/connexion`)
      .send({ email: "karim.bennani@omb.ma", password: VALID_PASSWORD });
    expect(connexion.status).toBe(200);
    expect(connexion.body.data.user.permissions).toContain("roles:write");
  });

  it("refuse un mot de passe trop faible", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/utilisateurs`)
      .set(...auth(superAdmin.accessToken))
      .send({
        nom: "Faible",
        email: "faible@omb.ma",
        password: "azerty",
        roleAdminId: superAdmin.roleAdminId,
      });

    expect(reponse.status).toBe(422);
  });

  it("refuse une adresse déjà utilisée", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/utilisateurs`)
      .set(...auth(superAdmin.accessToken))
      .send({
        nom: "Doublon",
        email: superAdmin.email,
        password: VALID_PASSWORD,
        roleAdminId: superAdmin.roleAdminId,
      });

    expect(reponse.status).toBe(409);
  });

  it("refuse un rôle inexistant", async () => {
    const reponse = await request(app)
      .post(`${API}/admin/utilisateurs`)
      .set(...auth(superAdmin.accessToken))
      .send({
        nom: "Sans rôle",
        email: "sansrole@omb.ma",
        password: VALID_PASSWORD,
        roleAdminId: "00000000-0000-4000-a000-0000000000ff",
      });

    expect(reponse.status).toBe(404);
  });

  it("n'est pas accessible avec la seule permission de lecture", async () => {
    const lecteur = await createAdmin(app, { permissions: ["utilisateurs:read"] });

    const liste = await request(app)
      .get(`${API}/admin/utilisateurs`)
      .set(...auth(lecteur.accessToken));
    expect(liste.status).toBe(200);

    const creation = await request(app)
      .post(`${API}/admin/utilisateurs`)
      .set(...auth(lecteur.accessToken))
      .send({
        nom: "Refusé",
        email: "refuse@omb.ma",
        password: VALID_PASSWORD,
        roleAdminId: superAdmin.roleAdminId,
      });
    expect(creation.status).toBe(403);
  });
});

describe("Garde-fous anti-verrouillage", () => {
  it("refuse d'agir sur son propre compte", async () => {
    const modification = await request(app)
      .patch(`${API}/admin/utilisateurs/${superAdmin.userId}`)
      .set(...auth(superAdmin.accessToken))
      .send({ actif: false });
    expect(modification.status).toBe(403);

    const suppression = await request(app)
      .delete(`${API}/admin/utilisateurs/${superAdmin.userId}`)
      .set(...auth(superAdmin.accessToken));
    expect(suppression.status).toBe(403);
  });

  it("refuse de désactiver le dernier super administrateur actif", async () => {
    // L'appelant n'est PAS super admin : sans cela le refus viendrait de la
    // règle « pas sur son propre compte » et ne prouverait rien.
    const gestionnaire = await createAdmin(app, { permissions: ["utilisateurs:write"] });

    const reponse = await request(app)
      .patch(`${API}/admin/utilisateurs/${superAdmin.userId}`)
      .set(...auth(gestionnaire.accessToken))
      .send({ actif: false });

    expect(reponse.status).toBe(409);
  });

  it("l'autorise dès qu'un second super administrateur existe", async () => {
    const gestionnaire = await createAdmin(app, { permissions: ["utilisateurs:write"] });
    await createAdmin(app);

    const reponse = await request(app)
      .patch(`${API}/admin/utilisateurs/${superAdmin.userId}`)
      .set(...auth(gestionnaire.accessToken))
      .send({ actif: false });

    expect(reponse.status).toBe(200);
    expect(reponse.body.data.actif).toBe(false);
  });
});

describe("Désactivation d'un compte", () => {
  it("ferme la connexion et révoque les sessions ouvertes", async () => {
    const cible = await createAdmin(app, { permissions: ["faq:read"] });

    const desactivation = await request(app)
      .patch(`${API}/admin/utilisateurs/${cible.userId}`)
      .set(...auth(superAdmin.accessToken))
      .send({ actif: false });
    expect(desactivation.status).toBe(200);

    const sessions = await prisma.refreshToken.count({
      where: { userId: cible.userId, revokedAt: null },
    });
    expect(sessions).toBe(0);

    const connexion = await request(app)
      .post(`${API}/auth/connexion`)
      .send({ email: cible.email, password: VALID_PASSWORD });
    expect(connexion.status).toBe(403);
  });
});

describe("POST /admin/utilisateurs/:id/mot-de-passe", () => {
  it("remplace le mot de passe et coupe les sessions", async () => {
    const cible = await createAdmin(app, { permissions: ["faq:read"] });
    const nouveau = "NouveauSecret2026";

    const reponse = await request(app)
      .post(`${API}/admin/utilisateurs/${cible.userId}/mot-de-passe`)
      .set(...auth(superAdmin.accessToken))
      .send({ password: nouveau });
    expect(reponse.status).toBe(200);

    const ancien = await request(app)
      .post(`${API}/auth/connexion`)
      .send({ email: cible.email, password: VALID_PASSWORD });
    expect(ancien.status).toBe(401);

    const connexion = await request(app)
      .post(`${API}/auth/connexion`)
      .send({ email: cible.email, password: nouveau });
    expect(connexion.status).toBe(200);
  });
});
