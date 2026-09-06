"use client";

/**
 * Illustration dans le contenu d'un cours.
 *
 * Nœud MAISON plutôt que `@tiptap/extension-image` : l'extension officielle rend
 * un `<img>` aux attributs libres, alors que l'assainissement — serveur comme
 * lecteur — n'accepte qu'une liste connue. Sa sortie serait rognée à
 * l'enregistrement, et l'image se déformerait sans explication.
 *
 * ── Le point délicat : STOCKER un chemin, AFFICHER une URL ──────────────────
 *
 * L'API renvoie un chemin relatif À SON ORIGINE (« /api/v1/formations/medias/… »),
 * comme pour toutes les autres images de l'application. Mais le HTML du cours est
 * affiché par le frontend, qui vit sur une AUTRE origine : le navigateur y
 * résolvait donc « localhost:3000/api/v1/… » et n'obtenait qu'une 404. C'est la
 * raison pour laquelle les images n'apparaissaient pas.
 *
 * Deux corrections auraient été tentantes et sont écartées :
 *  • enregistrer l'URL absolue — le contenu emporterait alors « localhost:4000 »
 *    en production ;
 *  • faire relayer les images par le serveur Next — un détour réseau pour chaque
 *    illustration, sur toutes les pages.
 *
 * On garde donc le chemin dans l'ATTRIBUT — c'est lui qui part en base — et la
 * vue de nœud n'affiche que l'URL résolue. `renderHTML` reste la sérialisation,
 * la vue de nœud l'affichage : les deux ne se mélangent pas.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { mediaUrl } from "@/lib/api/urls";
import { cn } from "@/lib/utils";

/** Classe unique admise sur `img` — voir `sanitize.ts` et `rich-text.tsx`. */
export const CLASSE_IMAGE = "rt-image";

export interface AttributsImage {
  src: string;
  alt?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageCours: {
      /** Insère une illustration à la position donnée, ou au curseur. */
      insererImage: (attributs: AttributsImage, position?: number) => ReturnType;
    };
  }
}

/** Rendu DANS l'éditeur : seule l'URL affichée est rendue absolue. */
function VueImage({ node, selected }: NodeViewProps) {
  const src = node.attrs.src as string | null;
  const alt = (node.attrs.alt as string) ?? "";

  return (
    <NodeViewWrapper
      // `data-drag-handle` : c'est la poignée qui rend l'image déplaçable
      // dans le texte, sans quoi `draggable` reste sans effet.
      data-drag-handle
      className={cn(
        "my-6 flex justify-center rounded-xl outline-offset-4 transition-shadow",
        // L'anneau dit qu'un atome est sélectionné : sans lui, on ignore que la
        // touche Suppr va retirer l'image entière.
        selected && "outline outline-2 outline-secondary",
      )}
    >
      {/* `next/image` est écarté : la taille est inconnue à la rédaction, et
          l'optimiseur exigerait `width`/`height` ou un conteneur dimensionné. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrl(src)}
        alt={alt}
        className="max-h-[480px] max-w-full rounded-xl border border-outline-variant"
      />
    </NodeViewWrapper>
  );
}

export const ImageCours = Node.create({
  name: "imageCours",

  /*
   * Bloc et non `inline` : une illustration de cours se lit entre deux
   * paragraphes, centrée. En ligne, elle s'insérerait au milieu d'une phrase et
   * en casserait l'interligne.
   *
   * L'insertion reste possible N'IMPORTE OÙ : posée au milieu d'un paragraphe,
   * ProseMirror scinde celui-ci et place l'image entre les deux moitiés.
   */
  group: "block",

  /*
   * `atom` : l'image se sélectionne d'un bloc et se supprime d'une touche. Sans
   * cela le curseur peut se poser « dedans », et l'on obtient un nœud vide
   * impossible à enlever au clavier.
   */
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      /** Chemin relatif à l'API — la valeur ENREGISTRÉE, jamais l'URL absolue. */
      src: { default: null },
      /*
       * Conservé même vide, et jamais omis du rendu : `alt=""` déclare une image
       * décorative, tandis qu'une balise SANS `alt` fait lire son URL par les
       * lecteurs d'écran.
       */
      alt: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
        // Un contenu déjà enregistré avec une URL absolue — ou collé depuis
        // ailleurs — est ramené au chemin : une seule forme circule ensuite.
        getAttrs: (element) => {
          const src = (element as HTMLElement).getAttribute("src") ?? "";
          return { src: versCheminApi(src), alt: (element as HTMLElement).getAttribute("alt") ?? "" };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        class: CLASSE_IMAGE,
        // Un cours peut porter dix illustrations : seules celles atteintes par
        // le défilement méritent d'être téléchargées.
        loading: "lazy",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VueImage);
  },

  addCommands() {
    return {
      insererImage:
        (attributs, position) =>
        ({ commands }) => {
          const noeud = { type: this.name, attrs: attributs };
          // Sans position explicite — bouton, collage — l'insertion se fait au
          // curseur ; le dépôt, lui, fournit la position du pointeur.
          return position === undefined
            ? commands.insertContent(noeud)
            : commands.insertContentAt(position, noeud);
        },
    };
  },
});

/**
 * Ramène une URL de média à son chemin d'API.
 *
 * Filet pour les contenus enregistrés avant cette correction, qui portaient une
 * URL absolue : sans lui, une formation rédigée en développement garderait
 * « localhost:4000 » jusqu'en production.
 */
export function versCheminApi(src: string): string {
  const marqueur = src.indexOf("/api/");
  return marqueur > 0 && /^https?:\/\//i.test(src) ? src.slice(marqueur) : src;
}
