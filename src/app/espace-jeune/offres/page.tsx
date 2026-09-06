"use client";

import { Suspense } from "react";
import { ButtonLink, Card, CardBody, Icon, PageHeader, SkeletonList } from "@/components/ui";
import { EmailVerificationBanner } from "@/features/auth/require-role";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { OffresBrowser } from "@/features/offres/offres-browser";

/**
 * `OffresBrowser` lit l'URL (`?q=`, `?type=`) : en rendu statique, cela impose
 * une frontière de suspense, sans quoi la page entière bascule en dynamique.
 *
 * Le repli ne peut PAS être le contenu lui-même — il suspendrait à son tour,
 * pour la même raison.
 */
export default function OffresJeunePage() {
  return (
    <Suspense fallback={<SkeletonList count={4} />}>
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const { jeune } = useProfile();
  // Candidater exige un profil validé (test réussi ≥ 80 %) : autant le dire ici
  // plutôt que de laisser l'utilisateur buter sur un 403 au moment de postuler.
  const peutCandidater = jeune.status === "valide";

  return (
    <div className="space-y-4">
      {/* Titre de page — il manquait. Un écran sans `<h1>` ne s'annonce pas :
          un lecteur d'écran qui saute de titre en titre atterrissait
          directement sur les filtres, sans savoir où il était. */}
      <PageHeader
        size="sm"
        title="Offres"
        subtitle="Stages, emplois et alternances publiés par les entreprises partenaires."
      />

      <EmailVerificationBanner />

      {!peutCandidater && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
          <Icon name="fact_check" className="text-[18px]" />
          <span className="flex-1">
            Vous pouvez consulter les offres, mais votre profil doit être validé par le test pour
            candidater.
          </span>
          <ButtonLink href="/espace-jeune/test" size="sm" variant="secondary">
            Passer le test
          </ButtonLink>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <OffresBrowser detailBase="/espace-jeune/offres" variant="list" />
        </section>

        <aside className="space-y-4">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Point d'entrée contextuel : c'est en ne trouvant pas d'annonce
                qui convient qu'on pense à solliciter une entreprise
                directement. Le menu seul laissait la fonction invisible à qui
                ne l'y cherchait pas. */}
            {peutCandidater && (
              <Card className="bg-secondary-container">
                <CardBody className="space-y-2">
                  <h3 className="flex items-center gap-2 font-bold text-on-secondary-container">
                    <Icon name="handshake" className="text-[20px]" />
                    Aucune offre ne correspond ?
                  </h3>
                  <p className="text-sm text-on-secondary-container/90">
                    Certaines entreprises ouvrent des créneaux d&apos;échange. Réservez un rendez-vous
                    sans passer par une annonce.
                  </p>
                  <ButtonLink
                    href="/espace-jeune/candidature-spontanee"
                    size="sm"
                    variant="secondary"
                  >
                    Candidature spontanée
                  </ButtonLink>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody className="space-y-3">
                <h3 className="font-bold text-primary">Mon profil de recherche</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">Filière</span>
                  <span className="font-semibold text-on-surface">{jeune.filiere || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">Niveau</span>
                  <span className="font-semibold text-on-surface">{jeune.niveauEtudes || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">Ville</span>
                  <span className="font-semibold text-on-surface">{jeune.ville || "—"}</span>
                </div>
                <ButtonLink href="/espace-jeune/profil" variant="outline" size="sm" fullWidth>
                  Modifier mon profil
                </ButtonLink>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-2">
                <h3 className="flex items-center gap-2 font-bold text-primary">
                  <Icon name="lightbulb" className="text-secondary" /> Conseil
                </h3>
                <p className="text-sm text-on-surface-variant">
                  Complétez vos formations employabilité pour augmenter vos chances d&apos;être
                  retenu.
                </p>
                <ButtonLink
                  href="/espace-jeune/formations"
                  variant="ghost"
                  size="sm"
                  className="px-0"
                >
                  Voir les formations →
                </ButtonLink>
              </CardBody>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
