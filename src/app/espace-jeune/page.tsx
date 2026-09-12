"use client";

import {
  ButtonLink,
  Card,
  CardBody,
  DatePill,
  EmptyState,
  Icon,
  SkeletonCard,
  SkeletonList,
} from "@/components/ui";
import type { IconName } from "@/components/ui/icon";
import { EmailVerificationBanner } from "@/features/auth/require-role";
import { OffreCard } from "@/features/offres/offre-card";
import { buildParcours } from "@/features/jeune/parcours";
import { ParcoursTracker } from "@/features/jeune/parcours-tracker";
import { ProfileSummaryCard } from "@/features/jeune/profile-summary-card";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { useNotifications } from "@/features/notifications/use-notifications";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { QUIZ_PASS_SCORE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function EspaceJeuneDashboard() {
  const { jeune } = useProfile();
  const { notifications } = useNotifications(4);

  const offres = useApi(() => api.offres.list({ perPage: 5 }), []);
  const entretiens = useApi(() => api.entretiens.list({ status: "accepte", perPage: 5 }), []);
  const formations = useApi(() => api.formations.list({ perPage: 5 }), []);

  const nextInterview = entretiens.data?.items[0];
  const recommended = offres.data?.items ?? [];
  const suggestionsFormations = (formations.data?.items ?? []).slice(0, 3);

  // Dérivé par `buildParcours` : l'ordre des étapes, les verrous et l'étape
  // courante sont une règle métier, pas une mise en forme.
  const parcours = buildParcours(jeune);

  /*
   * La « prochaine étape », en UN seul objet.
   *
   * La page dessinait DEUX cartes complètes — entretien à venir / pas
   * d'entretien — identiques à quatre valeurs près. Elles avaient déjà commencé
   * à diverger, et chaque correction de mise en forme devait être faite deux
   * fois : c'est ainsi qu'un même bloc finit par ne plus se comporter pareil
   * selon l'état des données. Ce qui change est ici, la carte est plus bas.
   */
  const etape: {
    titre: string;
    detail: string;
    href: string;
    cta: string;
    illustration: IconName;
  } = nextInterview
    ? {
        titre: `Préparez votre entretien avec ${nextInterview.entreprise.nom}`,
        detail: `${nextInterview.offreTitre} · ${formatDate(nextInterview.date)} à ${nextInterview.heure}.`,
        href: "/espace-jeune/entretiens",
        cta: "Guide de préparation",
        illustration: "handshake",
      }
    : jeune.status !== "valide"
      ? {
          titre: "Validez votre profil avec le test",
          detail: `Un score d'au moins ${QUIZ_PASS_SCORE}% débloque les candidatures.`,
          href: "/espace-jeune/test",
          cta: "Passer le test",
          illustration: "rocket_launch",
        }
      : {
          titre:
            jeune.candidatures === 0
              ? "Postulez à votre première offre"
              : "Continuez à développer votre employabilité",
          detail:
            "Chaque formation validée augmente votre visibilité auprès des recruteurs.",
          href: "/espace-jeune/offres",
          cta: "Voir les offres",
          illustration: "rocket_launch",
        };

  return (
    /*
     * Ordre à trois colonnes sur grand écran, ordre de PRIORITÉ en dessous.
     *
     * Empilées telles quelles, les colonnes latérales passaient avant le fil
     * central : sur mobile, on ouvrait son tableau de bord sur une carte de
     * profil et une réclame pour les formations, et la bannière de vérification
     * d'email comme la prochaine étape n'arrivaient qu'après deux écrans de
     * défilement. `order-*` remet le fil en tête, sans toucher au rendu large.
     *
     * ── Le palier tablette ──────────────────────────────────────────────────
     *
     * La grille passait de 1 colonne à 12 d'un seul coup, à `lg` (1024 px).
     * Entre 640 et 1024 — toutes les tablettes, et un portable en fenêtre
     * partagée — la page restait donc une colonne unique : des cartes de profil
     * et de notifications étirées sur près de 1000 px pour trois lignes de
     * texte, et un fil qu'il fallait dérouler bien plus longtemps qu'il ne le
     * fallait.
     *
     * À `md`, deux colonnes : le fil garde la pleine largeur (c'est lui qu'on
     * lit), et les deux rails se rangent côte à côte en dessous — profil à
     * gauche, suggestions à droite, l'ordre qu'ils reprendront à `lg`.
     */
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-12">
      <aside className="order-3 md:order-2 lg:order-1 lg:col-span-3">
        <div className="lg:sticky lg:top-20 space-y-4">
          <ProfileSummaryCard />
          {/* Réclame masquée sur petit écran : « Formations suggérées », dans
              l'autre colonne, y mène déjà — avec de vraies formations. */}
          <Card className="hidden bg-primary text-white lg:block">
            <CardBody className="space-y-2 p-4 text-center sm:p-6">
              <Icon
                name="workspace_premium"
                className="mx-auto text-3xl text-secondary-fixed-dim"
              />
              <p className="text-sm font-semibold">Boostez vos chances de succès</p>
              <ButtonLink href="/espace-jeune/formations" variant="secondary" size="sm" fullWidth>
                Suivre une formation
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </aside>

      {/* Center — feed */}
      <section className="order-1 space-y-4 md:col-span-2 lg:order-2 lg:col-span-6">
        {/*
          Titre invisible, mais bien présent.

          Le tableau de bord est un FIL : son premier élément visible est la
          prochaine étape, et lui poser un titre par-dessus n'ajouterait qu'une
          ligne à faire défiler. Il n'avait pour autant aucun `<h1>` — la page
          ne s'annonçait donc pas, et la navigation par titres d'un lecteur
          d'écran commençait au milieu du contenu.
        */}
        <h1 className="sr-only">Tableau de bord</h1>

        <EmailVerificationBanner />

        {/*
          Prochaine étape — la seule carte que l'on veut voir sans défiler.

          Un squelette tant que les entretiens n'ont pas répondu : sans lui, la
          carte s'affichait d'abord dans sa version « pas d'entretien », puis se
          remplaçait par le rappel d'entretien une fois la réponse arrivée. On
          lisait donc, en haut de page et pendant une seconde, une consigne qui
          n'était pas la bonne.
        */}
        {entretiens.loading ? (
          <SkeletonCard />
        ) : (
          <Card className="overflow-hidden bg-secondary-container">
            <CardBody className="relative p-4 sm:p-6">
              {/*
                `max-w-lg` seulement quand la place existe : sur un téléphone,
                cette largeur maximale ne bornait rien et le titre courait
                jusqu'au bord. `pr-*` réserve la place de l'illustration.
              */}
              <div className="relative z-10 space-y-3 pr-12 sm:max-w-lg sm:pr-16">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-secondary-container">
                  <Icon name="priority_high" className="text-[16px]" /> Prochaine étape
                </span>
                {/* `text-balance` : sur deux ou trois lignes, le titre ne finit
                    pas sur un mot isolé. */}
                <h2 className="text-balance font-headline text-lg font-bold text-on-secondary-fixed sm:text-xl">
                  {etape.titre}
                </h2>
                <p className="text-sm text-on-secondary-fixed-variant">{etape.detail}</p>
                <ButtonLink href={etape.href} variant="primary" size="sm">
                  {etape.cta}
                </ButtonLink>
              </div>
              {/*
                Illustration décorative, réduite sur petit écran : à 150 px, elle
                occupait la moitié d'un téléphone et passait derrière le bouton
                d'action, dont elle brouillait le contour.
              */}
              <Icon
                name={etape.illustration}
                className="pointer-events-none absolute -bottom-4 -right-3 text-[96px] text-on-secondary-container/10 sm:-bottom-6 sm:-right-4 sm:text-[150px]"
              />
            </CardBody>
          </Card>
        )}

        {/* Parcours */}
        <Card>
          <CardBody className="p-4 sm:p-6">
            <div className="mb-5">
              <h3 className="font-headline text-lg font-bold text-primary">
                Mon parcours d&apos;accompagnement
              </h3>
              <p className="mt-0.5 text-sm text-on-surface-variant">
                Les quatre étapes qui mènent de l&apos;inscription à la candidature.
              </p>
            </div>
            <ParcoursTracker steps={parcours} />
          </CardBody>
        </Card>

        {/* Feed heading — `gap-2` et titre tronquable : sans eux, « Tout voir »
            se faisait pousser hors du cadre sur les écrans les plus étroits. */}
        <div className="flex items-center justify-between gap-2 px-1 pt-2">
          <h3 className="truncate font-headline text-lg font-bold text-primary">
            Offres pour vous
          </h3>
          <ButtonLink
            href="/espace-jeune/offres"
            variant="ghost"
            size="sm"
            className="shrink-0"
          >
            Tout voir
          </ButtonLink>
        </div>

        {/*
          `OffreCard`, et non une carte réécrite ici.

          Le tableau de bord dessinait sa PROPRE carte d'offre : autre icône,
          autres pastilles, deux boutons menant tous deux à la même page de
          détail. La même offre changeait donc d'apparence entre l'accueil et
          la liste des offres, et toute évolution de la carte partagée laissait
          celle-ci en arrière. Une seule définition, un seul objet.
        */}
        {offres.loading ? (
          <SkeletonList count={2} />
        ) : recommended.length === 0 ? (
          <Card>
            <CardBody className="p-4 sm:p-6">
              <EmptyState
                plain
                icon="work"
                title="Aucune offre publiée pour le moment"
                description="Les nouvelles opportunités validées par OMB apparaîtront ici. En attendant, une formation renforce votre profil."
                action={
                  <ButtonLink href="/espace-jeune/formations" variant="secondary" size="sm">
                    Voir les formations
                  </ButtonLink>
                }
              />
            </CardBody>
          </Card>
        ) : (
          recommended.map((o, rang) => (
            <div
              key={o.id}
              className="apparition"
              style={{ "--rang": rang } as React.CSSProperties}
            >
              <OffreCard offre={o} href={`/espace-jeune/offres/${o.id}`} />
            </div>
          ))
        )}
      </section>

      {/* Right rail — suggestions */}
      <aside className="order-2 md:order-3 lg:col-span-3">
        <div className="lg:sticky lg:top-20 space-y-4">
          {nextInterview && (
            <Card className="bg-primary text-white">
              <CardBody className="space-y-3 p-4 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
                  Prochain entretien
                </p>
                <div className="flex items-start gap-3">
                  {/* Même pastille que les deux autres espaces : c'est le même
                      objet — une date de rendez-vous — donc la même forme. */}
                  <DatePill date={nextInterview.date} ton="clair" />
                  {/* `min-w-0` + `truncate` : un nom d'entreprise ou un intitulé
                      de poste un peu long élargissait la carte au-delà de sa
                      colonne et emportait la page en défilement horizontal. */}
                  <div className="min-w-0">
                    <p className="font-bold">{nextInterview.heure}</p>
                    <p className="truncate text-sm text-white/80">
                      {nextInterview.entreprise.nom}
                    </p>
                    <p className="truncate text-xs text-white/60">{nextInterview.offreTitre}</p>
                  </div>
                </div>
                {nextInterview.lienReunion && (
                  <ButtonLink
                    href={nextInterview.lienReunion}
                    variant="secondary"
                    size="sm"
                    fullWidth
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="video_call" className="text-[16px]" /> Rejoindre
                  </ButtonLink>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="truncate font-bold text-primary">Notifications</h4>
                <ButtonLink
                  href="/espace-jeune/notifications"
                  variant="ghost"
                  size="sm"
                  className="px-0"
                >
                  Tout voir
                </ButtonLink>
              </div>
              <div className="space-y-1">
                {notifications.length === 0 ? (
                  <p className="py-2 text-sm text-on-surface-variant">Aucune notification.</p>
                ) : (
                  notifications.slice(0, 4).map((n) => (
                    <ButtonLink
                      key={n.id}
                      href={n.href ?? "/espace-jeune/notifications"}
                      variant="ghost"
                      /* `min-h-11` : ces lignes sont des liens, et au doigt une
                         cible de 36 px se manque une fois sur trois. `truncate`
                         retiré d'ici — posé sur le conteneur flex, il ne
                         raccourcissait rien et empêchait le titre de passer à
                         la ligne. */
                      className="flex min-h-11 w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-surface-container-low"
                    >
                      <span
                        className={`mt-0.5 ${n.accent ? "text-secondary" : "text-on-surface-variant"}`}
                      >
                        <Icon name={n.icon} className="text-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug text-on-surface">
                          {n.title}
                        </span>
                        <span className="block text-xs text-on-surface-variant">{n.time}</span>
                      </span>
                      {!n.read && (
                        <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" />
                      )}
                    </ButtonLink>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 sm:p-6">
              <h4 className="mb-3 font-bold text-primary">Formations suggérées</h4>
              {formations.loading ? (
                <SkeletonCard />
              ) : suggestionsFormations.length === 0 ? (
                /* Le catalogue vide laissait une carte à en-tête seul : un titre
                   suivi de rien, que l'on prend pour un chargement bloqué. */
                <p className="py-2 text-sm text-on-surface-variant">
                  Aucune formation disponible pour le moment.
                </p>
              ) : (
                <div className="space-y-1">
                  {suggestionsFormations.map((f) => (
                    <ButtonLink
                      key={f.id}
                      href={`/espace-jeune/formations/${f.id}`}
                      variant="ghost"
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-container-low"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                        <Icon name="school" className="text-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-on-surface">
                          {f.titre}
                        </span>
                        <span className="block text-xs text-on-surface-variant">
                          {f.tempsLectureMin} min · {f.certifiante ? "Certifiante" : "Découverte"}
                        </span>
                      </span>
                    </ButtonLink>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </aside>
    </div>
  );
}
