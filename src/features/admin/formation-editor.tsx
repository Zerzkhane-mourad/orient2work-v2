"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Icon,
  Input,
  RichText,
  RichTextEditor,
  Select,
  Textarea,
} from "@/components/ui";
import { FILIERES, FORMATION_CATEGORIES } from "@/lib/constants";
import type { Formation } from "@/lib/types";
import { cn, countChapitres } from "@/lib/utils";

const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé", "Tous niveaux"] as const;

interface FormationEditorProps {
  /** Existing formation to edit; omit to create a new one. */
  formation?: Formation;
}

const EMPTY_CONTENT = "<h2>Premier chapitre</h2><p>Rédigez le contenu du cours ici…</p>";

/**
 * Admin create/edit form for a formation.
 * The course body is authored with the rich-text editor and stored as HTML;
 * each `<h2>` becomes a chapter in the learner's reader.
 */
export function FormationEditor({ formation }: FormationEditorProps) {
  const router = useRouter();
  const isEdit = Boolean(formation);

  const [titre, setTitre] = useState(formation?.titre ?? "");
  const [sousTitre, setSousTitre] = useState(formation?.sousTitre ?? "");
  const [description, setDescription] = useState(formation?.description ?? "");
  const [categorie, setCategorie] = useState<string>(formation?.categorie ?? "");
  const [filiere, setFiliere] = useState<string>(formation?.filiere ?? "");
  const [niveau, setNiveau] = useState<string>(formation?.niveau ?? "Débutant");
  const [tempsLecture, setTempsLecture] = useState(String(formation?.tempsLectureMin ?? 5));
  const [certifiante, setCertifiante] = useState(formation?.certifiante ?? true);
  const [objectifs, setObjectifs] = useState((formation?.objectifs ?? []).join("\n"));
  const [prerequis, setPrerequis] = useState((formation?.prerequis ?? []).join("\n"));
  const [contenuHtml, setContenuHtml] = useState(formation?.contenuHtml ?? EMPTY_CONTENT);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  const chapitres = countChapitres(contenuHtml);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No backend yet: the payload below is what a POST/PUT would send.
    const payload: Partial<Formation> = {
      titre,
      sousTitre,
      description,
      categorie: categorie as Formation["categorie"],
      filiere: (filiere || undefined) as Formation["filiere"],
      niveau: niveau as Formation["niveau"],
      tempsLectureMin: Number(tempsLecture),
      certifiante,
      objectifs: objectifs.split("\n").map((s) => s.trim()).filter(Boolean),
      prerequis: prerequis.split("\n").map((s) => s.trim()).filter(Boolean),
      contenuHtml,
    };
    console.info("Formation à enregistrer :", payload);
    setSaved(true);
    setTimeout(() => router.push("/admin/formations"), 800);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-headline-lg font-bold text-primary">
            {isEdit ? "Modifier la formation" : "Nouvelle formation"}
          </h1>
          <p className="text-on-surface-variant">
            Le contenu est rédigé en texte enrichi. Chaque titre <strong>H2</strong> devient un
            chapitre pour le jeune.
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/admin/formations" variant="ghost">
            Annuler
          </ButtonLink>
          <Button type="submit" variant="secondary">
            <Icon name="save" className="text-[18px]" /> {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-success-container px-4 py-3 text-sm font-semibold text-success">
          <Icon name="check_circle" filled /> Formation enregistrée. Redirection…
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Content editor */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Contenu du cours</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant">
                  {chapitres} chapitre{chapitres > 1 ? "s" : ""}
                </span>
                <div className="flex rounded-full bg-surface-container p-0.5">
                  {[
                    { key: false, label: "Éditer" },
                    { key: true, label: "Aperçu" },
                  ].map((m) => (
                    <button
                      key={String(m.key)}
                      type="button"
                      onClick={() => setPreview(m.key)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                        preview === m.key
                          ? "bg-primary text-on-primary"
                          : "text-on-surface-variant hover:text-primary",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {preview ? (
                <div className="min-h-[420px] rounded-lg border border-outline-variant p-4">
                  <RichText html={contenuHtml} />
                </div>
              ) : (
                <RichTextEditor
                  value={contenuHtml}
                  onChange={setContenuHtml}
                  hint="Utilisez H2 pour créer un chapitre, H3 pour une sous-partie. Gras, listes, citations et liens sont disponibles."
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Objectifs &amp; prérequis</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <Textarea
                label="Objectifs pédagogiques"
                hint="Un objectif par ligne."
                rows={5}
                value={objectifs}
                onChange={(e) => setObjectifs(e.target.value)}
                placeholder={"Structurer un CV professionnel\nAdapter son CV à chaque offre"}
              />
              <Textarea
                label="Prérequis"
                hint="Un prérequis par ligne."
                rows={5}
                value={prerequis}
                onChange={(e) => setPrerequis(e.target.value)}
                placeholder="Aucun prérequis"
              />
            </CardBody>
          </Card>
        </div>

        {/* Meta */}
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <Input
                label="Titre"
                required
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Préparer un CV professionnel"
              />
              <Input
                label="Sous-titre"
                value={sousTitre}
                onChange={(e) => setSousTitre(e.target.value)}
                placeholder="Une phrase d'accroche"
              />
              <Textarea
                label="Description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Select
                label="Catégorie"
                required
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
              >
                <option value="" disabled>
                  Sélectionnez…
                </option>
                {[...FORMATION_CATEGORIES, "Spécialité"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              {categorie === "Spécialité" && (
                <Select label="Filière" value={filiere} onChange={(e) => setFiliere(e.target.value)}>
                  <option value="">Toutes les filières</option>
                  {FILIERES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              )}
              <Select label="Niveau" value={niveau} onChange={(e) => setNiveau(e.target.value)}>
                {NIVEAUX.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </Select>
              <Input
                label="Temps de lecture (min)"
                type="number"
                min={1}
                value={tempsLecture}
                onChange={(e) => setTempsLecture(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={certifiante}
                  onChange={(e) => setCertifiante(e.target.checked)}
                  className="h-5 w-5 rounded border-outline-variant text-secondary focus:ring-secondary"
                />
                Formation certifiante
              </label>
            </CardBody>
          </Card>
        </aside>
      </div>
    </form>
  );
}
