import { ButtonLink, Card, CardBody, Icon } from "@/components/ui";
import { OffresBrowser } from "@/features/offres/offres-browser";
import { currentJeune, offres } from "@/lib/mock-data";

export default function OffresJeunePage() {
  const published = offres.filter((o) => o.status === "publiee");
  const j = currentJeune;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <OffresBrowser offres={published} detailBase="/espace-jeune/offres" variant="list" />
      </section>

      <aside className="space-y-4">
        <div className="lg:sticky lg:top-20 space-y-4">
          <Card>
            <CardBody className="space-y-3">
              <h3 className="font-bold text-primary">Préférences de recherche</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Filière</span>
                <span className="font-semibold text-on-surface">{j.filiere}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Niveau</span>
                <span className="font-semibold text-on-surface">{j.niveauEtudes}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Ville</span>
                <span className="font-semibold text-on-surface">{j.ville}</span>
              </div>
              <ButtonLink href="/espace-jeune/parametres" variant="outline" size="sm" fullWidth>
                Modifier mes préférences
              </ButtonLink>
            </CardBody>
          </Card>

          <Card className="bg-primary text-white">
            <CardBody className="space-y-2 text-center">
              <Icon name="notifications_active" className="mx-auto text-3xl text-secondary-fixed-dim" />
              <p className="text-sm font-semibold">Alertes offres activées</p>
              <p className="text-xs text-white/70">
                Vous êtes notifié dès qu&apos;une offre correspond à votre profil.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <h3 className="flex items-center gap-2 font-bold text-primary">
                <Icon name="lightbulb" className="text-secondary" /> Conseil
              </h3>
              <p className="text-sm text-on-surface-variant">
                Complétez vos formations employabilité pour augmenter vos chances d&apos;être retenu.
              </p>
              <ButtonLink href="/espace-jeune/formations" variant="ghost" size="sm" className="px-0">
                Voir les formations →
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </aside>
    </div>
  );
}
