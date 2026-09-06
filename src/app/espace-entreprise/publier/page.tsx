"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorBanner,
  Icon,
  Input,
  PageHeader,
  optionsFromLabels,
  Select,
  Textarea,
} from "@/components/ui";
import { useEntreprise } from "@/features/entreprise/entreprise-store";
import { ValidationBanner } from "@/features/entreprise/validation-banner";
import { api } from "@/lib/api";
import { useMutation } from "@/lib/api/use-api";
import { NIVEAUX_ETUDES, OPPORTUNITY_TYPES, WORK_MODES } from "@/lib/constants";
import { useFilieres } from "@/features/admin/use-referentiel";

/** Demain, au format `YYYY-MM-DD` — l'API refuse une date limite passée. */
function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0]!;
}

export default function PublierOffrePage() {
  const { filieres } = useFilieres();
  const router = useRouter();
  const { isValidated } = useEntreprise();

  const [form, setForm] = useState({
    titre: "",
    type: "",
    mode: "",
    ville: "",
    nombrePostes: "1",
    dateLimite: "",
    niveauDemande: "",
    filiereId: "",
    competences: "",
    description: "",
  });

  const { run, pending, error } = useMutation(api.offres.create);

  const submit = async (status: "brouillon" | "attente_validation") => {
    const created = await run({
      titre: form.titre,
      type: form.type,
      mode: form.mode,
      ville: form.ville,
      nombrePostes: Number(form.nombrePostes) || 1,
      dateLimite: form.dateLimite,
      niveauDemande: form.niveauDemande,
      filiereId: form.filiereId,
      competences: form.competences
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      description: form.description,
      status,
    });
    if (created) {
      router.push("/espace-entreprise/offres");
      router.refresh();
    }
  };

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /** Variante pour les listes déroulantes, qui remontent la valeur directement. */
  const setValue = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form
      className="mx-auto max-w-3xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit("attente_validation");
      }}
      noValidate
    >
      <PageHeader
        title="Publier une offre"
        subtitle="Votre offre sera soumise à validation par OMB avant publication."
      />

      {/* Publier exige un compte validé : autant l'annoncer avant le formulaire. */}
      <ValidationBanner />

      {error && <ErrorBanner error={error} />}

      <Card>
        <CardHeader>
          <CardTitle>Informations principales</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Titre du poste"
              placeholder="Développeur Front-end"
              value={form.titre}
              onChange={set("titre")}
              error={error?.issueFor("titre")}
              required
            />
          </div>
          <Select
            label="Type d'opportunité"
            value={form.type}
            onChange={setValue("type")}
            error={error?.issueFor("type")}
            options={optionsFromLabels(OPPORTUNITY_TYPES)}
            required
          />
          <Select
            label="Mode de travail"
            value={form.mode}
            onChange={setValue("mode")}
            error={error?.issueFor("mode")}
            options={optionsFromLabels(WORK_MODES)}
            required
          />
          <Input
            label="Ville"
            placeholder="Casablanca"
            value={form.ville}
            onChange={set("ville")}
            error={error?.issueFor("ville")}
            required
          />
          <Input
            label="Nombre de postes"
            type="number"
            min={1}
            value={form.nombrePostes}
            onChange={set("nombrePostes")}
            error={error?.issueFor("nombrePostes")}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Date limite de candidature"
              type="date"
              min={tomorrow()}
              value={form.dateLimite}
              onChange={set("dateLimite")}
              error={error?.issueFor("dateLimite")}
              required
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil recherché</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Niveau d'études demandé"
            value={form.niveauDemande}
            onChange={setValue("niveauDemande")}
            error={error?.issueFor("niveauDemande")}
            options={optionsFromLabels(NIVEAUX_ETUDES)}
            required
          />
          {/* La valeur est l'identifiant, le libellé n'est qu'un affichage. */}
          <Select
            label="Filière demandée"
            value={form.filiereId}
            onChange={setValue("filiereId")}
            error={error?.issueFor("filiereId")}
            options={filieres.map((f) => ({ value: f.id, label: f.nom }))}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Compétences requises"
              placeholder="React, TypeScript, CSS (séparées par des virgules)"
              value={form.competences}
              onChange={set("competences")}
              error={error?.issueFor("competences")}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description du poste</CardTitle>
        </CardHeader>
        <CardBody>
          <Textarea
            label="Description"
            rows={8}
            value={form.description}
            onChange={set("description")}
            error={error?.issueFor("description")}
            placeholder="Présentez le contexte, le rôle et les missions principales…"
            hint="20 caractères minimum."
            required
          />
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={pending || !isValidated}
          onClick={() => void submit("brouillon")}
        >
          <Icon name="save" className="text-[18px]" /> Enregistrer en brouillon
        </Button>
        <Button type="submit" variant="secondary" disabled={pending || !isValidated}>
          <Icon name="send" className="text-[18px]" />
          {pending ? "Envoi…" : "Soumettre à validation"}
        </Button>
      </div>
    </form>
  );
}
