import DOMPurify from "isomorphic-dompurify";
import { CLASSE_IMAGE } from "./rich-text-image";
import { mediaUrl } from "@/lib/api/urls";
import { cn } from "@/lib/utils";

/**
 * Balises que l'éditeur de cours est autorisé à produire.
 *
 * MIROIR de `backend/src/lib/sanitize.ts`, qui assainit à l'écriture. Les deux
 * listes doivent s'accorder : celle-ci ne comportait pas `img`, si bien qu'une
 * illustration enregistrée sans la moindre erreur disparaissait à la lecture.
 *
 * Ce filtre reste une SECONDE barrière : le serveur nettoie déjà avant d'écrire
 * en base. Il protège d'un contenu entré autrement que par l'API.
 */
const ALLOWED_TAGS = [
  "h2",
  "h3",
  "h4",
  "p",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "br",
  "hr",
  "a",
  "img",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "loading",
  "class",
];

interface RichTextProps {
  html: string;
  className?: string;
}

/**
 * Affiche le HTML rédigé par un administrateur.
 *
 * `ALLOWED_URI_REGEXP` n'accepte que `http(s)` et les chemins relatifs — donc
 * les images servies par l'API. `data:` est écarté : il permettrait d'embarquer
 * un SVG, et donc du script dans certains navigateurs.
 */
export function RichText({ html, className }: RichTextProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|\/(?!\/))/i,
  });

  return (
    <div
      className={cn("prose prose-lg max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: resoudreMedias(nettoyerClasses(clean)) }}
    />
  );
}

/**
 * Rend absolues les URLs d'images servies par l'API.
 *
 * Le contenu stocke un chemin relatif à l'ORIGINE DE L'API (« /api/v1/… »),
 * comme partout ailleurs dans l'application. Mais ce HTML est affiché par le
 * frontend, qui vit sur une autre origine : le navigateur y cherchait l'image
 * sur son propre hôte et n'obtenait qu'une 404 — les illustrations
 * n'apparaissaient tout simplement pas.
 *
 * La résolution se fait donc à l'AFFICHAGE, et non à l'enregistrement : le
 * contenu reste transportable d'un environnement à l'autre.
 */
function resoudreMedias(html: string): string {
  return html.replace(/(<img\b[^>]*?\ssrc=")([^"]+)(")/gi, (_entier, avant, src: string, apres) => {
    return `${avant}${mediaUrl(src) ?? src}${apres}`;
  });
}

/**
 * Ne laisse subsister que la classe des illustrations.
 *
 * DOMPurify sait autoriser l'attribut `class`, pas en restreindre la VALEUR.
 * Sans ce tri, un contenu entré hors API pourrait emprunter les utilitaires de
 * l'application : un `fixed inset-0` suffit à recouvrir l'écran d'une zone
 * cliquable.
 *
 * Opère sur du HTML DÉJÀ assaini — il n'y reste ni script, ni gestionnaire
 * d'évènement — et par expression régulière, parce que ce composant est aussi
 * rendu côté serveur, où `DOMParser` n'existe pas.
 */
function nettoyerClasses(html: string): string {
  return html.replace(/\sclass="([^"]*)"/g, (_entier, valeur: string) => {
    const gardees = valeur.split(/\s+/).filter((classe) => classe === CLASSE_IMAGE);
    return gardees.length ? ` class="${gardees.join(" ")}"` : "";
  });
}
