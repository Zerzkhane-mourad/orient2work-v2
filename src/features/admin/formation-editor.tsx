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
  ImageUpload,
  Input,
  RichText,
  RichTextEditor,
  optionsFromLabels,
  Select,
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { ApiFormation } from "@/lib/api/types";
import { useMutation } from "@/lib/api/use-api";
import { useCategories, useFilieres } from "./use-referentiel";
import { FormationQuizEditor } from "./formation-quiz-editor";
import { mediaUrl } from "@/lib/api/urls";
import { cn, countChapitres } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui";

const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé", "Tous niveaux"] as const;

interface FormationEditorProps {
  /** Existing formation to edit; omit to create a new one. */
  formation?: ApiFormation;
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
  // La catégorie est portée par son IDENTIFIANT : c'est ce que l'API attend, et
  // un renommage en cours d'édition ne casse donc pas l'enregistrement.
  const [categorieId, setCategorieId] = useState<string>(formation?.categorieId ?? "");

  const { categories } = useCategories("publiques");
  const { filieres } = useFilieres();

  // Si la formation éditée porte une catégorie désormais désactivée, on la garde
  // dans la liste : sans cela le `<select>` afficherait un choix vide et
  // l'enregistrement changerait sa catégorie à l'insu de l'administrateur.
  const choixCategories =
    formation?.categorieId && !categories.some((c) => c.id === formation.categorieId)
      ? [...categories, { id: formation.categorieId, nom: `${formation.categorie} (désactivée)` }]
      : categories;
  const [filiereId, setFiliereId] = useState<string>(formation?.filiereId ?? "");
  const [niveau, setNiveau] = useState<string>(formation?.niveau ?? "Débutant");
  const [tempsLecture, setTempsLecture] = useState(String(formation?.tempsLectureMin ?? 5));
  const [certifiante, setCertifiante] = useState(formation?.certifiante ?? true);
  const [objectifs, setObjectifs] = useState((formation?.objectifs ?? []).join("\n"));
  const [prerequis, setPrerequis] = useState((formation?.prerequis ?? []).join("\n"));
  const [contenuHtml, setContenuHtml] = useState(formation?.contenuHtml ?? EMPTY_CONTENT);

  // Deux états pour la couverture : l'aperçu affiché (URL existante ou data URL
  // du fichier choisi) et le fichier lui-même, envoyé APRÈS l'enregistrement.
  const [apercuImage, setApercuImage] = useState<string | undefined>(
    formation?.image ? mediaUrl(formation.image) : undefined,
  );
  const [fichierImage, setFichierImage] = useState<File | undefined>();
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  // La formation côté serveur : `null` tant qu'elle n'existe pas. Les opérations
  // sur le quiz la renvoient à jour, ce qui évite de recharger la page.
  const [courante, setCourante] = useState<ApiFormation | null>(formation ?? null);

  const chapitres = countChapitres(contenuHtml);

  // La filière ne se saisit que pour les formations de spécialité — règle métier
  // portée par le LIBELLÉ, qu'il faut donc retrouver depuis l'identifiant.
  const categorieChoisie = choixCategories.find((c) => c.id === categorieId)?.nom;

  const { run, pending, error } = useMutation(async (): Promise<ApiFormation> => {
    // Le contenu HTML est assaini côté serveur avant persistance : seule une
    // liste blanche de balises et d'attributs survit.
    const payload = {
      titre,
      // Les champs facultatifs vides sont omis : les schémas backend sont
      // stricts et refuseraient une chaîne vide là où ils attendent une
      // valeur du référentiel.
      ...(sousTitre.trim() ? { sousTitre: sousTitre.trim() } : {}),
      description,
      categorieId,
      ...(filiereId ? { filiereId } : {}),
      ...(niveau ? { niveau } : {}),
      tempsLectureMin: Number(tempsLecture),
      certifiante,
      objectifs: objectifs
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      prerequis: prerequis
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      contenuHtml,
    };

    const cible = courante ?? formation;
    const enregistree = cible
      ? await api.admin.updateFormation(cible.id, payload)
      : await api.admin.createFormation(payload);

    // La couverture part ensuite : à la création, la formation n'a d'identifiant
    // qu'une fois enregistrée. En cas d'échec ici, le contenu reste sauvegardé.
    const finale = fichierImage
      ? await api.admin.uploadFormationImage(enregistree.id, fichierImage)
      : enregistree;

    // Une création vient de produire un identifiant : le bloc quiz s'active.
    setCourante(finale);
    return finale;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await run();
    if (!result) return;
    setSaved(true);

    setTimeout(() => {
      // Après une CRÉATION on reste sur la formation : le quiz se compose
      // ensuite, et renvoyer à la liste obligerait à la rouvrir aussitôt.
      router.push(isEdit ? "/admin/formations" : `/admin/formations/${result.id}`);
      router.refresh();
    }, 800);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
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
          <Button type="submit" variant="secondary" disabled={pending}>
            <Icon name="save" className="text-[18px]" />
            {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </div>

      {error && <ErrorBanner error={error} />}

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

          {/* Le quiz suppose une formation qui existe : ses questions portent des
              identifiants auxquels les tentatives font référence. À la création,
              on enregistre d'abord, on compose le quiz ensuite. */}
          {courante ? (
            <FormationQuizEditor formation={courante} onChange={setCourante} />
          ) : (
            <Card className="border-dashed">
              <CardBody className="flex items-start gap-3 text-sm text-on-surface-variant">
                <Icon name="quiz" className="mt-0.5 shrink-0 text-secondary" />
                <p>Le test de la formation se compose une fois celle-ci enregistrée.</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Meta */}
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              {/* Le composant produit un aperçu redimensionné pour l'affichage ET
                  conserve le fichier d'origine : c'est lui qui part à l'API, qui
                  vérifie type MIME, extension, signature binaire et taille. */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Couverture</span>
                <ImageUpload
                  value={apercuImage}
                  onChange={setApercuImage}
                  onFile={setFichierImage}
                  shape="wide"
                  maxWidth={1280}
                  maxHeight={720}
                  emptyLabel="Ajouter une couverture"
                  hint="JPG, PNG ou WebP — format 16/9 conseillé, 5 Mo maximum."
                />
              </div>
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
              {/* Référentiel administrable : les catégories désactivées ne sont
                  pas proposées, mais une formation qui en utilise une conserve la
                  sienne (ajoutée ci-dessus). La valeur est l'identifiant, le
                  libellé n'est qu'un affichage. */}
              <Select
                label="Catégorie"
                required
                value={categorieId}
                onChange={setCategorieId}
                error={error?.issueFor("categorieId")}
                options={choixCategories.map((c) => ({ value: c.id, label: c.nom }))}
              />
              {categorieChoisie === "Spécialité" && (
                <Select
                  label="Filière"
                  value={filiereId}
                  onChange={setFiliereId}
                  options={[
                    { value: "", label: "Toutes les filières" },
                    ...filieres.map((f) => ({ value: f.id, label: f.nom })),
                  ]}
                />
              )}
              <Select
                label="Niveau"
                value={niveau}
                onChange={setNiveau}
                options={optionsFromLabels(NIVEAUX)}
              />
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
