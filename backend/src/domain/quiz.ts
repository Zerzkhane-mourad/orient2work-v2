/**
 * Règles des questions de quiz, communes aux deux quiz du projet.
 *
 * Le quiz de validation d'une formation et le test de validation général
 * partagent la même forme de question ; les règles vivent donc ici plutôt qu'en
 * double dans chaque service — une divergence produirait des questions
 * incorrigibles d'un côté ou de l'autre.
 *
 * Trois types, calqués sur ce que propose Udemy :
 *  • `qcm` — une seule bonne réponse parmi plusieurs options ;
 *  • `choix_multiples` — au moins deux bonnes réponses ;
 *  • `vrai_faux` — un `qcm` à exactement deux options.
 *
 * VOCABULAIRE — le code, les routes et les tables disent « quiz » ; l'interface
 * dit « test ». Le renommage est resté aux libellés pour éviter une migration
 * de quatre tables et une rupture du contrat d'API. Côté utilisateur :
 *  • quiz d'une formation → « test de la formation » ;
 *  • test général (§5.3) → « test de validation du compte ».
 */
import { QuestionType } from "@prisma/client";
import { ValidationError } from "../lib/errors.js";

/**
 * Nombre minimum de questions dans un quiz de formation.
 *
 * Un quiz à question unique ne note rien : les seuls scores possibles sont 0 %
 * et 100 %, si bien que tout `scoreMinimum` entre 1 et 100 revient au même et
 * que la validation de la formation tient au hasard d'une seule réponse.
 */
export const MIN_QUESTIONS_PAR_QUIZ = 2;

/**
 * Un quiz peut-il perdre une question de plus ?
 *
 * Le quiz existe ou n'existe pas : tant qu'il existe, il doit rester notable.
 * Pour l'enlever complètement, on supprime le quiz — pas ses questions une à une.
 */
export function assertRetraitQuestionPossible(questionsRestantes: number): void {
  if (questionsRestantes < MIN_QUESTIONS_PAR_QUIZ) {
    throw new ValidationError(
      `Un test garde au moins ${MIN_QUESTIONS_PAR_QUIZ} questions. Supprimez le test entier pour l'enlever.`,
      [{ field: "questions", message: `${MIN_QUESTIONS_PAR_QUIZ} questions minimum` }],
    );
  }
}

export interface QuestionCoherente {
  type: QuestionType;
  options: string[];
  /** Index dans `options`. */
  bonnesReponses: number[];
}

/**
 * Contrôle la cohérence entre le type, les options et les bonnes réponses.
 *
 * Appelé aussi bien à la création qu'à la modification — et dans ce dernier cas
 * sur la question FUSIONNÉE, pas sur le seul correctif. Sans cela, changer le
 * seul `type` vers `choix_multiples` laisserait une question avec une unique
 * bonne réponse, affichée avec des cases à cocher et impossible à réussir
 * comme annoncé.
 */
export function assertQuestionCoherente(question: QuestionCoherente): void {
  const { type, options, bonnesReponses } = question;

  if (options.length < 2) {
    throw new ValidationError("Question invalide.", [
      { field: "options", message: "2 options minimum" },
    ]);
  }

  if (type === QuestionType.vrai_faux && options.length !== 2) {
    throw new ValidationError("Question invalide.", [
      { field: "options", message: "une question vrai/faux a exactement 2 options" },
    ]);
  }

  if (bonnesReponses.length === 0) {
    throw new ValidationError("Question invalide.", [
      { field: "bonnesReponses", message: "au moins une bonne réponse" },
    ]);
  }

  if (bonnesReponses.some((index) => index < 0 || index >= options.length)) {
    throw new ValidationError("Question invalide.", [
      { field: "bonnesReponses", message: "désigne une option qui n'existe pas" },
    ]);
  }

  if (type === QuestionType.choix_multiples && bonnesReponses.length < 2) {
    throw new ValidationError("Question invalide.", [
      {
        field: "bonnesReponses",
        message: "une question à choix multiples a au moins deux bonnes réponses",
      },
    ]);
  }

  if (type !== QuestionType.choix_multiples && bonnesReponses.length !== 1) {
    throw new ValidationError("Question invalide.", [
      { field: "bonnesReponses", message: "une question à choix unique a exactement une réponse" },
    ]);
  }
}

/** Dédoublonne et ordonne des index de réponse. */
export function normaliserReponses(indices: number[]): number[] {
  return [...new Set(indices)].sort((a, b) => a - b);
}

/**
 * Une question est-elle réussie ?
 *
 * Correspondance EXACTE de l'ensemble : ni oubli, ni option en trop. C'est le
 * comportement d'Udemy, et le seul défendable — accorder un point partiel à qui
 * coche tout rendrait un choix multiples trivial.
 *
 * La correction se fait ici, côté serveur, à partir de la question stockée : le
 * client ne reçoit jamais `bonnesReponses` avant d'avoir répondu.
 */
export function estCorrecte(bonnesReponses: number[], reponses: number[]): boolean {
  if (reponses.length !== bonnesReponses.length) return false;

  const attendues = new Set(bonnesReponses);
  return new Set(reponses).size === reponses.length && reponses.every((r) => attendues.has(r));
}

/** Question telle que le barème a besoin de la connaître. */
export interface QuestionNotee {
  id: string;
  bonnesReponses: number[];
}

/**
 * Score d'un test, en pourcentage.
 *
 * Le dénominateur est le nombre de questions DU TEST, jamais le nombre de
 * réponses reçues : sinon il suffirait de ne renvoyer que les questions dont on
 * est sûr pour obtenir 100 %. Une question sans réponse — ou absente de l'envoi
 * — compte donc pour fausse, et une réponse portant sur une question étrangère
 * au test est ignorée.
 */
export function scoreQuiz(questions: QuestionNotee[], reponses: Map<string, number[]>): number {
  if (questions.length === 0) return 0;

  const correctes = questions.filter((question) =>
    estCorrecte(question.bonnesReponses, reponses.get(question.id) ?? []),
  ).length;

  return Math.round((correctes / questions.length) * 100);
}
