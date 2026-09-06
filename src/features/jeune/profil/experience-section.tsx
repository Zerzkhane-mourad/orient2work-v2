"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Chip,
  Icon,
  Input,
  Modal,
  optionsFromLabels,
  Select,
  TagInput,
  Textarea,
} from "@/components/ui";
import type { Experience } from "@/lib/types";
import { EditableCard } from "./editable-card";
import { PeriodeField } from "./periode-field";
import {
  formatPeriode,
  parsePeriode,
  PERIODE_VIDE,
  problemePeriode,
  type Periode,
} from "./periode";
import { useProfile } from "./profile-store";

const TYPES: Experience["type"][] = [
  "Stage",
  "Emploi",
  "Projet académique",
  "Projet personnel",
  "Associatif",
  "Bénévolat",
  "Freelance",
];

const EMPTY: Omit<Experience, "id"> = {
  titre: "",
  structure: "",
  periode: "",
  type: "Stage",
  description: "",
  competences: [],
};

/** Experiences (§5.2) — add, edit and remove entries. */
export function ExperienceSection() {
  const { jeune, addExperience, updateExperience, removeExperience } = useProfile();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Experience, "id">>(EMPTY);

  /*
   * La période vit à part du brouillon, en mois plutôt qu'en texte : c'est la
   * forme que manipulent les champs. Elle n'est reconvertie en chaîne — le
   * format attendu par l'API — qu'à l'enregistrement.
   */
  const [periode, setPeriode] = useState<Periode>(PERIODE_VIDE);
  /** Texte d'origine quand il ne se relit pas (expérience saisie avant ce champ). */
  const [periodeHeritee, setPeriodeHeritee] = useState<string>("");
  const [periodeTouchee, setPeriodeTouchee] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setPeriode(PERIODE_VIDE);
    setPeriodeHeritee("");
    setPeriodeTouchee(false);
    setOpen(true);
  };

  const openEdit = (exp: Experience) => {
    setEditingId(exp.id);
    const { id: _id, ...rest } = exp;
    void _id;
    setDraft(rest);

    const relue = parsePeriode(exp.periode);
    setPeriode(relue ?? PERIODE_VIDE);
    // Non relisible : on garde le texte sous les yeux plutôt que de l'effacer
    // en silence, le candidat le retape en deux clics.
    setPeriodeHeritee(relue ? "" : exp.periode);
    setPeriodeTouchee(false);
    setOpen(true);
  };

  // Message d'erreur retenu jusqu'à la première tentative d'envoi : signaler
  // « indiquez le mois de début » sur un formulaire vierge est du bruit.
  const problemeDePeriode = problemePeriode(periode);
  const erreurPeriode = periodeTouchee ? problemeDePeriode : null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setPeriodeTouchee(true);
    if (problemeDePeriode) return;

    const complet = { ...draft, periode: formatPeriode(periode) };
    if (editingId) updateExperience(editingId, complet);
    else addExperience(complet);
    setOpen(false);
  };

  const confirmRemove = (exp: Experience) => {
    if (window.confirm(`Supprimer l'expérience « ${exp.titre} » ?`)) removeExperience(exp.id);
  };

  return (
    <>
      <EditableCard
        title="Expérience"
        actionIcon="add"
        actionLabel="Ajouter une expérience"
        onAction={openAdd}
      >
        {jeune.experiences.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Ajoutez vos stages, projets académiques ou expériences associatives — ils comptent
            autant qu&apos;un emploi.
          </p>
        ) : (
          <div className="space-y-5">
            {jeune.experiences.map((exp) => (
              <div
                key={exp.id}
                className="group flex gap-4 border-b border-outline-variant pb-5 last:border-0 last:pb-0"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                  <Icon name="work_history" className="text-2xl" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-primary">{exp.titre}</h3>
                    <Badge tone="neutral">{exp.type}</Badge>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    {exp.structure} · {exp.periode}
                  </p>
                  <p className="text-sm text-on-surface">{exp.description}</p>
                  {exp.competences.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {exp.competences.map((c) => (
                        <Chip key={c} className="text-xs">
                          {c}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(exp)}
                    aria-label={`Modifier ${exp.titre}`}
                    className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary"
                  >
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmRemove(exp)}
                    aria-label={`Supprimer ${exp.titre}`}
                    className="rounded-full p-2 text-on-surface-variant hover:bg-error-container hover:text-error"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </EditableCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Modifier l'expérience" : "Ajouter une expérience"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="secondary" form="experience-form" type="submit">
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </>
        }
      >
        <form id="experience-form" onSubmit={save} className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Titre de l'expérience"
              required
              placeholder="Développeur Front-end (Stage)"
              value={draft.titre}
              onChange={(e) => setDraft({ ...draft, titre: e.target.value })}
            />
          </div>
          <Input
            label="Structure / Entreprise"
            required
            placeholder="TechSolutions"
            value={draft.structure}
            onChange={(e) => setDraft({ ...draft, structure: e.target.value })}
          />
          <Select
            label="Type"
            required
            value={draft.type}
            onChange={(type) => setDraft({ ...draft, type: type as Experience["type"] })}
            options={optionsFromLabels(TYPES)}
          />
          <div className="sm:col-span-2">
            <PeriodeField
              value={periode}
              onChange={setPeriode}
              error={erreurPeriode}
              ancienneValeur={periodeHeritee}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Description & missions"
              rows={4}
              hint="Action + contexte + résultat. Un chiffre vaut mieux qu'un adjectif."
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TagInput
              label="Compétences développées"
              value={draft.competences}
              onChange={(competences) => setDraft({ ...draft, competences })}
              placeholder="React, Git… (Entrée pour valider)"
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
