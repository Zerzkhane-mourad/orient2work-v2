"use client";

/**
 * Candidature spontanée (§10).
 *
 * Une candidature sans offre : le jeune choisit une entreprise ouverte, réserve
 * un créneau dans ses disponibilités, et une demande d'entretien part. Deux
 * niveaux sur la même page — la liste, puis le calendrier de l'entreprise
 * retenue — plutôt qu'une page de détail : le choix se fait par comparaison,
 * et revenir en arrière ne doit pas coûter un chargement.
 *
 * ── Ce que le parcours ne disait pas ────────────────────────────────────────
 *
 *  • La page LISAIT `?q=` sans jamais offrir de champ : seule la barre de
 *    recherche globale pouvait filtrer, et rien à l'écran ne le laissait
 *    deviner. Une liste de plusieurs dizaines d'entreprises se parcourait donc
 *    page à page.
 *  • Une demande déjà posée chez une entreprise ne se découvrait qu'APRÈS avoir
 *    ouvert son calendrier — un clic pour apprendre qu'il n'y a rien à y faire.
 *    Elle est désormais annoncée sur la fiche, en liste.
 *  • Les trois renvois vers un autre écran passaient par
 *    `window.location.assign`, qui recharge l'application entière au lieu de
 *    naviguer.
 */
import { Suspense, useEffect, useState } from "react";
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Icon,
  Pagination,
  SkeletonList,
} from "@/components/ui";
import { CreneauPicker } from "@/features/spontanee/creneau-picker";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import type { ApiDemandeSpontanee, ApiEntrepriseOuverte } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { useDebounced } from "@/lib/use-debounced";
import { useEcrireParams, useParam } from "@/lib/use-url-param";
import { usePagination } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";

const PER_PAGE = 12;

/** Constante de module : un tableau recréé à chaque rendu boucle la requête. */
const EN_ATTENTE = ["en_attente"] as const;

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
    // La liste porte maintenant l'état des demandes : après en avoir posé une,
    // la fiche quittée doit afficher son badge au retour.
    entreprises.refetch();
  };

  /*
   * Le backend refuse tout contact avant validation du test (§5.5). On
   * l'annonce ici plutôt que de laisser découvrir un 403 après avoir parcouru
   * les entreprises et choisi un créneau.
   */
  if (jeune.status !== "valide") {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Bandeau>
          <div className="flex flex-col gap-4 rounded-xl bg-white/10 p-4 ring-1 ring-white/15 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
              <Icon name="fact_check" className="text-[22px]" />
            </span>
            <p className="flex-1 text-sm leading-relaxed text-white/90">
              Contacter une entreprise directement demande un profil validé. Réussissez le test de
              validation, puis revenez choisir un créneau.
            </p>
            <ButtonLink href="/espace-jeune/test" variant="secondary" className="shrink-0">
              Passer le test
            </ButtonLink>
          </div>
        </Bandeau>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Où l'on en est dans un parcours qui tient en trois gestes. Sans lui,
          la fiche entreprise ressemble à une page de détail parmi d'autres,
          alors qu'elle est l'étape du milieu. Il vit DANS le bandeau : c'est
          l'en-tête du parcours, pas une ligne de plus à lire. */}
      <Bandeau>
        <Etapes courante={entrepriseId ? (envoyee ? 3 : 2) : 1} />
      </Bandeau>

      {entrepriseId ? (
        <DetailEntreprise
          entrepriseId={entrepriseId}
          onRetour={revenir}
          onEnvoyee={setEnvoyee}
          envoyee={envoyee}
        />
      ) : (
        <>
          <DemandesEnCours />

          <ChampRecherche valeurUrl={recherche} />

          {entreprises.loading ? (
            <SkeletonList count={3} />
          ) : entreprises.error ? (
            <ErrorState error={entreprises.error} onRetry={entreprises.refetch} />
          ) : (entreprises.data?.items.length ?? 0) === 0 ? (
            recherche ? (
              <EmptyState
                icon="search_off"
                title={`Aucune entreprise ouverte ne correspond à « ${recherche} »`}
                description="Essayez un autre nom ou un autre secteur, ou affichez toutes les entreprises ouvertes."
                action={
                  <Button variant="outline" onClick={() => ecrire({ q: undefined })}>
                    Effacer la recherche
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon="business"
                title="Aucune entreprise ouverte pour le moment"
                description="Les entreprises ouvrent leurs créneaux ponctuellement. Revenez d'ici quelques jours, ou postulez aux offres publiées."
                action={
                  <ButtonLink href="/espace-jeune/offres" variant="secondary">
                    Voir les offres
                  </ButtonLink>
                }
              />
            )
          ) : (
            <div ref={listRef} className="space-y-3">
              {/* Clé sur la requête : une nouvelle recherche rejoue
                  l'apparition en cascade. */}
              <div key={`${recherche}|${page}`} className="space-y-3">
                {entreprises.data!.items.map((entreprise, rang) => (
                  <div
                    key={entreprise.id}
                    className="apparition"
                    style={{ "--rang": rang } as React.CSSProperties}
                  >
                    <FicheEntreprise
                      entreprise={entreprise}
                      onOuvrir={() => ouvrir(entreprise.id)}
                    />
                  </div>
                ))}
              </div>

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
        </>
      )}
    </div>
  );
}

/* ── En-tête ──────────────────────────────────────────────────────────────── */

/**
 * Bandeau bleu nuit et or — le même que la page des offres, dont cet écran est
 * le prolongement (« Aucune offre ne correspond ? »).
 *
 * `primary-container` et non `primary` : il reste profond dans tous les
 * thèmes, y compris sombre, où `primary` devient un bleu pâle.
 */
function Bandeau({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary-container px-5 py-6 text-white shadow-level-1 sm:px-8 sm:py-8">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-secondary-container/20 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-white/10 blur-3xl"
      />
      <Icon
        name="handshake"
        className="pointer-events-none absolute -bottom-6 right-6 hidden text-[140px] text-white/[0.05] sm:block"
      />

      <div className="relative space-y-6">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
            <Icon name="handshake" className="text-[16px]" /> Candidature spontanée
          </p>
          <h1 className="text-balance font-headline text-2xl font-bold leading-tight sm:text-3xl">
            Rencontrez une entreprise, sans attendre une offre
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            Choisissez une entreprise ouverte aux échanges et réservez un créneau dans son agenda.
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ── Repères de parcours ──────────────────────────────────────────────────── */

const ETAPES: { libelle: string; icon: "business" | "event" | "send" }[] = [
  { libelle: "Choisir une entreprise", icon: "business" },
  { libelle: "Réserver un créneau", icon: "event" },
  { libelle: "Demande envoyée", icon: "send" },
];

/**
 * Fil des trois gestes, sur fond sombre.
 *
 * Pastilles reliées par un trait qui se dore à mesure qu'on avance : on lit
 * d'un coup d'œil le chemin fait et celui qui reste. Sur téléphone, seules
 * l'étape en cours garde son libellé — trois libellés côte à côte n'y
 * tiendraient pas sans se couper.
 */
function Etapes({ courante }: { courante: number }) {
  return (
    <ol className="flex items-center" aria-label="Étapes de la candidature spontanée">
      {ETAPES.map((etape, index) => {
        const rang = index + 1;
        const faite = rang < courante;
        const active = rang === courante;
        return (
          <li
            key={etape.libelle}
            aria-current={active ? "step" : undefined}
            className={cn("flex items-center", index < ETAPES.length - 1 && "flex-1")}
          >
            <span className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300",
                  faite && "bg-secondary-container text-on-secondary-container",
                  active && "bg-white text-primary ring-4 ring-white/20",
                  !faite && !active && "bg-white/10 text-white/60 ring-1 ring-white/20",
                )}
              >
                <Icon name={faite ? "check" : etape.icon} className="text-[18px]" />
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  active ? "text-white" : "hidden text-white/70 sm:inline",
                )}
              >
                {etape.libelle}
                {faite && <span className="sr-only"> — étape franchie</span>}
              </span>
            </span>
            {index < ETAPES.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "mx-3 h-0.5 min-w-4 flex-1 rounded-full transition-colors duration-300",
                  faite ? "bg-secondary-container" : "bg-white/20",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Rappel des demandes déjà en attente, tous interlocuteurs confondus.
 *
 * Le suivi vit dans « Mes entretiens » ; sans ce rappel, on repart d'ici
 * chercher une seconde entreprise sans savoir que trois demandes dorment déjà.
 */
function DemandesEnCours() {
  const { data } = useApi(
    () => api.entretiens.list({ status: EN_ATTENTE, spontanee: true, perPage: 1 }),
    [],
  );
  const total = data?.meta?.total ?? 0;
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-secondary-container/60 bg-secondary-container/25 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
        <Icon name="send" className="text-[18px]" />
      </span>
      <p className="flex-1 text-sm text-on-surface">
        <span className="font-semibold">
          {total} demande{total > 1 ? "s" : ""} en attente
        </span>{" "}
        <span className="text-on-surface-variant">
          — les entreprises concernées doivent encore répondre.
        </span>
      </p>
      <ButtonLink href="/espace-jeune/entretiens" variant="outline" size="sm">
        Suivre mes demandes
      </ButtonLink>
    </div>
  );
}

/* ── Recherche ────────────────────────────────────────────────────────────── */

/**
 * Champ de filtre, synchronisé avec `?q=`.
 *
 * Le champ garde son propre état — il doit suivre la frappe sans attendre le
 * routeur — et publie dans l'URL une fois la saisie stabilisée. L'URL reste
 * ainsi seule à décider de ce qui est interrogé, ce qui laisse la recherche
 * globale et le retour arrière piloter le même écran.
 */
function ChampRecherche({ valeurUrl }: { valeurUrl: string }) {
  const ecrire = useEcrireParams();
  const [terme, setTerme] = useState(valeurUrl);

  // L'URL a bougé sans passer par ce champ — barre du haut, retour arrière.
  useEffect(() => {
    setTerme((actuel) => (actuel.trim() === valeurUrl ? actuel : valeurUrl));
  }, [valeurUrl]);

  const stabilise = useDebounced(terme.trim());
  useEffect(() => {
    // `replace` (défaut) : empiler une entrée par frappe ferait rejouer la
    // recherche lettre par lettre au retour arrière.
    if (stabilise !== valeurUrl) ecrire({ q: stabilise });
  }, [stabilise, valeurUrl, ecrire]);

  return (
    // Même champ que la recherche d'offres : en relief, anneau or au focus.
    <div className="group relative">
      <span className="pointer-events-none absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-focus-within:bg-primary group-focus-within:text-on-primary">
        <Icon name="search" className="text-[20px]" />
      </span>
      <input
        type="search"
        value={terme}
        onChange={(e) => setTerme(e.target.value)}
        placeholder="Filtrer par nom d'entreprise ou secteur…"
        aria-label="Filtrer les entreprises ouvertes"
        className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-3.5 pl-14 pr-4 text-body-md shadow-level-1 transition-shadow placeholder:text-on-surface-variant/80 focus:border-secondary-container focus:shadow-level-2 focus:outline-none focus:ring-4 focus:ring-secondary-container/40"
      />
    </div>
  );
}

/* ── Fiche en liste ───────────────────────────────────────────────────────── */

/** Habillage d'une demande déjà posée : même vocabulaire en liste et en fiche. */
function statutDemande(demande: ApiDemandeSpontanee): {
  icone: "schedule" | "event_available";
  libelle: string;
} {
  return demande.status === "accepte"
    ? { icone: "event_available", libelle: "Entretien confirmé" }
    : { icone: "schedule", libelle: "Demande en attente" };
}

/**
 * Entreprise en liste.
 *
 * Le bouton s'étend à toute la carte (`after:absolute inset-0`) : la zone
 * cliquable couvre la fiche entière, sans imbriquer de bouton dans un bouton ni
 * multiplier les arrêts au clavier.
 */
function FicheEntreprise({
  entreprise,
  onOuvrir,
}: {
  entreprise: ApiEntrepriseOuverte;
  onOuvrir: () => void;
}) {
  const demande = entreprise.demandeEnCours ?? null;
  const statut = demande ? statutDemande(demande) : null;

  const confirme = demande?.status === "accepte";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-level-2 focus-within:ring-2 focus-within:ring-secondary",
      )}
    >
      {/* Liseré d'état : or pour une entreprise où l'on peut réserver, vert
          pour un entretien confirmé, neutre pour une demande qui attend. La
          liste se lit ainsi avant même les libellés. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1 transition-[width] duration-200 group-hover:w-1.5",
          !demande ? "bg-secondary-container" : confirme ? "bg-success" : "bg-outline",
        )}
      />

      <CardBody className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <Avatar
            src={entreprise.logo}
            alt={entreprise.nom}
            size={56}
            className="shrink-0 rounded-xl border border-outline-variant"
          />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="font-headline text-base font-bold text-primary sm:text-lg">
                {entreprise.nom}
              </h2>
              {statut && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    confirme
                      ? "bg-success-container text-on-success-container"
                      : "bg-surface-container-high text-on-surface-variant",
                  )}
                >
                  <Icon name={statut.icone} className="text-[13px]" />
                  {statut.libelle}
                </span>
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1">
                <Icon name="category" className="text-[15px] text-primary/70" />
                {entreprise.secteur}
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="location_on" className="text-[15px] text-primary/70" />
                {entreprise.ville}
              </span>
            </p>

            {demande ? (
              /* Le créneau retenu remplace les disponibilités : une fois la
                 demande posée, le reste du calendrier n'a plus d'intérêt. */
              <p className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface first-letter:uppercase">
                <Icon name="event" className="text-[14px] text-primary/70" />
                {jourCourt(demande.date)} à {demande.heure}
              </p>
            ) : (
              /* Prochaine ouverture : situe l'entreprise sans avoir à ouvrir son
                 calendrier. En vert : c'est la bonne nouvelle de la fiche. */
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {entreprise.prochaineDate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-container px-2.5 py-0.5 text-xs font-semibold text-on-success-container first-letter:uppercase">
                    <Icon name="event_available" className="text-[14px]" />
                    Dès {jourCourt(entreprise.prochaineDate)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <Icon name="calendar_month" className="text-[14px]" />
                  {entreprise.journeesOuvertes} journée
                  {entreprise.journeesOuvertes > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <Icon name="timer" className="text-[14px]" />
                  {entreprise.creneauDureeMin} min
                </span>
              </div>
            )}
          </div>
        </div>

        <Button
          variant={demande ? "outline" : "secondary"}
          onClick={onOuvrir}
          className="shrink-0 after:absolute after:inset-0 after:content-[''] sm:self-center"
        >
          {demande ? "Voir ma demande" : "Voir les créneaux"}
          <Icon
            name="arrow_forward"
            className="text-[18px] transition-transform duration-200 group-hover:translate-x-1"
          />
        </Button>
      </CardBody>
    </Card>
  );
}

/* ── Fiche ouverte ────────────────────────────────────────────────────────── */

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
        <CardBody className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              src={entreprise.logo}
              alt={entreprise.nom}
              size={64}
              className="shrink-0 rounded-xl border border-outline-variant"
            />
            <div className="min-w-0">
              <h2 className="font-headline text-xl font-bold text-primary sm:text-2xl">
                {entreprise.nom}
              </h2>
              <p className="flex flex-wrap items-center gap-x-3 text-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1">
                  <Icon name="category" className="text-[15px] text-primary/70" />
                  {entreprise.secteur}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="location_on" className="text-[15px] text-primary/70" />
                  {entreprise.ville}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="timer" className="text-[15px] text-primary/70" />
                  Échanges de {entreprise.creneauDureeMin} min
                </span>
              </p>
            </div>
          </div>

          {/* Le mot de l'entreprise, présenté comme tel : une citation signée,
              pas un paragraphe gris qu'on prend pour une aide de l'écran. */}
          {entreprise.spontaneeMessage && (
            <figure className="rounded-r-lg border-l-4 border-secondary-container bg-secondary-container/20 px-4 py-3">
              <blockquote className="flex gap-2 text-sm leading-relaxed text-on-surface">
                <Icon name="format_quote" className="mt-0.5 shrink-0 text-[18px] text-secondary" />
                <p>{entreprise.spontaneeMessage}</p>
              </blockquote>
              <figcaption className="mt-1.5 pl-6 text-xs font-semibold text-on-surface-variant">
                — {entreprise.nom}
              </figcaption>
            </figure>
          )}

          {envoyee ? (
            <div className="space-y-4 rounded-xl border border-success/30 bg-success-container/40 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success text-white shadow-level-1">
                  <Icon name="check" className="text-[24px]" />
                </span>
                <div>
                  <p className="font-headline text-lg font-bold text-on-success-container">
                    Votre demande a été envoyée
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    L&apos;entreprise vous répondra depuis vos entretiens.
                  </p>
                </div>
              </div>
              {/* Ce qui a été retenu, rappelé noir sur blanc : la confirmation
                  arrive après trois écrans, on ne se souvient plus de l'heure. */}
              <p className="flex items-center gap-2 rounded-lg bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface shadow-level-1 first-letter:uppercase">
                <Icon name="event_available" className="text-[18px] text-success" />
                {jourCourt(envoyee.date)} à {envoyee.heure} · {entreprise.creneauDureeMin} min
              </p>
              <p className="text-xs text-on-surface-variant">
                Le créneau reste bloqué en attendant sa réponse.
              </p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/espace-jeune/entretiens" variant="secondary">
                  <Icon name="event" className="text-[18px]" /> Suivre ma demande
                </ButtonLink>
                <Button variant="outline" onClick={onRetour}>
                  Voir d&apos;autres entreprises
                </Button>
              </div>
            </div>
          ) : calendrier.loading ? (
            <p className="text-sm text-on-surface-variant">Chargement des créneaux…</p>
          ) : calendrier.data?.demandeEnCours ? (
            /* Une seule réservation active par entreprise — en attente ou déjà
               acceptée : le serveur refuse la seconde, autant l'expliquer
               plutôt que de proposer des créneaux. */
            <div className="space-y-3">
              <p
                className={cn(
                  "flex items-start gap-2 rounded-lg border-l-4 px-4 py-3 text-sm",
                  calendrier.data.demandeEnCours.status === "accepte"
                    ? "border-success bg-success-container/50 text-on-success-container"
                    : "border-secondary-container bg-secondary-container/25 text-on-surface",
                )}
              >
                <Icon
                  name={statutDemande(calendrier.data.demandeEnCours).icone}
                  className="mt-0.5 shrink-0 text-[18px]"
                />
                {calendrier.data.demandeEnCours.status === "accepte"
                  ? "Votre entretien avec cette entreprise est confirmé, le "
                  : "Vous avez déjà une demande en attente auprès de cette entreprise, le "}
                {jourCourt(calendrier.data.demandeEnCours.date)} à{" "}
                {calendrier.data.demandeEnCours.heure}.
              </p>
              <ButtonLink href="/espace-jeune/entretiens" variant="outline">
                <Icon name="event" className="text-[18px]" /> Voir mes entretiens
              </ButtonLink>
            </div>
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
