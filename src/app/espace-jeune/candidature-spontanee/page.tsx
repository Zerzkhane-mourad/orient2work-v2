"use client";

/**
 * Candidature spontanée (§10).
 *
 * Une candidature sans offre : le jeune choisit une entreprise ouverte, réserve
 * un créneau dans ses disponibilités, et une demande d'entretien part. Deux
 * niveaux sur la même page — la liste, puis le calendrier de l'entreprise
 * retenue — plutôt qu'une page de détail : le choix se fait par comparaison,
 * et revenir en arrière ne doit pas coûter un chargement.
 */
import { Suspense, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  SkeletonList,
  SuccessBanner,
} from "@/components/ui";
import { CreneauPicker } from "@/features/spontanee/creneau-picker";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import { useApi, useMutation } from "@/lib/api/use-api";
import { useEcrireParams, useParam } from "@/lib/use-url-param";
import { usePagination } from "@/lib/use-pagination";

const PER_PAGE = 12;

/** « 2026-03-12 » → « jeu. 12 mars ». Midi : minuit glisserait d'un fuseau. */
const jourCourt = (iso: string): string =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${iso}T12:00:00`),
  );

/**
 * L'entreprise consultée et le filtre de recherche vivent dans l'URL : c'est ce
 * qui permet à la recherche globale d'ouvrir directement le calendrier d'une
 * entreprise — et au retour arrière du navigateur de revenir à la liste, au
 * lieu de quitter la page comme le faisait un état local.
 *
 * D'où la frontière de suspense : lire l'URL bascule sinon la page en rendu
 * dynamique.
 */
export default function CandidatureSpontaneePage() {
  return (
    <Suspense fallback={<SkeletonList count={3} />}>
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const { jeune } = useProfile();
  const [envoyee, setEnvoyee] = useState<{ date: string; heure: string } | null>(null);

  const ecrire = useEcrireParams();
  const entrepriseId = useParam("entreprise");
  const recherche = useParam("q");

  const { page, goTo, listRef } = usePagination({ perPage: PER_PAGE, resetOn: [recherche] });
  const entreprises = useApi(
    () => api.spontanee.entreprises(page, PER_PAGE, recherche || undefined),
    [page, recherche],
  );

  // `push` : ouvrir puis fermer une fiche doit s'annuler au retour arrière.
  const ouvrir = (id: string) => ecrire({ entreprise: id }, { push: true });
  const revenir = () => {
    ecrire({ entreprise: undefined }, { push: true });
    setEnvoyee(null);
  };

  /*
   * Le backend refuse tout contact avant validation du test (§5.5). On
   * l'annonce ici plutôt que de laisser découvrir un 403 après avoir parcouru
   * les entreprises et choisi un créneau.
   */
  if (jeune.status !== "valide") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader title="Candidature spontanée" />
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <Icon name="fact_check" />
            </span>
            <p className="max-w-md text-sm text-on-surface-variant">
              Contacter une entreprise directement demande un profil validé. Réussissez le test
              de validation, puis revenez choisir un créneau.
            </p>
            <Button variant="secondary" onClick={() => window.location.assign("/espace-jeune/test")}>
              Passer le test
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Candidature spontanée"
        subtitle="Réservez un échange avec une entreprise, sans passer par une offre."
      />

      {entrepriseId ? (
        <DetailEntreprise
          entrepriseId={entrepriseId}
          onRetour={revenir}
          onEnvoyee={setEnvoyee}
          envoyee={envoyee}
        />
      ) : entreprises.loading ? (
        <SkeletonList count={3} />
      ) : entreprises.error ? (
        <ErrorState error={entreprises.error} onRetry={entreprises.refetch} />
      ) : (entreprises.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          icon="business"
          title="Aucune entreprise ouverte pour le moment"
          description="Les entreprises ouvrent leurs créneaux ponctuellement. Revenez d'ici quelques jours, ou postulez aux offres publiées."
        />
      ) : (
        <div ref={listRef} className="space-y-3">
          {entreprises.data!.items.map((entreprise) => (
            <Card key={entreprise.id} className="transition-shadow hover:shadow-level-1">
              <CardBody className="flex flex-wrap items-center gap-4">
                <Avatar
                  src={entreprise.logo}
                  alt={entreprise.nom}
                  size={48}
                  className="rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-primary">{entreprise.nom}</p>
                  <p className="truncate text-sm text-on-surface-variant">
                    {entreprise.secteur} · {entreprise.ville}
                  </p>
                  {/* Prochaine ouverture : situe l'entreprise sans avoir à
                      ouvrir son calendrier. */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {entreprise.prochaineDate && (
                      <span className="rounded bg-secondary-container px-1.5 py-0.5 text-[11px] font-semibold text-on-secondary-container">
                        Dès {jourCourt(entreprise.prochaineDate)}
                      </span>
                    )}
                    <span className="rounded bg-surface-container px-1.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                      {entreprise.journeesOuvertes} journée
                      {entreprise.journeesOuvertes > 1 ? "s" : ""}
                    </span>
                    <span className="px-1 text-[11px] text-on-surface-variant">
                      · {entreprise.creneauDureeMin} min
                    </span>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => ouvrir(entreprise.id)}>
                  Voir les créneaux
                </Button>
              </CardBody>
            </Card>
          ))}

          {entreprises.data?.meta && (
            <Pagination
              meta={entreprises.data.meta}
              onPageChange={goTo}
              busy={entreprises.loading}
              unit="entreprise"
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Calendrier d'une entreprise et confirmation de la demande. */
function DetailEntreprise({
  entrepriseId,
  onRetour,
  onEnvoyee,
  envoyee,
}: {
  entrepriseId: string;
  onRetour: () => void;
  onEnvoyee: (choix: { date: string; heure: string }) => void;
  envoyee: { date: string; heure: string } | null;
}) {
  /*
   * Une seule requête pour tout : le calendrier renvoie AUSSI l'entreprise.
   * Recevoir la fiche en propriété obligerait à l'avoir déjà chargée — donc à
   * venir de la liste, et jamais d'un lien direct.
   *
   * Rechargée à l'ouverture, car les créneaux sont calculés, pas figés : un
   * autre candidat a pu réserver entre-temps.
   */
  const calendrier = useApi(() => api.spontanee.creneaux(entrepriseId), [entrepriseId]);
  const entreprise = calendrier.data?.entreprise;
  const reserver = useMutation(api.spontanee.reserver);

  const envoyer = async (choix: { date: string; heure: string; message?: string }) => {
    const resultat = await reserver.run(entrepriseId, choix);
    if (!resultat) return;
    onEnvoyee({ date: resultat.date, heure: resultat.heure });
    // Le créneau retenu doit disparaître si l'on revient sur le calendrier.
    calendrier.refetch();
  };

  const retour = (
    <Button variant="ghost" onClick={onRetour}>
      <Icon name="arrow_back" className="text-[18px]" /> Toutes les entreprises
    </Button>
  );

  // Un identifiant venu d'un lien peut ne désigner aucune entreprise ouverte :
  // l'erreur du serveur est alors la bonne réponse, avec de quoi revenir.
  if (calendrier.error) {
    return (
      <div className="space-y-4">
        {retour}
        <ErrorState error={calendrier.error} onRetry={calendrier.refetch} />
      </div>
    );
  }

  if (!entreprise) {
    return (
      <div className="space-y-4">
        {retour}
        <SkeletonList count={1} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {retour}

      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar src={entreprise.logo} alt={entreprise.nom} size={56} className="rounded-lg" />
            <div className="min-w-0">
              <h2 className="font-headline text-xl font-bold text-primary">{entreprise.nom}</h2>
              <p className="text-sm text-on-surface-variant">
                {entreprise.secteur} · {entreprise.ville}
              </p>
            </div>
          </div>

          {entreprise.spontaneeMessage && (
            <p className="rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface">
              {entreprise.spontaneeMessage}
            </p>
          )}

          {envoyee ? (
            <div className="space-y-3">
              <SuccessBanner message="Votre demande a été envoyée." />
              <p className="text-sm text-on-surface-variant">
                L&apos;entreprise vous répondra depuis vos entretiens. Le créneau reste bloqué en
                attendant sa réponse.
              </p>
              <Button variant="outline" onClick={onRetour}>
                Voir d&apos;autres entreprises
              </Button>
            </div>
          ) : calendrier.loading ? (
            <p className="text-sm text-on-surface-variant">Chargement des créneaux…</p>
          ) : calendrier.error ? (
            <ErrorState error={calendrier.error} onRetry={calendrier.refetch} />
          ) : calendrier.data?.demandeEnCours ? (
            /* Une seule demande en attente par entreprise : le serveur refuse la
               seconde, autant l'expliquer plutôt que de laisser réserver. */
            <p className="flex items-start gap-2 rounded-lg bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
              <Icon name="schedule" className="mt-0.5 shrink-0 text-[18px]" />
              Vous avez déjà une demande en attente auprès de cette entreprise, le{" "}
              {calendrier.data.demandeEnCours.date} à {calendrier.data.demandeEnCours.heure}.
            </p>
          ) : (
            calendrier.data && (
              <CreneauPicker
                calendrier={calendrier.data}
                pending={reserver.pending}
                error={reserver.error}
                onReserver={(choix) => void envoyer(choix)}
              />
            )
          )}
        </CardBody>
      </Card>
    </div>
  );
}
