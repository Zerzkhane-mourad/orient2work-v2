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
import {
  NotificationItem,
  NotificationItemSkeleton,
} from "@/features/notifications/notification-item";
import { useNotifications } from "@/features/notifications/notifications-store";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { QUIZ_PASS_SCORE } from "@/lib/constants";
import { jourIso } from "@/lib/semaine";
import { cn, formatDate } from "@/lib/utils";

export default function EspaceJeuneDashboard() {
  const { jeune } = useProfile();
  const notifs = useNotifications();

  const offres = useApi(() => api.offres.list({ perPage: 5 }), []);
  // À partir d'aujourd'hui et par date croissante, comme « À venir » dans
  // Mes entretiens : sans ces bornes, le premier entretien accepté pouvait
  // être un rendez-vous déjà passé, affiché comme « prochain ».
  const entretiens = useApi(
    () =>
      api.entretiens.list({
        status: "accepte",
        from: jourIso(new Date()),
        ordre: "asc",
        perPage: 1,
      }),
    [],
  );
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
              l'autre colonne, y mène déjà — avec de vraies formations.
              `primary-container` : profond dans tous les thèmes. */}
          <Card className="relative hidden overflow-hidden border-0 bg-primary-container text-white lg:block">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-secondary-container/25 blur-2xl"
            />
            <CardBody className="relative space-y-3 p-5 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container shadow-level-1">
                <Icon name="workspace_premium" className="text-2xl" />
              </span>
              <p className="font-headline font-bold">Boostez vos chances de succès</p>
              <p className="text-xs text-white/75">
                Chaque certificat rend votre profil plus visible.
              </p>
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
          ligne à faire défiler. La page doit pourtant s'annoncer : sans `<h1>`,
          la navigation par titres d'un lecteur d'écran commencerait au milieu
          du contenu.
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
          // Or, la couleur de « à vous d'agir » dans tout l'espace — en dégradé
          // doux plutôt qu'en aplat saturé, avec un liseré qui la signe.
          <Card className="relative overflow-hidden border-secondary-container bg-gradient-to-br from-secondary-container/70 via-secondary-container/40 to-secondary-container/15 shadow-level-1">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-secondary-container" />
            <CardBody className="relative p-4 sm:p-6">
              {/*
                `max-w-lg` seulement quand la place existe : sur un téléphone,
                cette largeur maximale ne bornait rien et le titre courait
                jusqu'au bord. `pr-*` réserve la place de l'illustration.
              */}
              <div className="relative z-10 space-y-3 pr-12 sm:max-w-lg sm:pr-16">
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest/70 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-on-secondary-container">
                  <Icon name="priority_high" className="text-[14px]" /> Prochaine étape
                </span>
                {/* `text-balance` : sur deux ou trois lignes, le titre ne finit
                    pas sur un mot isolé. */}
                <h2 className="text-balance font-headline text-lg font-bold text-on-secondary-fixed sm:text-xl">
                  {etape.titre}
                </h2>
                <p className="text-sm text-on-secondary-fixed-variant">{etape.detail}</p>
                <ButtonLink href={etape.href} variant="primary" size="sm" className="group">
                  {etape.cta}
                  <Icon
                    name="arrow_forward"
                    className="text-[16px] transition-transform duration-200 group-hover:translate-x-1"
                  />
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
            <div className="mb-5 space-y-1">
              <TitreCarte icon="target">Mon parcours d&apos;accompagnement</TitreCarte>
              <p className="pl-[2.625rem] text-sm text-on-surface-variant">
                Les quatre étapes qui mènent de l&apos;inscription à la candidature.
              </p>
            </div>
            <ParcoursTracker steps={parcours} />
          </CardBody>
        </Card>

        {/* Feed heading — `gap-2` et titre tronquable : sans eux, « Tout voir »
            se faisait pousser hors du cadre sur les écrans les plus étroits. */}
        <div className="flex items-center justify-between gap-2 px-1 pt-2">
          <TitreCarte icon="business_center">
            <span className="truncate text-lg">Offres pour vous</span>
          </TitreCarte>
          <ButtonLink
            href="/espace-jeune/offres"
            variant="ghost"
            size="sm"
            className="group shrink-0"
          >
            Tout voir
            <Icon
              name="arrow_forward"
              className="text-[16px] transition-transform duration-200 group-hover:translate-x-1"
            />
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
            // `primary-container` et non `primary` : en thème sombre, `primary`
            // vire au bleu pâle, sous un texte blanc devenu illisible.
            <Card className="relative overflow-hidden border-0 bg-primary-container text-white shadow-level-2 ring-1 ring-secondary-container/40">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-secondary-container/25 blur-2xl"
              />
              <CardBody className="relative space-y-3 p-4 sm:p-6">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
                  <Icon name="event_available" className="text-[15px]" /> Prochain entretien
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

          {/* Même ligne que la cloche et la page : une notification se
              reconnaît d'un écran à l'autre. Les lignes vont d'un bord à
              l'autre de la carte, d'où l'en-tête seul dans `CardBody`. */}
          <Card className="overflow-hidden">
            <CardBody className="flex items-center justify-between gap-2 p-4 pb-2 sm:px-6 sm:pt-6">
              <TitreCarte as="h4" icon="notifications">
                <span className="truncate">Notifications</span>
                {notifs.unread > 0 && (
                  <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-on-error">
                    {notifs.unread}
                  </span>
                )}
              </TitreCarte>
              <ButtonLink
                href="/espace-jeune/notifications"
                variant="ghost"
                size="sm"
                className="px-2"
              >
                Tout voir
              </ButtonLink>
            </CardBody>
            {notifs.loading ? (
              <ul aria-label="Chargement des notifications" className="pb-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <NotificationItemSkeleton key={i} density="compact" />
                ))}
              </ul>
            ) : notifs.notifications.length === 0 ? (
              <p className="px-4 pb-5 text-sm text-on-surface-variant sm:px-6">
                Vous êtes à jour — aucune notification pour l&apos;instant.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant border-t border-outline-variant">
                {notifs.notifications.slice(0, 4).map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    density="compact"
                    onOpen={() => void notifs.markRead(n.id)}
                    className="sm:px-6"
                  />
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardBody className="p-4 sm:p-6">
              <div className="mb-3">
                <TitreCarte
                  as="h4"
                  icon="school"
                  tuile="bg-secondary-container text-on-secondary-container"
                >
                  Formations suggérées
                </TitreCarte>
              </div>
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
                      className="group flex min-h-11 w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-container-low"
                    >
                      {/* Or pour ce qui délivre un certificat, bleu pour la
                          découverte — la même règle que le catalogue. */}
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          f.certifiante
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon
                          name={f.certifiante ? "workspace_premium" : "auto_stories"}
                          className="text-[18px]"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-on-surface group-hover:text-primary">
                          {f.titre}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <Icon name="timer" className="text-[12px]" />
                          {f.tempsLectureMin} min · {f.certifiante ? "Certifiante" : "Découverte"}
                        </span>
                      </span>
                      <Icon
                        name="chevron_right"
                        className="shrink-0 text-[18px] text-on-surface-variant transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                      />
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

/** Titre de carte précédé de sa tuile d'icône — repère de lecture en défilant. */
function TitreCarte({
  icon,
  tuile = "bg-primary/10 text-primary",
  as: Balise = "h3",
  children,
}: {
  icon: IconName;
  tuile?: string;
  as?: "h3" | "h4";
  children: React.ReactNode;
}) {
  return (
    <Balise className="flex min-w-0 items-center gap-2.5 font-headline font-bold text-primary">
      <span
        className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tuile)}
      >
        <Icon name={icon} className="text-[18px]" />
      </span>
      {children}
    </Balise>
  );
}
