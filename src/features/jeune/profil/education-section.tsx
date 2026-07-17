"use client";

import { useState } from "react";
import { Button, Icon, Input, Modal, Select } from "@/components/ui";
import { FILIERES, NIVEAUX_ETUDES } from "@/lib/constants";
import type { Filiere } from "@/lib/constants";
import { EditableCard } from "./editable-card";
import { useProfile } from "./profile-store";

/** Academic background (§5.2 — informations académiques). */
export function EducationSection() {
  const { jeune, update } = useProfile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(jeune);

  const openModal = () => {
    setDraft(jeune);
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const { niveauEtudes, etablissement, filiere, specialite, anneeEtude, diplome } = draft;
    update({ niveauEtudes, etablissement, filiere, specialite, anneeEtude, diplome });
    setOpen(false);
  };

  return (
    <>
      <EditableCard title="Formation" actionLabel="Modifier le parcours académique" onAction={openModal}>
        <div className="flex gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
            <Icon name="school" className="text-2xl" />
          </span>
          <div>
            <h3 className="font-bold text-primary">{jeune.etablissement}</h3>
            <p className="text-sm text-on-surface-variant">
              {jeune.diplome} · {jeune.filiere}
            </p>
            <p className="text-sm text-on-surface-variant">
              {[jeune.niveauEtudes, jeune.specialite, jeune.anneeEtude].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </EditableCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Parcours académique"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="secondary" form="education-form" type="submit">
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="education-form" onSubmit={save} className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Niveau d'études"
            required
            value={draft.niveauEtudes}
            onChange={(e) => setDraft({ ...draft, niveauEtudes: e.target.value })}
          >
            {NIVEAUX_ETUDES.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </Select>
          <Input
            label="Établissement"
            required
            value={draft.etablissement}
            onChange={(e) => setDraft({ ...draft, etablissement: e.target.value })}
          />
          <Select
            label="Filière"
            required
            value={draft.filiere}
            onChange={(e) => setDraft({ ...draft, filiere: e.target.value as Filiere })}
          >
            {FILIERES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
          <Input
            label="Spécialité"
            value={draft.specialite ?? ""}
            onChange={(e) => setDraft({ ...draft, specialite: e.target.value })}
          />
          <Input
            label="Année d'étude"
            placeholder="3ème année"
            value={draft.anneeEtude ?? ""}
            onChange={(e) => setDraft({ ...draft, anneeEtude: e.target.value })}
          />
          <Input
            label="Diplôme préparé / obtenu"
            value={draft.diplome ?? ""}
            onChange={(e) => setDraft({ ...draft, diplome: e.target.value })}
          />
        </form>
      </Modal>
    </>
  );
}
