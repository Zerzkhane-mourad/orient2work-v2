/**
 * Sauvegarde locale d'un test en cours.
 *
 * Un rechargement, un onglet fermé par erreur, un téléphone qui met l'onglet en
 * veille : sans cela, toutes les réponses disparaissaient et il fallait
 * reprendre à la première question. Rien n'était perdu côté serveur — il n'y
 * avait simplement jamais rien d'envoyé.
 *
 * `sessionStorage` et non `localStorage` : la reprise n'a de sens que dans
 * l'onglet où le test a été commencé. Une copie qui traîne des semaines plus
 * tard, sur un test entre-temps modifié, ne vaut rien.
 *
 * Aucune donnée sensible n'y transite : ce sont des index d'options, et les
 * bonnes réponses ne sont jamais envoyées au navigateur.
 */

const PREFIXE = "o2w:test:";

export interface QuizProgress {
  /** Index cochés, une entrée par question, dans l'ordre du test. */
  answers: number[][];
  /** Question affichée au moment de la sauvegarde. */
  current: number;
}

function cle(testId: string): string {
  return `${PREFIXE}${testId}`;
}

/**
 * Relit une copie en cours.
 *
 * `null` dès que la forme ne correspond plus au test servi — nombre de
 * questions différent, index hors bornes, JSON abîmé. Restaurer des réponses
 * décalées d'une question serait pire que de repartir de zéro.
 */
export function readProgress(testId: string, questionCount: number): QuizProgress | null {
  if (typeof window === "undefined") return null;

  try {
    const brut = window.sessionStorage.getItem(cle(testId));
    if (!brut) return null;

    const donnees = JSON.parse(brut) as Partial<QuizProgress>;
    const { answers, current } = donnees;

    if (!Array.isArray(answers) || answers.length !== questionCount) return null;

    const valides = answers.every(
      (selection) =>
        Array.isArray(selection) &&
        selection.every((index) => Number.isInteger(index) && index >= 0 && index < 20),
    );
    if (!valides) return null;

    const position =
      typeof current === "number" && current >= 0 && current < questionCount ? current : 0;

    return { answers: answers as number[][], current: position };
  } catch {
    // Stockage indisponible (navigation privée, quota) : le test reste jouable,
    // simplement sans reprise.
    return null;
  }
}

export function writeProgress(testId: string, progress: QuizProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(cle(testId), JSON.stringify(progress));
  } catch {
    // Quota atteint : perdre la reprise est acceptable, interrompre le test ne
    // le serait pas.
  }
}

/** À appeler une fois la copie envoyée : la reprise n'a plus lieu d'être. */
export function clearProgress(testId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(cle(testId));
  } catch {
    /* voir `writeProgress` */
  }
}
