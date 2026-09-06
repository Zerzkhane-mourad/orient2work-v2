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

  // Dérivé par `buildParcours` : l'ordre des étapes, les verrous et l'étape
  // courante sont une règle métier, pas une mise en forme.
  const parcours = buildParcours(jeune);

  return (
    /*
     * Ordre à trois colonnes sur grand écran, ordre de PRIORITÉ en dessous.
     *
     * Empilées telles quelles, les colonnes latérales passaient avant le fil
     * central : sur mobile, on ouvrait son tableau de bord sur une carte de
     * profil et une réclame pour les formations, et la bannière de vérification
     * d'email comme la prochaine étape n'arrivaient qu'après deux écrans de
     * défilement. `order-*` remet le fil en tête, sans toucher au rendu large.
     */
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <aside className="order-3 lg:order-1 lg:col-span-3">
        <div className="lg:sticky lg:top-20 space-y-4">
          <ProfileSummaryCard />
          {/* Réclame masquée sur petit écran : « Formations suggérées », dans
              l'autre colonne, y mène déjà — avec de vraies formations. */}
          <Card className="hidden bg-primary text-white lg:block">
            <CardBody className="space-y-2 text-center">
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
      <section className="order-1 space-y-4 lg:order-2 lg:col-span-6">
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

        {/* Next-step hero */}
        {nextInterview ? (
          <Card className="overflow-hidden bg-secondary-container">
            <CardBody className="relative">
              <div className="relative z-10 max-w-lg space-y-3">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-secondary-container">
                  <Icon name="priority_high" className="text-[16px]" /> Prochaine étape
                </span>
                <h2 className="font-headline text-xl font-bold text-on-secondary-fixed">
                  Préparez votre entretien avec {nextInterview.entreprise.nom}
                </h2>
                <p className="text-sm text-on-secondary-fixed-variant">
                  {nextInterview.offreTitre} · {formatDate(nextInterview.date)} à{" "}
                  {nextInterview.heure}.
                </p>
                <ButtonLink href="/espace-jeune/entretiens" variant="primary" size="sm">
                  Guide de préparation
                </ButtonLink>
              </div>
              <Icon
                name="handshake"
                className="pointer-events-none absolute -bottom-6 -right-4 text-[150px] text-on-secondary-container/10"
              />
            </CardBody>
          </Card>
        ) : (
          <Card className="overflow-hidden bg-secondary-container">
            <CardBody className="relative">
              <div className="relative z-10 max-w-lg space-y-3">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-secondary-container">
                  <Icon name="priority_high" className="text-[16px]" /> Prochaine étape
                </span>
                <h2 className="font-headline text-xl font-bold text-on-secondary-fixed">
                  {jeune.status !== "valide"
                    ? "Validez votre profil avec le test"
                    : jeune.candidatures === 0
                      ? "Postulez à votre première offre"
                      : "Continuez à développer votre employabilité"}
                </h2>
                <p className="text-sm text-on-secondary-fixed-variant">
                  {jeune.status !== "valide"
                    ? `Un score d'au moins ${QUIZ_PASS_SCORE}% débloque les candidatures.`
                    : "Chaque formation validée augmente votre visibilité auprès des recruteurs."}
                </p>
                <ButtonLink
                  href={jeune.status !== "valide" ? "/espace-jeune/test" : "/espace-jeune/offres"}
                  variant="primary"
                  size="sm"
                >
                  {jeune.status !== "valide" ? "Passer le test" : "Voir les offres"}
                </ButtonLink>
              </div>
              <Icon
                name="rocket_launch"
                className="pointer-events-none absolute -bottom-6 -right-4 text-[150px] text-on-secondary-container/10"
              />
            </CardBody>
          </Card>
        )}

        {/* Parcours */}
        <Card>
          <CardBody>
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

        {/* Feed heading */}
        <div className="flex items-center justify-between px-1">
          <h3 className="font-headline text-lg font-bold text-primary">Offres pour vous</h3>
          <ButtonLink href="/espace-jeune/offres" variant="ghost" size="sm">
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
            <CardBody>
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
      <aside className="order-2 lg:order-3 lg:col-span-3">
        <div className="lg:sticky lg:top-20 space-y-4">
          {nextInterview && (
            <Card className="bg-primary text-white">
              <CardBody className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
                  Prochain entretien
                </p>
                <div className="flex items-start gap-3">
                  {/* Même pastille que les deux autres espaces : c'est le même
                      objet — une date de rendez-vous — donc la même forme. */}
                  <DatePill date={nextInterview.date} ton="clair" />
                  <div>
                    <p className="font-bold">{nextInterview.heure}</p>
                    <p className="text-sm text-white/80">{nextInterview.entreprise.nom}</p>
                    <p className="text-xs text-white/60">{nextInterview.offreTitre}</p>
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
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-bold text-primary">Notifications</h4>
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
                      className="flex w-full items-start gap-3 truncate rounded-lg p-2 text-left hover:bg-surface-container-low"
                    >
                      <span
                        className={`mt-0.5 ${n.accent ? "text-secondary" : "text-on-surface-variant"}`}
                      >
                        <Icon name={n.icon} className="text-[18px]" />
                      </span>
                      <span className="min-w-0">
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
            <CardBody>
              <h4 className="mb-3 font-bold text-primary">Formations suggérées</h4>
              {formations.loading ? (
                <SkeletonCard />
              ) : (
                <div className="space-y-3">
                  {(formations.data?.items ?? []).slice(0, 3).map((f) => (
                    <ButtonLink
                      key={f.id}
                      href={`/espace-jeune/formations/${f.id}`}
                      variant="ghost"
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-container-low"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
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
