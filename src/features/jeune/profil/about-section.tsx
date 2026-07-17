"use client";

import { useState } from "react";
import { Button, Modal, Textarea } from "@/components/ui";
import { EditableCard } from "./editable-card";
import { useProfile } from "./profile-store";

const MAX = 600;

/** Short personal presentation (§5.2). */
export function AboutSection() {
  const { jeune, update } = useProfile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(jeune.bio ?? "");

  const openModal = () => {
    setDraft(jeune.bio ?? "");
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update({ bio: draft.trim() });
    setOpen(false);
  };

  return (
    <>
      <EditableCard title="À propos" actionLabel="Modifier la présentation" onAction={openModal}>
        {jeune.bio ? (
          <p className="whitespace-pre-line text-on-surface">{jeune.bio}</p>
        ) : (
          <p className="text-sm text-on-surface-variant">
            Ajoutez une courte présentation pour vous démarquer auprès des recruteurs.
          </p>
        )}
      </EditableCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="À propos"
        description="Présentez votre parcours, vos aspirations et ce que vous recherchez."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="secondary" form="about-form" type="submit">
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="about-form" onSubmit={save}>
          <Textarea
            label="Présentation"
            rows={8}
            maxLength={MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Étudiant en informatique passionné par le développement web…"
            hint={`${draft.length}/${MAX} caractères`}
          />
        </form>
      </Modal>
    </>
  );
}
