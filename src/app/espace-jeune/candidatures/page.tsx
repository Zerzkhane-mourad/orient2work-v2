"use client";

/**
 * Mes candidatures (espace jeune).
 *
 * L'écran répondait à « où en sont mes dossiers ». Il répond maintenant d'abord
 * à « qu'est-ce qui m'attend » : une invitation à un entretien reçoit une
 * bannière et un bouton, au lieu de se fondre dans la liste sous forme d'un
 * simple libellé de statut.
 *
 * La liste est paginée par l'API : les regroupements d'onglets sont donc des
 * FILTRES SERVEUR, jamais un `filter()` sur la page courante, et les compteurs
 * viennent d'un `groupBy` dédié.
 */
import { useId, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  Icon,
  type IconName,
  Pagination,
  ScrollRow,
  SkeletonList,
} from "@/components/ui";
import { LigneCandidature } from "@/features/candidatures/ligne-candidature";
import { api } from "@/lib/api";
import type { CandidatureStatus } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";

const PER_PAGE = 10;

const EN_COURS = ["envoyee", "vue", "preselectionnee", "entretien"] as const;

/** Constante de module : un tableau recréé à chaque rendu boucle la requête. */
const EN_ATTENTE = ["en_attente"] as const;

const TOUS_STATUTS = [
  "envoyee",
  "vue",
  "preselectionnee",
  "entretien",
  "acceptee",
  "refusee",
  "retiree",
] as const;

/**
 * Onglets et leur traduction en filtre serveur.
 *
 * Quatre issues, sans recouvrement : chaque candidature vit dans UN onglet.
 * « En cours » inclut l'entretien proposé — le dossier n'est pas tranché — et
 * une candidature retirée est archivée plutôt que rangée parmi les refus : le
 * candidat s'est désisté, personne ne l'a écarté.
 */
const tabs = [
  {
    key: "encours",
    label: "En cours",
    statuts: EN_COURS,
    vide: "Aucune candidature en attente de réponse.",
  },
  {
    key: "acceptee",
    label: "Acceptées",
    statuts: ["acceptee"],
    vide: "Aucune candidature acceptée pour l'instant.",
  },
  {
    key: "refusee",
    label: "Non retenues",
    statuts: ["refusee"],
    vide: "Aucune candidature écartée.",
  },
  {
    key: "archivee",
    label: "Archivées",
    statuts: ["retiree"],
    vide: "Les candidatures que vous retirez sont rangées ici.",
  },
] as const satisfies readonly {
  key: string;
  label: string;
  statuts: readonly CandidatureStatus[];
  vide: string;
}[];

export default function MesCandidaturesPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("encours");
  /** Sens du dernier changement d'onglet : +1 vers la droite, -1 vers la gauche. */
  const [sens, setSens] = useState<1 | -1>(1);

  const changerOnglet = (suivant: (typeof tabs)[number]["key"]) => {
    if (suivant === tab) return;
    const rang = (cle: string) => tabs.findIndex((t) => t.key === cle);
    setSens(rang(suivant) > rang(tab) ? 1 : -1);
    setTab(suivant);
  };

  const onglet = tabs.find((t) => t.key === tab) ?? tabs[0];
  const statuts = onglet.statuts;

  const filetId = `candidatures-filet-${useId()}`;
  const reduire = useReducedMotion();
  /** Ressort amorti : le filet arrive franchement, sans rebond qui distrait. */
  const glisse: Transition = reduire
    ? { duration: 0 }
    : { type: "spring", stiffness: 500, damping: 40 };

  // Changer d'onglet remet en page 1 : rester page 3 sur un onglet qui n'en a
  // qu'une afficherait un écran vide.
  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "jeune-candidatures",
  });
  const { page, goTo, listRef } = usePagination({ perPage, resetOn: [tab] });

  const { data, loading, error, refetch } = useApi(
    () => api.candidatures.mine({ status: statuts, page, perPage }),
    // `statuts` plutôt que `tab` : constante de module propre à chaque onglet,
    // donc stable d'un rendu à l'autre, et c'est elle que la requête envoie.
    [statuts, page, perPage],
  );

  // Les compteurs portent sur la TOTALITÉ, la liste sur une page : ils viennent
  // donc d'un `groupBy` côté serveur, et non d'un décompte de ce qui est affiché.
  const compteurs = useApi(() => api.candidatures.countMine(), []);
  // Une ligne suffit : seul le total (`meta.total`) est lu.
  const invitationsEnAttente = useApi(
    () => api.entretiens.list({ status: EN_ATTENTE, spontanee: false, perPage: 1 }),
    [],
  );

  const parStatut = compteurs.data ?? {};
  const somme = (...cles: readonly CandidatureStatus[]) =>
    cles.reduce((total, cle) => total + (parStatut[cle] ?? 0), 0);

  const visibles = data?.items ?? [];
  const enCours = somme(...EN_COURS);
  /*
   * Invitations qui attendent VRAIMENT une réponse — comptées sur les
   * entretiens, et non sur le statut `entretien` des candidatures : celui-ci ne
   * change pas quand le candidat accepte, et la bannière réclamait une réponse
   * déjà donnée. Même source que « Invitations à confirmer » dans Mes
   * entretiens : les deux écrans ne peuvent plus se contredire.
   */
  const invitations = invitationsEnAttente.data?.meta.total ?? 0;
  const acceptees = somme("acceptee");
  // Une candidature retirée n'a jamais été soumise au jugement : la compter
  // ferait baisser le taux de réponse sans qu'aucune entreprise soit en cause.
  const envoyees = somme(...TOUS_STATUTS.filter((s) => s !== "retiree"));
  const traitees = somme("vue", "preselectionnee", "entretien", "acceptee", "refusee");
  const tauxReponse = envoyees > 0 ? Math.round((traitees / envoyees) * 100) : 0;

  const rechargerTout = () => {
    refetch();
    compteurs.refetch();
    invitationsEnAttente.refetch();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/*
        Même bandeau que les autres écrans de l'espace jeune. Les quatre
        chiffres y montent : c'est le bilan de la recherche, à lire avant le
        détail des dossiers.
      */}
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
          name="send"
          className="pointer-events-none absolute -bottom-6 right-6 hidden text-[140px] text-white/[0.05] sm:block"
        />

        <div className="relative space-y-6">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
              <Icon name="send" className="text-[16px]" /> Candidatures
            </p>
            <h1 className="font-headline text-2xl font-bold leading-tight sm:text-3xl">
              Mes candidatures
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Suivez l&apos;avancement de chaque candidature, de l&apos;envoi à la réponse.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <Chiffre
              label="Envoyées"
              valeur={envoyees}
              icon="send"
              tuile="bg-primary-fixed text-primary"
              loading={compteurs.loading}
            />
            <Chiffre
              label="En cours"
              valeur={enCours}
              icon="hourglass_top"
              tuile="bg-white/15 text-white"
              loading={compteurs.loading}
            />
            <Chiffre
              label="Acceptées"
              valeur={acceptees}
              icon="check_circle"
              tuile="bg-success text-white"
              loading={compteurs.loading}
            />
            <Chiffre
              label="Taux de réponse"
              valeur={tauxReponse}
              suffixe="%"
              icon="trending_up"
              tuile="bg-secondary-container text-on-secondary-container"
              accent
              loading={compteurs.loading}
              aide={
                envoyees > 0
                  ? `${traitees} de vos ${envoyees} candidatures ont été traitées.`
                  : undefined
              }
            />
          </div>
        </div>
      </section>

      {/*
        Bannière d'appel : une invitation à un entretien n'attend pas d'être
        retrouvée au fil d'une liste paginée — elle peut se trouver page 3, et
        un créneau non confirmé peut être repris par un autre candidat. En or :
        la couleur, partout dans l'espace, de « une réponse est attendue de vous ».
      */}
      {!invitationsEnAttente.loading && invitations > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-secondary-container bg-secondary-container/30 px-4 py-3 shadow-level-1">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <Icon name="event_available" className="text-[20px]" />
            {/* Point pulsé : quelque chose attend, maintenant. */}
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-error ring-2 ring-surface-container-lowest" />
            </span>
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold text-on-surface">
            {invitations === 1
              ? "Une entreprise vous propose un entretien."
              : `${invitations} entreprises vous proposent un entretien.`}
            <span className="block text-xs font-normal text-on-surface-variant">
              Un créneau non confirmé peut être proposé à un autre candidat.
            </span>
          </p>
          <ButtonLink
            href="/espace-jeune/entretiens"
            variant="secondary"
            size="sm"
            className="group"
          >
            Répondre
            <Icon
              name="arrow_forward"
              className="text-[16px] transition-transform duration-200 group-hover:translate-x-1"
            />
          </ButtonLink>
        </div>
      )}

      {/* Onglets soulignés, compteur en pastille : on sait ce qu'on va trouver
          avant de cliquer. Un onglet vide ne porte pas de « 0 » — l'absence de
          pastille le dit déjà, sans ajouter de bruit. */}
      <div className="border-b border-outline-variant">
        <ScrollRow aria-label="Filtrer par statut" activeKey={tab}>
          {tabs.map((t) => {
            const compte = somme(...t.statuts);
            const actif = tab === t.key;
            const teinte = TEINTE_ONGLET[t.key];
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => changerOnglet(t.key)}
                aria-current={actif ? "true" : undefined}
                data-active={actif ? "true" : undefined}
                className={cn(
                  "group relative inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm font-bold uppercase tracking-wide transition-colors duration-200 sm:px-5",
                  actif ? teinte.texte : "text-on-surface-variant hover:text-primary",
                )}
              >
                {t.label}
                {!compteurs.loading && compte > 0 && (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-px text-xs tabular-nums transition-colors duration-200",
                      actif
                        ? teinte.pastille
                        : "bg-surface-container-high text-primary group-hover:bg-primary/15",
                    )}
                  >
                    {compte}
                  </span>
                )}
                {/*
                  UN filet partagé (`layoutId`) qui glisse d'un onglet à l'autre
                  et prend la teinte de sa destination : on voit où l'on est
                  allé, et quelle famille de dossiers on regarde.
                */}
                {actif && (
                  <motion.span
                    layoutId={filetId}
                    transition={glisse}
                    className={cn(
                      "absolute inset-x-2 bottom-0 h-[3px] rounded-full",
                      teinte.filet,
                    )}
                  />
                )}
              </button>
            );
          })}
        </ScrollRow>
      </div>

      {/*
        `overflow-x-clip` : le glissement latéral (±24 px) ne doit pas faire
        surgir de barre de défilement horizontale le temps de l'animation.
        `clip` et non `hidden` — il ne crée pas de conteneur de défilement, et
        l'axe vertical reste libre. La marge négative laisse passer l'ombre
        des cartes sur les côtés.
      */}
      <div className="-mx-3 overflow-x-clip px-3">
        {/*
          Le contenu part vers l'onglet quitté et arrive de l'onglet choisi.
          `mode="wait"` : l'ancienne liste sort avant que la nouvelle n'entre —
          deux listes superposées le temps d'une transition seraient illisibles.
        */}
        <AnimatePresence mode="wait" initial={false} custom={sens}>
          <motion.div
            key={tab}
            custom={sens}
            variants={GLISSEMENT}
            initial="entree"
            animate="present"
            exit="sortie"
            transition={reduire ? { duration: 0 } : { duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          >
            {loading ? (
              <SkeletonList count={3} />
            ) : error ? (
              <ErrorState error={error} onRetry={refetch} />
            ) : visibles.length === 0 ? (
              // « Jamais postulé » ne se dit qu'une fois les compteurs connus :
              // un onglet vide ne prouve pas que les autres le sont.
              !compteurs.loading && somme(...TOUS_STATUTS) === 0 ? (
                <EmptyState
                  icon="send"
                  title="Vous n'avez pas encore postulé"
                  description="Parcourez les offres et postulez à celles qui vous correspondent."
                  action={
                    <ButtonLink href="/espace-jeune/offres" variant="secondary">
                      Voir les offres
                    </ButtonLink>
                  }
                />
              ) : (
                <EmptyState
                  icon="inbox"
                  title={onglet.vide}
                  description="Changez d'onglet pour retrouver vos autres candidatures."
                />
              )
            ) : (
              /*
                Cascade orchestrée par le parent (`staggerChildren`) : chaque
                carte hérite de l'état du conteneur, sans délai calculé à la
                main. La clé suit la page : changer de page rejoue la cascade.
              */
              <motion.div
                key={page}
                ref={listRef}
                variants={reduire ? undefined : CASCADE}
                initial="cache"
                animate="visible"
                className="space-y-3"
              >
                {visibles.map((candidature) => (
                  <motion.div key={candidature.id} variants={reduire ? undefined : CARTE}>
                    <LigneCandidature
                      candidature={candidature}
                      // Un retrait change à la fois la ligne et les compteurs d'onglets.
                      onChanged={rechargerTout}
                    />
                  </motion.div>
                ))}

                {data?.meta && (
                  <motion.div variants={reduire ? undefined : CARTE}>
                    <Pagination
                      meta={data.meta}
                      onPageChange={goTo}
                      onPerPageChange={setPerPage}
                      busy={loading}
                      unit="candidature"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Mouvements ───────────────────────────────────────────────────────────── */

/** Changement d'onglet : déplacement court, on devine le sens sans traversée. */
const GLISSEMENT: Variants = {
  entree: (sens: 1 | -1) => ({ opacity: 0, x: 24 * sens }),
  present: { opacity: 1, x: 0 },
  sortie: (sens: 1 | -1) => ({ opacity: 0, x: -24 * sens }),
};

/** Conteneur de liste : il ne bouge pas lui-même, il ORCHESTRE ses cartes. */
const CASCADE: Variants = {
  cache: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

/** Une carte : monte de quelques pixels en apparaissant. */
const CARTE: Variants = {
  cache: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] } },
};

/**
 * Une teinte par onglet — la même que le liseré des cartes qu'il contient :
 * bleu nuit pour ce qui avance, vert pour ce qui a abouti, rouge pour ce qui a
 * été écarté, gris pour ce que l'on a soi-même retiré.
 */
const TEINTE_ONGLET: Record<
  (typeof tabs)[number]["key"],
  { texte: string; pastille: string; filet: string }
> = {
  encours: { texte: "text-primary", pastille: "bg-primary text-on-primary", filet: "bg-primary" },
  acceptee: { texte: "text-success", pastille: "bg-success text-white", filet: "bg-success" },
  refusee: { texte: "text-error", pastille: "bg-error text-on-error", filet: "bg-error" },
  archivee: {
    texte: "text-on-surface-variant",
    pastille: "bg-outline text-white",
    filet: "bg-outline",
  },
};

/** Chiffre du bandeau : tuile d'icône teintée, valeur, libellé. */
function Chiffre({
  label,
  valeur,
  suffixe,
  icon,
  tuile,
  loading,
  accent,
  aide,
}: {
  label: string;
  valeur: number;
  suffixe?: string;
  icon: IconName;
  /** Teinte de la tuile d'icône. */
  tuile: string;
  loading: boolean;
  accent?: boolean;
  /** Infobulle : d'où sort le chiffre, quand il est calculé. */
  aide?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl bg-white/[0.07] px-3 py-3 ring-1 ring-white/10 sm:px-4"
      title={aide}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          tuile,
        )}
      >
        <Icon name={icon} className="text-[20px]" />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-headline text-2xl font-bold leading-tight tabular-nums",
            accent && "text-secondary-fixed-dim",
          )}
        >
          {loading ? "—" : `${valeur}${suffixe ?? ""}`}
        </p>
        <p className="truncate text-xs text-white/75">{label}</p>
      </div>
    </div>
  );
}
