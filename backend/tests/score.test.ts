/**
 * Tests unitaires — complétion de profil et score d'employabilité.
 *
 * Ces deux fonctions sont dérivées et jamais stockées : elles doivent donner
 * exactement les mêmes valeurs que leur équivalent frontend (src/lib/score.ts).
 */
import { describe, expect, it } from "vitest";
import { computeProfilCompletion, computeScoreJeune } from "../src/domain/profil.js";

const profilComplet = {
  prenom: "Lucas",
  nom: "Dupont",
  telephone: "+212 6 12 34 56 78",
  ville: "Casablanca",
  titre: "Étudiant en Informatique",
  niveauEtudes: "Bac+3",
  etablissement: "ENSIAS",
  filiereId: "11111111-1111-4111-8111-111111111111",
  bio: "Étudiant passionné par le développement web et l'intelligence artificielle.",
  photo: "/api/v1/documents/x/contenu",
  competences: ["React", "TypeScript", "Node.js"],
  langues: ["Français", "Anglais"],
  experiencesCount: 2,
  liensCount: 2,
};

describe("computeProfilCompletion", () => {
  it("renvoie 100 pour un profil entièrement rempli", () => {
    expect(computeProfilCompletion(profilComplet)).toBe(100);
  });

  it("renvoie une valeur faible pour un profil vide", () => {
    const vide = computeProfilCompletion({
      prenom: "",
      nom: "",
      telephone: "",
      ville: "",
      titre: "",
      niveauEtudes: "",
      etablissement: "",
      filiereId: null,
      competences: [],
      langues: [],
      experiencesCount: 0,
      liensCount: 0,
    });
    expect(vide).toBe(0);
  });

  it("ne compte pas une bio trop courte", () => {
    const avecBioCourte = computeProfilCompletion({ ...profilComplet, bio: "Salut" });
    expect(avecBioCourte).toBeLessThan(100);
  });

  it("reste borné entre 0 et 100", () => {
    const score = computeProfilCompletion({ ...profilComplet, competences: Array(50).fill("X") });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("computeScoreJeune", () => {
  it("plafonne à 100 quand tous les leviers sont au maximum", () => {
    const { score } = computeScoreJeune({
      profilCompletion: 100,
      scoreQuiz: 100,
      formationsValidees: 5,
      formationsLuesSeules: 0,
      candidatures: 5,
    });
    expect(score).toBe(100);
  });

  it("renvoie 0 pour un profil vierge", () => {
    const { score } = computeScoreJeune({
      profilCompletion: 0,
      scoreQuiz: null,
      formationsValidees: 0,
      formationsLuesSeules: 0,
      candidatures: 0,
    });
    expect(score).toBe(0);
  });

  it("compte une formation lue non validée pour un demi-crédit", () => {
    const validee = computeScoreJeune({
      profilCompletion: 0,
      scoreQuiz: null,
      formationsValidees: 1,
      formationsLuesSeules: 0,
      candidatures: 0,
    });
    const lue = computeScoreJeune({
      profilCompletion: 0,
      scoreQuiz: null,
      formationsValidees: 0,
      formationsLuesSeules: 1,
      candidatures: 0,
    });
    expect(lue.score * 2).toBe(validee.score);
  });

  it("ne dépasse pas le plafond des formations au-delà de l'objectif", () => {
    const { parts } = computeScoreJeune({
      profilCompletion: 0,
      scoreQuiz: null,
      formationsValidees: 20,
      formationsLuesSeules: 0,
      candidatures: 0,
    });
    const formations = parts.find((part) => part.key === "formations")!;
    expect(formations.points).toBe(formations.max);
  });
});
