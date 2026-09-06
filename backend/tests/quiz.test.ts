/**
 * Règles des questions de quiz.
 *
 * Deux invariants portent tout le reste : une question incohérente ne doit pas
 * pouvoir être enregistrée, et une question à choix multiples n'est acquise que
 * si la sélection est EXACTEMENT la bonne. Testés ici sans base de données —
 * c'est de la logique pure.
 */
import { describe, expect, it } from "vitest";
import { QuestionType } from "@prisma/client";
import {
  assertQuestionCoherente,
  assertRetraitQuestionPossible,
  estCorrecte,
  MIN_QUESTIONS_PAR_QUIZ,
  normaliserReponses,
  scoreQuiz,
} from "../src/domain/quiz.js";
import {
  createQuizQuestionSchema,
  updateQuizQuestionSchema,
} from "../src/validators/entretien.validator.js";
import { formationQuizSchema } from "../src/validators/formation.validator.js";

const OPTIONS = ["A", "B", "C", "D"];

/** Message du premier détail de l'erreur de validation levée, ou `null`. */
function refus(question: Parameters<typeof assertQuestionCoherente>[0]): string | null {
  try {
    assertQuestionCoherente(question);
    return null;
  } catch (error) {
    const details = (error as { details?: Array<{ field: string; message: string }> }).details;
    return details?.[0] ? `${details[0].field}: ${details[0].message}` : "erreur sans détail";
  }
}

describe("Cohérence d'une question", () => {
  it("accepte les trois types correctement formés", () => {
    expect(refus({ type: QuestionType.qcm, options: OPTIONS, bonnesReponses: [2] })).toBeNull();
    expect(
      refus({ type: QuestionType.choix_multiples, options: OPTIONS, bonnesReponses: [0, 3] }),
    ).toBeNull();
    expect(
      refus({ type: QuestionType.vrai_faux, options: ["Vrai", "Faux"], bonnesReponses: [1] }),
    ).toBeNull();
  });

  it("refuse un choix multiples à une seule bonne réponse", () => {
    // Sinon l'affichage propose des cases à cocher pour ce qui est un choix unique.
    expect(
      refus({ type: QuestionType.choix_multiples, options: OPTIONS, bonnesReponses: [1] }),
    ).toBe("bonnesReponses: une question à choix multiples a au moins deux bonnes réponses");
  });

  it("refuse un choix unique à plusieurs bonnes réponses", () => {
    expect(refus({ type: QuestionType.qcm, options: OPTIONS, bonnesReponses: [0, 1] })).toBe(
      "bonnesReponses: une question à choix unique a exactement une réponse",
    );
  });

  it("refuse une réponse qui ne désigne aucune option", () => {
    expect(refus({ type: QuestionType.qcm, options: OPTIONS, bonnesReponses: [9] })).toBe(
      "bonnesReponses: désigne une option qui n'existe pas",
    );
  });

  it("refuse un vrai/faux qui n'a pas exactement deux options", () => {
    expect(refus({ type: QuestionType.vrai_faux, options: OPTIONS, bonnesReponses: [0] })).toBe(
      "options: une question vrai/faux a exactement 2 options",
    );
  });

  it("refuse une question sans réponse ou sans choix", () => {
    expect(refus({ type: QuestionType.qcm, options: OPTIONS, bonnesReponses: [] })).toBe(
      "bonnesReponses: au moins une bonne réponse",
    );
    expect(refus({ type: QuestionType.qcm, options: ["Seule"], bonnesReponses: [0] })).toBe(
      "options: 2 options minimum",
    );
  });
});

describe("Correction d'une réponse", () => {
  it("valide un choix unique juste, refuse le faux", () => {
    expect(estCorrecte([2], [2])).toBe(true);
    expect(estCorrecte([2], [1])).toBe(false);
  });

  it("exige la sélection EXACTE sur un choix multiples", () => {
    expect(estCorrecte([0, 3], [0, 3])).toBe(true);
    // L'ordre de saisie ne compte pas.
    expect(estCorrecte([0, 3], [3, 0])).toBe(true);
    // Une bonne réponse oubliée…
    expect(estCorrecte([0, 3], [0])).toBe(false);
    // …ou une option en trop.
    expect(estCorrecte([0, 3], [0, 1, 3])).toBe(false);
  });

  it("ne donne pas le point à qui coche tout", () => {
    // Le piège d'une correction par intersection : tout cocher garantirait le
    // point sur chaque question à choix multiples.
    expect(estCorrecte([0, 2], [0, 1, 2, 3])).toBe(false);
  });

  it("refuse une absence de réponse", () => {
    expect(estCorrecte([1], [])).toBe(false);
    expect(estCorrecte([0, 1], [])).toBe(false);
  });

  it("ne se laisse pas berner par un doublon", () => {
    // `[0, 0]` a la même longueur que `[0, 1]` : sans contrôle d'unicité, la
    // comparaison de cardinalité suffirait à valider à tort.
    expect(estCorrecte([0, 1], [0, 0])).toBe(false);
  });
});

describe("Normalisation des index", () => {
  it("dédoublonne et ordonne", () => {
    expect(normaliserReponses([3, 1, 3, 0])).toEqual([0, 1, 3]);
  });
});

/**
 * Le test de validation général et le quiz d'une formation partagent la forme
 * des questions mais pas tous les champs : ce qui les sépare est vérifié ici,
 * pour que le formulaire du back-office ne propose jamais une saisie perdue.
 */
describe("Question du test de validation général", () => {
  const base = { enonce: "Question ?", options: ["A", "B"], bonnesReponses: [0] };

  it("refuse une explication : ce test ne montre pas la correction", () => {
    const parsed = createQuizQuestionSchema.safeParse({ ...base, explication: "Parce que." });
    expect(parsed.success).toBe(false);
  });

  it("accepte `filiereId: null` en modification pour rendre la question commune", () => {
    const parsed = updateQuizQuestionSchema.safeParse({ filiereId: null });
    expect(parsed.success).toBe(true);
  });

  it("laisse le ciblage inchangé quand `filiereId` est absent", () => {
    const parsed = updateQuizQuestionSchema.safeParse({ active: false });
    expect(parsed.success && "filiereId" in parsed.data).toBe(false);
  });
});

/**
 * Un quiz existe ou n'existe pas ; tant qu'il existe, il doit rester notable.
 * Avec une seule question les seuls scores possibles sont 0 % et 100 %, et le
 * seuil de réussite ne veut plus rien dire.
 */
describe("Taille minimale d'un quiz de formation", () => {
  it("laisse retirer une question tant qu'il en reste assez", () => {
    expect(() => assertRetraitQuestionPossible(MIN_QUESTIONS_PAR_QUIZ)).not.toThrow();
  });

  it("refuse le retrait qui ferait tomber sous le minimum", () => {
    expect(() => assertRetraitQuestionPossible(MIN_QUESTIONS_PAR_QUIZ - 1)).toThrow();
  });

  it("refuse aussi de vider complètement le quiz", () => {
    // Le vider question par question doit passer par la suppression du quiz.
    expect(() => assertRetraitQuestionPossible(0)).toThrow();
  });

  it("exige plusieurs questions à la création en bloc", () => {
    const question = {
      enonce: "Question ?",
      options: ["A", "B"],
      bonnesReponses: [0],
    };
    const uneSeule = formationQuizSchema.safeParse({ titre: "Quiz", questions: [question] });
    const deux = formationQuizSchema.safeParse({ titre: "Quiz", questions: [question, question] });

    expect(uneSeule.success).toBe(false);
    expect(deux.success).toBe(true);
  });
});

/**
 * Barème du test de validation.
 *
 * L'invariant tient en une phrase : le score se calcule sur le test ENTIER.
 * Le calculer sur les seules réponses reçues laissait le candidat choisir son
 * dénominateur — n'envoyer que les questions sûres donnait 100 %, donc un
 * compte `valide` et l'accès aux candidatures.
 */
describe("Score du test de validation", () => {
  const test20 = Array.from({ length: 20 }, (_, i) => ({
    id: `q${i}`,
    bonnesReponses: [0],
  }));

  it("compte les questions non répondues comme fausses", () => {
    // Deux bonnes réponses sur vingt questions : 10 %, pas 100 %.
    const reponses = new Map([
      ["q0", [0]],
      ["q1", [0]],
    ]);
    expect(scoreQuiz(test20, reponses)).toBe(10);
  });

  it("donne 100 % seulement si tout le test est juste", () => {
    const toutes = new Map(test20.map((q) => [q.id, [0]]));
    expect(scoreQuiz(test20, toutes)).toBe(100);
  });

  it("donne 0 % à un envoi vide", () => {
    expect(scoreQuiz(test20, new Map())).toBe(0);
  });

  it("ignore une réponse à une question étrangère au test", () => {
    const reponses = new Map([
      ["q0", [0]],
      ["intrus", [0]],
    ]);
    expect(scoreQuiz(test20, reponses)).toBe(5);
  });

  it("compte une mauvaise réponse comme fausse, pas comme une absence", () => {
    const reponses = new Map(test20.map((q) => [q.id, [1]]));
    expect(scoreQuiz(test20, reponses)).toBe(0);
  });

  it("ne divise pas par zéro sur un test vide", () => {
    expect(scoreQuiz([], new Map())).toBe(0);
  });
});
