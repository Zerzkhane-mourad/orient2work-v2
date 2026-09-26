"use client";

import { Suspense } from "react";
import { ButtonLink, Card, CardBody, Icon, SkeletonList } from "@/components/ui";
import { EmailVerificationBanner } from "@/features/auth/require-role";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { OffresBrowser } from "@/features/offres/offres-browser";
import { ProfilRecherche } from "@/features/offres/profil-recherche";

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
      {/*
        Bandeau d'en-tête, bleu nuit et or.

        Il porte aussi l'ÉTAT du candidat — peut-il postuler ? — qui vivait
        dans un bandeau jaune à part : l'information qui conditionne tout le
        reste de la page est désormais lue avec son titre, pas après.
        `primary-container` : profond dans tous les thèmes, y compris sombre.
      */}
      <section className="relative overflow-hidden rounded-2xl bg-primary-container px-5 py-6 text-white shadow-level-1 sm:px-8 sm:py-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-secondary-container/20 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-3xl"
        />
        <Icon
          name="work"
          className="pointer-events-none absolute -bottom-6 right-6 hidden text-[140px] text-white/[0.05] sm:block"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
              <Icon name="business_center" className="text-[16px]" /> Offres
            </p>
            <h1 className="text-balance font-headline text-2xl font-bold leading-tight sm:text-3xl">
              Trouvez votre prochaine opportunité
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Stages, emplois et alternances publiés par les entreprises partenaires.
            </p>
          </div>

          {peutCandidater ? (
            <p className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15 lg:self-auto">
              <Icon name="verified" className="text-[18px] text-secondary-fixed-dim" />
              Profil validé — vous pouvez postuler
            </p>
          ) : (
            <div className="flex shrink-0 flex-col gap-3 rounded-xl bg-white/10 p-4 ring-1 ring-white/15 sm:flex-row sm:items-center lg:max-w-md">
              <p className="flex items-start gap-2 text-sm text-white/90">
                <Icon name="fact_check" className="mt-0.5 shrink-0 text-[18px] text-secondary-fixed-dim" />
                Consultez librement ; pour postuler, validez d&apos;abord votre profil avec le test.
              </p>
              <ButtonLink href="/espace-jeune/test" size="sm" variant="secondary" className="shrink-0">
                Passer le test
              </ButtonLink>
            </div>
          )}
        </div>
      </section>

      <EmailVerificationBanner />

      {/*
        Colonne latérale à partir de `xl` seulement.

        Chaque offre porte désormais son propre panneau « en bref » à droite :
        dans les deux tiers d'un écran `lg`, carte et panneau se seraient
        disputé 700 px, et l'annonce aurait tenu en une colonne de mots. En
        dessous de `xl`, la liste prend toute la largeur et les encarts se
        rangent côte à côte à sa suite.
      */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0">
          <OffresBrowser detailBase="/espace-jeune/offres" variant="list" />
        </section>

        <aside>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:sticky xl:top-20 xl:grid-cols-1">
            {/* Point d'entrée contextuel : c'est en ne trouvant pas d'annonce
                qui convient qu'on pense à solliciter une entreprise
                directement. Le menu seul laissait la fonction invisible à qui
                ne l'y cherchait pas. */}
            {/*
              Encart d'appel, en bleu nuit et or.

              Il était or sur or : fond jaune, bouton jaune — le bouton se
              fondait dans la carte, et l'encart dans les pastilles « gold » de
              la liste. Le fond sombre le détache de tout ce qui l'entoure, et
              le bouton or devient le point le plus contrasté de la colonne.

              `primary-container` et non `primary` : en thème sombre, `primary`
              devient un bleu pâle sur lequel le texte blanc ne se lirait plus ;
              le conteneur reste profond dans tous les thèmes.
            */}
            {peutCandidater && (
              <Card className="relative overflow-hidden border-0 bg-primary-container text-white">
                {/* Halo or et motif — décor seul, sous le contenu. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary-container/25 blur-3xl"
                />
                <Icon
                  name="handshake"
                  className="pointer-events-none absolute -bottom-5 -right-4 text-[120px] text-white/[0.06]"
                />

                <CardBody className="relative space-y-4 p-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container shadow-level-1">
                    <Icon name="handshake" className="text-[22px]" />
                  </span>

                  <div className="space-y-1.5">
                    <h3 className="font-headline text-lg font-bold leading-snug">
                      Aucune offre ne correspond ?
                    </h3>
                    <p className="text-sm leading-relaxed text-white/80">
                      Certaines entreprises ouvrent des créneaux d&apos;échange. Réservez un
                      rendez-vous sans passer par une annonce.
                    </p>
                  </div>

                  {/* Ce que l'on obtient, en deux points : on s'engage plus
                      volontiers quand on sait ce qui suit le clic. */}
                  <ul className="space-y-1.5 text-sm text-white/90">
                    <li className="flex items-center gap-2">
                      <Icon name="event_available" className="shrink-0 text-[16px] text-secondary-fixed-dim" />
                      Un créneau choisi par vous
                    </li>
                    <li className="flex items-center gap-2">
                      <Icon name="business" className="shrink-0 text-[16px] text-secondary-fixed-dim" />
                      Un échange direct avec l&apos;entreprise
                    </li>
                  </ul>

                  <ButtonLink
                    href="/espace-jeune/candidature-spontanee"
                    variant="secondary"
                    fullWidth
                    className="group"
                  >
                    Candidature spontanée
                    <Icon
                      name="arrow_forward"
                      className="text-[18px] transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </ButtonLink>
                </CardBody>
              </Card>
            )}

            <ProfilRecherche jeune={jeune} />

            {/* Conseil en or doux : il se distingue des cartes blanches sans
                concurrencer l'encart bleu nuit, seul appel fort de la colonne. */}
            <Card className="border-secondary-container/60 bg-secondary-container/25">
              <CardBody className="space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                    <Icon name="lightbulb" className="text-[20px]" />
                  </span>
                  <h3 className="font-bold text-primary">Conseil</h3>
                </div>
                <p className="text-sm leading-relaxed text-on-surface">
                  Complétez vos formations employabilité pour augmenter vos chances d&apos;être
                  retenu.
                </p>
                <ButtonLink
                  href="/espace-jeune/formations"
                  variant="ghost"
                  size="sm"
                  className="group -ml-2 text-primary"
                >
                  Voir les formations
                  <Icon
                    name="arrow_forward"
                    className="text-[16px] transition-transform duration-200 group-hover:translate-x-1"
                  />
                </ButtonLink>
              </CardBody>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
