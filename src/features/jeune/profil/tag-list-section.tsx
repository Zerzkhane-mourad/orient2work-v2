"use client";

import { useState } from "react";
import { Button, Chip, Modal, TagInput } from "@/components/ui";
import { EditableCard } from "./editable-card";

interface TagListSectionProps {
  title: string;
  value: string[];
  onSave: (next: string[]) => void;
  emptyLabel: string;
  placeholder?: string;
  suggestions?: string[];
  /** Highlight the first N chips in gold ("hot skills"). */
  highlightFirst?: number;
}

/**
 * Generic chip-list section — shared by Compétences and Langues, which are
 * both just an editable list of strings.
 */
export function TagListSection({
  title,
  value,
  onSave,
  emptyLabel,
  placeholder,
  suggestions,
  highlightFirst = 0,
}: TagListSectionProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const openModal = () => {
    setDraft(value);
    setOpen(true);
  };

  const save = () => {
    onSave(draft);
    setOpen(false);
  };

  return (
    <>
      <EditableCard title={title} actionLabel={`Modifier : ${title}`} onAction={openModal}>
        {value.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{emptyLabel}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {value.map((item, i) => (
              <Chip key={item} hot={i < highlightFirst}>
                {item}
              </Chip>
            ))}
          </div>
        )}
      </EditableCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="secondary" onClick={save}>
              Enregistrer
            </Button>
          </>
        }
      >
        <TagInput
          value={draft}
          onChange={setDraft}
          placeholder={placeholder}
          suggestions={suggestions}
          hint="Appuyez sur Entrée pour ajouter. Cliquez sur × pour retirer."
        />
      </Modal>
    </>
  );
}
