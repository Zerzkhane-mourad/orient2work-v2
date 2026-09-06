"use client";

import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorBanner,
  Icon,
  ImageUpload,
  Input,
  Modal,
  PageHeader,
  StatusBadge,
  SuccessBanner,
  Textarea,
} from "@/components/ui";
import { useEntreprise } from "@/features/entreprise/entreprise-store";
import { ValidationBanner } from "@/features/entreprise/validation-banner";

export default function ProfilEntreprisePage() {
  const { entreprise, update, uploadLogo, saving, saveError } = useEntreprise();

  const [form, setForm] = useState({
    nom: entreprise.nom,
    secteur: entreprise.secteur,
    ville: entreprise.ville,
    siteWeb: entreprise.siteWeb ?? "",
    responsable: entreprise.responsable,
    emailResponsable: entreprise.emailResponsable,
    telephone: entreprise.telephone,
    description: entreprise.description,
  });
  const [saved, setSaved] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const [logoFile, setLogoFile] = useState<File | undefined>();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    // Site web facultatif : une chaîne vide serait rejetée par la validation
    // d'URL côté serveur, on omet le champ plutôt que de l'envoyer vide.
    const ok = await update({
      ...form,
      siteWeb: form.siteWeb.trim() || undefined,
    });
    if (ok) setSaved(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil entreprise"
        subtitle="Ces informations sont visibles par les jeunes talents."
        actions={<StatusBadge kind="entreprise" status={entreprise.status} />}
      />

      <ValidationBanner />

      <Card>
        <CardBody className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative">
            {/* `Avatar` résout lui-même les documents protégés : lui passer une
                source déjà résolue déclenchait un second téléchargement. */}
            <Avatar src={entreprise.logo} alt={entreprise.nom} size={88} />
            <button
              type="button"
              onClick={() => {
                setLogoPreview(undefined);
                setLogoFile(undefined);
                setLogoOpen(true);
              }}
              aria-label="Modifier le logo"
              title="Modifier le logo"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container ring-2 ring-surface-container-lowest transition-transform hover:scale-105"
            >
              <Icon name="photo_camera" className="text-[16px]" />
            </button>
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h2 className="font-headline text-2xl font-bold text-primary">{entreprise.nom}</h2>
            <p className="font-semibold text-on-surface-variant">{entreprise.secteur}</p>
            <p className="max-w-2xl text-sm text-on-surface-variant">{entreprise.description}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-1 text-sm text-on-surface-variant sm:justify-start">
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-[16px]" /> {entreprise.ville}
              </span>
              {entreprise.siteWeb && (
                <a
                  href={entreprise.siteWeb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Icon name="language" className="text-[16px]" /> {entreprise.siteWeb}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Icon name="work" className="text-[16px]" /> {entreprise.offresPubliees} offre(s)
                publiée(s)
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifier les informations</CardTitle>
        </CardHeader>
        <CardBody>
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
            {saveError && (
              <div className="sm:col-span-2">
                <ErrorBanner error={saveError} />
              </div>
            )}
            {saved && !saveError && (
              <div className="sm:col-span-2">
                <SuccessBanner message="Modifications enregistrées." />
              </div>
            )}

            <Input
              label="Nom de l'entreprise"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              error={saveError?.issueFor("nom")}
              required
            />
            <Input
              label="Secteur d'activité"
              value={form.secteur}
              onChange={(e) => setForm({ ...form, secteur: e.target.value })}
              error={saveError?.issueFor("secteur")}
              required
            />
            <Input
              label="Ville"
              value={form.ville}
              onChange={(e) => setForm({ ...form, ville: e.target.value })}
              error={saveError?.issueFor("ville")}
              required
            />
            <Input
              label="Site web"
              type="url"
              placeholder="https://…"
              value={form.siteWeb}
              onChange={(e) => setForm({ ...form, siteWeb: e.target.value })}
              error={saveError?.issueFor("siteWeb")}
            />
            <Input
              label="Responsable"
              value={form.responsable}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
              error={saveError?.issueFor("responsable")}
              required
            />
            <Input
              label="Email du responsable"
              type="email"
              value={form.emailResponsable}
              onChange={(e) => setForm({ ...form, emailResponsable: e.target.value })}
              error={saveError?.issueFor("emailResponsable")}
              hint="Contact affiché aux candidats ; différent de l'email de connexion."
            />
            <Input
              label="Téléphone"
              type="tel"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              error={saveError?.issueFor("telephone")}
              required
            />
            <div className="hidden sm:block" />
            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                error={saveError?.issueFor("description")}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Modal
        open={logoOpen}
        onClose={() => setLogoOpen(false)}
        title="Logo de l'entreprise"
        description="Un logo carré sur fond clair donne le meilleur rendu."
        footer={
          <>
            <Button variant="ghost" onClick={() => setLogoOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              disabled={!logoFile || saving}
              onClick={() => {
                if (logoFile) void uploadLogo(logoFile);
                setLogoOpen(false);
              }}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <ImageUpload
          value={logoPreview}
          onChange={setLogoPreview}
          onFile={setLogoFile}
          shape="circle"
          maxWidth={512}
          maxHeight={512}
          emptyLabel="Ajouter un logo"
          hint="JPG, PNG ou WebP — 5 Mo max. Le SVG n'est pas accepté."
        />
      </Modal>
    </div>
  );
}
