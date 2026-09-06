/**
 * Assainissement du HTML riche (contenu des formations).
 *
 * Le contenu vient de l'éditeur admin, mais on ne fait pas confiance à l'origine :
 * un compte admin compromis pourrait injecter un `<script>` qui s'exécuterait chez
 * tous les jeunes (XSS stocké). On applique donc une whitelist stricte de balises
 * et d'attributs, et on n'autorise que les schémas d'URL sûrs.
 */
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2",
    "h3",
    "h4",
    "p",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "figure",
    "figcaption",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "class"],
    span: ["class"],
    code: ["class"],
    pre: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  /*
   * Classes ADMISES, une par une.
   *
   * `allowedAttributes` laisserait passer n'importe quelle valeur de `class` :
   * un éditeur compromis pourrait alors emprunter les classes utilitaires de
   * l'application pour recouvrir la page — un `fixed inset-0` suffit à masquer
   * l'écran entier, cliquable par-dessus.
   *
   * MIROIR de `features/admin/couleurs-texte.ts` et du filtre du lecteur
   * (`components/ui/rich-text.tsx`) : les trois listes doivent s'accorder,
   * faute de quoi une mise en forme autorisée à l'écriture disparaît en
   * silence à la relecture.
   */
  /*
   * Classes ADMISES, énumérées une par une.
   *
   * `allowedAttributes` laisserait passer n'importe quelle valeur de `class` :
   * un contenu forgé pourrait alors emprunter les classes utilitaires de
   * l'application pour recouvrir la page — un « fixed inset-0 » suffit à
   * masquer l'écran entier sous une zone cliquable.
   *
   * MIROIR de la liste du lecteur (`components/ui/rich-text.tsx`) : les deux
   * doivent s'accorder, faute de quoi une mise en forme acceptée à l'écriture
   * disparaît en silence à la relecture.
   */
  allowedClasses: {
    img: ["rt-image"],
  },
  // `javascript:` et `vbscript:` sont donc exclus.
  allowedSchemes: ["http", "https", "mailto"],
  /*
   * `data:` retiré des images : l'éditeur téléverse désormais ses illustrations
   * et n'insère que des URL. Un SVG encodé en base64, servi sans
   * authentification, exécuterait le script qu'il embarque.
   */
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    // Un lien externe ne doit jamais donner accès à `window.opener`.
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}

/** Texte brut : retire toute balise (titres, descriptions, commentaires). */
export function stripTags(text: string): string {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();
}

/** Entités produites par `stripTags`, dans l'ordre de décodage (`&amp;` en dernier). */
const ENTITIES: Array<[RegExp, string]> = [
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&#39;/g, "'"],
  [/&amp;/g, "&"],
];

/**
 * Texte brut destiné à être affiché tel quel : balises retirées ET entités
 * décodées.
 *
 * `stripTags` ré-encode `&` en `&amp;` — correct pour du texte réinjecté dans du
 * HTML, mais faux pour un libellé rendu par React, qui échappe déjà de son côté :
 * « Réseaux & télécoms » s'afficherait « Réseaux &amp; télécoms ».
 *
 * Le décodage n'affaiblit rien : les balises ont déjà disparu à ce stade, et un
 * `<` restitué reste une donnée, jamais du balisage — le rendu se charge de
 * l'échapper. Réservé aux champs courts affichés en texte (libellés de
 * référentiels), pas au contenu réinjecté en HTML.
 */
export function plainText(text: string): string {
  return ENTITIES.reduce((value, [entity, char]) => value.replace(entity, char), stripTags(text));
}
