/**
 * Découpage d'un cours en chapitres.
 *
 * Le contenu est un unique bloc HTML rédigé depuis le back-office, dans lequel
 * `<h2>` ouvre un chapitre — la même convention que celle utilisée pour compter
 * `nombreChapitres` côté serveur.
 *
 * Découpage TEXTUEL et non par `DOMParser` : le HTML est assaini côté serveur
 * sur une liste de balises restreinte (voir `RichText`), `<h2>` n'y apparaît
 * qu'au premier niveau, et cette version fonctionne aussi bien au rendu serveur
 * que dans le navigateur.
 */

export interface Chapter {
  id: string;
  title: string;
  /** Corps du chapitre, titre exclu. */
  html: string;
}

export function splitIntoChapters(html: string): Chapter[] {
  const parts = html.split(/(?=<h2[\s>])/i);
  const chapters: Chapter[] = [];

  parts.forEach((part, index) => {
    const heading = /^<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(part);

    if (!heading) {
      // Texte précédant le premier `<h2>` : une introduction à part entière,
      // sinon elle n'apparaîtrait dans aucun chapitre.
      if (stripTags(part)) {
        chapters.push({ id: "chapitre-intro", title: "Introduction", html: part });
      }
      return;
    }

    const title = stripTags(heading[1]!);
    chapters.push({
      id: `chapitre-${index}`,
      title: title || `Chapitre ${chapters.length + 1}`,
      html: part.slice(heading[0].length),
    });
  });

  return chapters;
}

/** Texte nu d'un fragment — sert au titre et au test « ce bloc est-il vide ? ». */
function stripTags(fragment: string): string {
  return fragment
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

/** Nombre de chapitres terminés déduit d'une progression déjà enregistrée. */
export function completedFromProgress(progression: number, total: number): number {
  if (total === 0) return 0;
  const completed = Math.round((progression / 100) * total);
  return Math.min(total, Math.max(0, completed));
}
