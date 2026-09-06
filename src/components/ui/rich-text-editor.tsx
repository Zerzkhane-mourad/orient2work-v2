"use client";

/**
 * Éditeur du contenu des cours (back-office).
 *
 * Produit le HTML stocké dans `Formation.contenuHtml` ; les `<h2>` y deviennent
 * les chapitres du lecteur.
 *
 * Les illustrations s'insèrent PARTOUT, par trois gestes qui aboutissent au même
 * endroit : le bouton de la barre d'outils, le glisser-déposer, le collage. Les
 * trois passent par `useTeleversementImage` — une seule validation, un seul
 * chemin d'erreur.
 *
 * Ce qui n'est PAS fait ici, et volontairement : l'image n'est pas encodée dans
 * le HTML. Un cours de dix captures en base64 pèserait plusieurs mégaoctets,
 * rechargés à chaque ouverture par chaque candidat, et gonflerait la colonne en
 * base. Le fichier part à l'API, qui renvoie une URL.
 */
import { useCallback, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Icon, type IconName } from "./icon";
import { ImageCours } from "./rich-text-image";
import {
  premiereImage,
  TYPES_IMAGE,
  useTeleversementImage,
  type TeleversementImage,
} from "./use-televersement-image";
import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon?: IconName;
  text?: string;
}

function ToolbarButton({ onClick, active, disabled, label, icon, text }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // garde la sélection dans l'éditeur
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm font-bold transition-colors disabled:opacity-40",
        active
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container-high",
      )}
    >
      {icon ? <Icon name={icon} className="text-[18px]" /> : text}
    </button>
  );
}

/**
 * Bouton d'insertion — le troisième chemin, après le dépôt et le collage.
 *
 * Il ouvre le sélecteur de fichiers du système ; l'`<input type="file">` reste
 * caché parce qu'il ne se met pas en forme, et qu'il doit s'aligner sur les
 * autres boutons de la barre.
 */
function BoutonImage({
  onFichier,
  envoiEnCours,
}: {
  onFichier: (fichier: File) => void;
  envoiEnCours: boolean;
}) {
  const champ = useRef<HTMLInputElement>(null);

  return (
    <>
      <ToolbarButton
        label={envoiEnCours ? "Envoi de l'image…" : "Insérer une image"}
        icon={envoiEnCours ? "progress_activity" : "photo_camera"}
        disabled={envoiEnCours}
        onClick={() => champ.current?.click()}
      />
      <input
        ref={champ}
        type="file"
        accept={TYPES_IMAGE.join(",")}
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0];
          if (fichier) onFichier(fichier);
          // Remis à zéro : sans cela, re-choisir le MÊME fichier ne déclenche
          // aucun évènement `change`.
          e.target.value = "";
        }}
      />
    </>
  );
}

function Toolbar({
  editor,
  televersement,
  onFichier,
}: {
  editor: Editor;
  televersement: TeleversementImage;
  onFichier: (fichier: File) => void;
}) {
  const promptLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL du lien", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="border-b border-outline-variant bg-surface-container-low">
      <div className="flex flex-wrap items-center gap-1 p-2">
        <ToolbarButton
          label="Titre de chapitre (H2)"
          text="H2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="Sous-titre (H3)"
          text="H3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <span className="mx-1 h-5 w-px bg-outline-variant" />
        <ToolbarButton
          label="Gras"
          text="B"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italique"
          text="I"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Barré"
          text="S"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <span className="mx-1 h-5 w-px bg-outline-variant" />
        <ToolbarButton
          label="Liste à puces"
          icon="format_list_bulleted"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Liste numérotée"
          icon="format_list_numbered"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Citation"
          icon="format_quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          label="Séparateur"
          icon="remove"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
        <span className="mx-1 h-5 w-px bg-outline-variant" />
        <ToolbarButton
          label="Lien"
          icon="link"
          active={editor.isActive("link")}
          onClick={promptLink}
        />
        <BoutonImage onFichier={onFichier} envoiEnCours={televersement.envoiEnCours} />
        <span className="mx-1 h-5 w-px bg-outline-variant" />
        <ToolbarButton
          label="Annuler"
          icon="undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          label="Rétablir"
          icon="redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      {/*
        L'envoi et son échec s'annoncent SOUS la barre, sur toute la largeur :
        glissé-déposé, l'image met un instant à monter et rien d'autre ne
        bougerait à l'écran pendant ce temps.
        `role="status"` : l'information est aussi lue par un lecteur d'écran.
      */}
      {(televersement.envoiEnCours || televersement.erreur) && (
        <p
          role="status"
          className={cn(
            "flex items-center gap-1.5 border-t border-outline-variant px-3 py-1.5 text-xs font-semibold",
            televersement.erreur ? "text-error" : "text-on-surface-variant",
          )}
        >
          <Icon
            name={televersement.erreur ? "error" : "progress_activity"}
            className={cn("text-[14px]", !televersement.erreur && "animate-spin")}
          />
          {televersement.erreur ?? "Envoi de l'image…"}
        </p>
      )}
    </div>
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
}

export function RichTextEditor({ value, onChange, placeholder, label, hint }: RichTextEditorProps) {
  const televersement = useTeleversementImage();

  /*
   * Références plutôt que dépendances : les gestionnaires de dépôt et de collage
   * sont figés dans la configuration de `useEditor`, créée une seule fois. Les
   * lire à travers une ref garantit qu'ils voient toujours la dernière version,
   * sans reconstruire l'éditeur — ce qui ferait perdre l'historique d'annulation.
   */
  const editorRef = useRef<Editor | null>(null);
  const televersementRef = useRef(televersement);
  televersementRef.current = televersement;

  /** Envoie le fichier puis pose l'image — au curseur, ou à l'endroit du dépôt. */
  const inserer = useCallback(async (fichier: File, position?: number) => {
    const url = await televersementRef.current.televerser(fichier);
    if (!url) return;

    /*
     * Le nom du fichier sert de texte alternatif par défaut : il vaut mieux
     * qu'un `alt` vide, et reste modifiable. Interrompre le geste par une
     * fenêtre de saisie à chaque dépôt rendrait l'insertion pénible — la
     * description se soigne à la relecture, pas au milieu du glisser.
     */
    const alt = fichier.name.replace(/\.[^.]+$/, "");
    editorRef.current?.chain().focus().insererImage({ src: url, alt }, position).run();
  }, []);

  const editor = useEditor(
    {
      // Rendu client uniquement : indispensable sous Next, sinon désaccord
      // d'hydratation.
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        Link.configure({ openOnClick: false, autolink: false }),
        ImageCours,
        Placeholder.configure({ placeholder: placeholder ?? "Rédigez le contenu du cours…" }),
      ],
      content: value,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      editorProps: {
        attributes: {
          class:
            "prose prose-lg max-w-none min-h-[420px] px-4 py-3 focus:outline-none [&_p.is-editor-empty:first-child::before]:text-on-surface-variant/60 [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
        },

        /**
         * Dépôt d'un fichier image — l'image se pose LÀ où on l'a lâchée.
         *
         * `moved` distingue un déplacement interne (on fait glisser une image
         * déjà présente) d'un apport extérieur : le premier doit garder le
         * comportement natif de ProseMirror, sans quoi déplacer une image la
         * renverrait au serveur.
         */
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false;

          const accepte = televersementRef.current.estImageAcceptee;
          const fichier = premiereImage(event.dataTransfer, accepte);
          if (!fichier) return false;

          event.preventDefault();
          const cible = view.posAtCoords({ left: event.clientX, top: event.clientY });
          void inserer(fichier, cible?.pos);
          return true;
        },

        /**
         * Collage d'une image — capture d'écran, copie depuis un autre onglet.
         *
         * On ne traite QUE les fichiers : un collage de texte contenant une
         * balise `<img>` doit suivre le chemin normal, sinon coller un
         * paragraphe illustré perdrait le texte.
         */
        handlePaste: (_view, event) => {
          const accepte = televersementRef.current.estImageAcceptee;
          const fichier = premiereImage(event.clipboardData, accepte);
          if (!fichier) return false;

          event.preventDefault();
          void inserer(fichier);
          return true;
        },
      },
    },
    [],
  );

  editorRef.current = editor;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-on-surface">{label}</label>}
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary">
        {editor ? (
          <>
            <Toolbar
              editor={editor}
              televersement={televersement}
              onFichier={(fichier) => void inserer(fichier)}
            />
            <EditorContent editor={editor} />
          </>
        ) : (
          <div className="min-h-[420px] animate-pulse bg-surface-container-low" />
        )}
      </div>
      {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}
