/**
 * Règles de transition d'une candidature.
 *
 * Logique pure : qui peut poser quel statut, et depuis quel état. Deux
 * invariants portent tout le reste — le retrait appartient au candidat, et le
 * suivi affiché ne recule jamais.
 */
import { describe, expect, it } from "vitest";
import { CandidatureStatus } from "@prisma/client";
import {
  doitAvancerVers,
  LIBELLES,
  transitionRecruteurAutorisee,
  transitionsRecruteur,
} from "../src/domain/candidatures.js";

describe("Progression automatique (entretien planifié)", () => {
  it("avance le long du parcours", () => {
    expect(doitAvancerVers("envoyee", "entretien")).toBe(true);
    expect(doitAvancerVers("vue", "preselectionnee")).toBe(true);
  });

  it("ne recule jamais et ne touche pas les issues", () => {
    expect(doitAvancerVers("entretien", "vue")).toBe(false);
    expect(doitAvancerVers("acceptee", "entretien")).toBe(false);
    expect(doitAvancerVers("refusee", "entretien")).toBe(false);
    expect(doitAvancerVers("retiree", "entretien")).toBe(false);
    expect(doitAvancerVers("entretien", "entretien")).toBe(false);
  });
});

describe("Transitions ouvertes au recruteur", () => {
  it("propose les étapes suivantes et les deux issues", () => {
    expect(transitionsRecruteur("envoyee")).toEqual([
      "vue",
      "preselectionnee",
      "entretien",
      "acceptee",
      "refusee",
    ]);
    expect(transitionsRecruteur("entretien")).toEqual(["acceptee", "refusee"]);
  });

  it("n'offre RIEN sur une candidature retirée", () => {
    // Le retrait appartient au candidat : le recruteur ne le renverse pas.
    expect(transitionsRecruteur("retiree")).toEqual([]);
    expect(transitionRecruteurAutorisee("retiree", "acceptee")).toBe(false);
    expect(transitionRecruteurAutorisee("retiree", "refusee")).toBe(false);
  });

  it("permet de corriger une issue par l'autre, sans rouvrir le parcours", () => {
    expect(transitionsRecruteur("acceptee")).toEqual(["refusee"]);
    expect(transitionsRecruteur("refusee")).toEqual(["acceptee"]);
    expect(transitionRecruteurAutorisee("acceptee", "vue")).toBe(false);
    expect(transitionRecruteurAutorisee("refusee", "entretien")).toBe(false);
  });

  it("refuse tout retour en arrière dans le parcours", () => {
    expect(transitionRecruteurAutorisee("entretien", "vue")).toBe(false);
    expect(transitionRecruteurAutorisee("preselectionnee", "envoyee")).toBe(false);
    // Reposer le statut courant n'est pas une transition.
    expect(transitionRecruteurAutorisee("vue", "vue")).toBe(false);
  });

  it("ne propose jamais `envoyee` ni `retiree` au recruteur", () => {
    for (const statut of Object.values(CandidatureStatus)) {
      const offertes = transitionsRecruteur(statut);
      expect(offertes).not.toContain("envoyee");
      expect(offertes).not.toContain("retiree");
    }
  });
});

describe("Libellés", () => {
  it("couvre tous les statuts, sans valeur brute d'enum", () => {
    for (const statut of Object.values(CandidatureStatus)) {
      expect(LIBELLES[statut]).toBeTruthy();
      expect(LIBELLES[statut]).not.toBe(statut);
    }
  });
});
