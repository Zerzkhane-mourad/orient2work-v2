"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon?: string;
  text?: string;
}

function ToolbarButton({ onClick, active, disabled, label, icon, text }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
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

function Toolbar({ editor }: { editor: Editor }) {
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
    <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant bg-surface-container-low p-2">
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
      <ToolbarButton label="Lien" icon="link" active={editor.isActive("link")} onClick={promptLink} />
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
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
}

/**
 * Rich-text editor for admin-authored course content.
 * Produces the HTML stored in `Formation.contenuHtml`; `<h2>` headings become
 * the chapters shown in the learner's reader.
 */
export function RichTextEditor({ value, onChange, placeholder, label, hint }: RichTextEditorProps) {
  const editor = useEditor({
    // Required for Next SSR: render on the client only to avoid hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Rédigez le contenu du cours…" }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none min-h-[420px] px-4 py-3 focus:outline-none [&_p.is-editor-empty:first-child::before]:text-on-surface-variant/60 [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
      },
    },
  });

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-on-surface">{label}</label>}
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary">
        {editor ? (
          <>
            <Toolbar editor={editor} />
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
