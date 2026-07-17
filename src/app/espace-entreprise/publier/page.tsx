import { Button, Card, CardBody, CardHeader, CardTitle, Icon, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { FILIERES, NIVEAUX_ETUDES, OPPORTUNITY_TYPES, WORK_MODES } from "@/lib/constants";

export default function PublierOffrePage() {
  return (
    <form className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Publier une offre"
        subtitle="Votre offre sera soumise à validation par OMB avant publication."
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations principales</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Input label="Titre du poste" placeholder="Développeur Front-end" required className="sm:col-span-2" />
          <Select label="Type d'opportunité" required defaultValue="">
            <option value="" disabled>
              Sélectionnez…
            </option>
            {OPPORTUNITY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Select label="Mode de travail" required defaultValue="">
            <option value="" disabled>
              Sélectionnez…
            </option>
            {WORK_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
          <Input label="Ville" placeholder="Casablanca" required />
          <Input label="Nombre de postes" type="number" min={1} defaultValue={1} required />
          <Input label="Durée" placeholder="6 mois" />
          <Input label="Date limite" type="date" required />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil recherché</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Select label="Niveau d'études demandé" required defaultValue="">
            <option value="" disabled>
              Sélectionnez…
            </option>
            {NIVEAUX_ETUDES.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </Select>
          <Select label="Filière demandée" required defaultValue="">
            <option value="" disabled>
              Sélectionnez…
            </option>
            {FILIERES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
          <Input
            label="Compétences requises"
            placeholder="React, TypeScript, CSS (séparées par des virgules)"
            className="sm:col-span-2"
          />
          <Input label="Responsable de l'offre" placeholder="Sophie Martin" className="sm:col-span-2" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description &amp; missions</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <Textarea label="Description du poste" rows={4} placeholder="Présentez le contexte et le rôle…" required />
          <Textarea label="Missions principales" rows={4} placeholder="Listez les missions…" />
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline">
          <Icon name="save" className="text-[18px]" /> Enregistrer en brouillon
        </Button>
        <Button type="submit" variant="secondary">
          <Icon name="send" className="text-[18px]" /> Soumettre à validation
        </Button>
      </div>
    </form>
  );
}
