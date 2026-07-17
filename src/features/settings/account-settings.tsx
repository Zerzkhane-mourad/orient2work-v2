import { Button, Card, CardBody, CardHeader, CardTitle, Icon, Input, PageHeader } from "@/components/ui";

interface AccountSettingsProps {
  /** Prefill for the identity fields. */
  name: string;
  email: string;
}

const notifPrefs = [
  "Nouvelles offres correspondant à mon profil",
  "Confirmation de candidature",
  "Demandes et confirmations d'entretien",
  "Rappels avant entretien",
];

/** Shared account settings page (profile, security, notifications). */
export function AccountSettings({ name, email }: AccountSettingsProps) {
  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Gérez votre compte, votre sécurité et vos notifications." />

      <Card>
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Input label="Nom" defaultValue={name} />
          <Input label="Email" type="email" defaultValue={email} />
          <Input label="Téléphone" type="tel" placeholder="+212 6 …" />
          <Input label="Ville" placeholder="Casablanca" />
          <div className="sm:col-span-2">
            <Button variant="secondary">Enregistrer les modifications</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Input label="Mot de passe actuel" type="password" placeholder="••••••••" />
          <div className="hidden sm:block" />
          <Input label="Nouveau mot de passe" type="password" placeholder="••••••••" />
          <Input label="Confirmer" type="password" placeholder="••••••••" />
          <div className="sm:col-span-2">
            <Button variant="outline">Mettre à jour le mot de passe</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications email</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {notifPrefs.map((pref) => (
            <label
              key={pref}
              className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 hover:bg-surface-container-low"
            >
              <span className="text-sm text-on-surface">{pref}</span>
              <input
                type="checkbox"
                defaultChecked
                className="h-5 w-5 rounded border-outline-variant text-secondary focus:ring-secondary"
              />
            </label>
          ))}
        </CardBody>
      </Card>

      <Card className="border-error-container">
        <CardBody className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-bold text-error">
              <Icon name="warning" className="text-[18px]" /> Supprimer le compte
            </p>
            <p className="text-sm text-on-surface-variant">Cette action est irréversible.</p>
          </div>
          <Button variant="danger">Supprimer</Button>
        </CardBody>
      </Card>
    </div>
  );
}
