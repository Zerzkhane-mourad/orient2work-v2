"use client";

/**
 * Mes entretiens (espace jeune).
 *
 * L'écran est ordonné par CE QUE LE CANDIDAT DOIT FAIRE, pas par statut de base
 * de données :
 *  1. les invitations à confirmer — la seule chose qui attend un geste ;
 *  2. le prochain rendez-vous, puis les suivants ;
 *  3. les demandes spontanées envoyées, qui attendent l'entreprise ;
 *  4. l'historique, replié.
 *
 * Trois corrections de fond par rapport à la version précédente :
 *
 *  • « À venir » ne filtrait pas sur la date : un entretien du mois dernier
 *    restait en tête de liste et devenait le « prochain entretien ».
 *  • « En attente de votre réponse » regroupait les invitations reçues ET les
 *    candidatures spontanées envoyées par le candidat — lesquelles attendent
 *    l'entreprise, pas lui. Le titre lui demandait d'agir sur des demandes
 *    dépourvues de tout bouton.
 *  • Refus et annulations n'apparaissaient nulle part.
 *
 * Les totaux viennent des `meta` de chaque section, exacts par construction :
 * l'appel séparé aux compteurs par statut ne savait pas distinguer une
 * invitation d'une demande spontanée, ni le passé du futur.
 */
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DUREE_PANNEAU,
  useTransitionUI,
} from "@/components/motion/transitions";
import {
  EmptyState,
  ErrorState,
  Icon,
  type IconName,
  Pagination,
  PerPageSelect,
  SkeletonList,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { EntretienCard } from "@/features/entretiens/entretien-card";
import { HistoriqueEntretiens } from "@/features/entretiens/historique-entretiens";
import {
  Bascule,
  CompteurSection,
  PreparerEntretien,
  ProchainEntretien,
} from "@/features/entretiens/prochain-entretien";
import {
  ENTRETIENS_PER_PAGE_OPTIONS,
  useEntretiensPageSize,
  useEntretiensSection,
  type EntretiensSection,
} from "@/features/entretiens/use-entretiens-sections";

/** Constantes de module : un tableau recréé à chaque rendu boucle la requête. */
const CONFIRMES = ["accepte"] as const;
const EN_ATTENTE = ["en_attente"] as const;

/** `YYYY-MM-DD` en heure locale — `toISOString` basculerait en UTC. */
function jourIso(decalage = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + decalage);
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

export default function MesEntretiensPage() {
  // Le périmètre est déduit du rôle côté serveur : aucun `jeuneId` à transmettre.
  const taille = useEntretiensPageSize("jeune-entretiens");

  /*
   * Bornes figées au montage : recalculées à chaque rendu, elles seraient
   * identiques en valeur — mais les figer dit l'intention et met l'écran à
   * l'abri d'un passage de minuit en cours de consultation.
   */
  const { aujourdhui, veille } = useMemo(
    () => ({ aujourdhui: jourIso(0), veille: jourIso(-1) }),
    [],
  );

  // Une invitation reçue appelle une réponse ; une demande spontanée envoyée
  // appelle de la patience. Deux sections, donc, et non un « en attente » vague.
  const aConfirmer = useEntretiensSection(EN_ATTENTE, taille, {
    spontanee: false,
  });
  const aVenir = useEntretiensSection(CONFIRMES, taille, {
    from: aujourdhui,
    ordre: "asc",
  });
  const envoyees = useEntretiensSection(EN_ATTENTE, taille, {
    spontanee: true,
  });

  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const depliage = useTransitionUI(DUREE_PANNEAU);

  const loading = aConfirmer.loading || aVenir.loading || envoyees.loading;
  const error = aConfirmer.error ?? aVenir.error ?? envoyees.error;

  const reload = () => {
    aConfirmer.refetch();
    aVenir.refetch();
    envoyees.refetch();
  };

  // Trié par date croissante : le premier de la première page est le prochain.
  const prochain = aVenir.meta?.page === 1 ? aVenir.items[0] : undefined;

  const total =
    (aConfirmer.meta?.total ?? 0) +
    (aVenir.meta?.total ?? 0) +
    (envoyees.meta?.total ?? 0);

  const aConfirmerTotal = aConfirmer.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      {/*
        Même bandeau que les autres écrans de l'espace jeune. Il reprend les
        trois compteurs qui vivaient dans la colonne de droite — sur téléphone,
        ils n'arrivaient qu'après toute la liste, alors qu'« 1 à confirmer »
        est justement ce qu'il faut voir en premier.
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
          name="event_available"
          className="pointer-events-none absolute -bottom-6 right-6 hidden text-[140px] text-white/[0.05] sm:block"
        />

        <div className="relative space-y-6">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
              <Icon name="event" className="text-[16px]" /> Entretiens
            </p>
            <h1 className="font-headline text-2xl font-bold leading-tight sm:text-3xl">
              Mes entretiens
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Vos rendez-vous, vos invitations à confirmer et vos demandes
              envoyées.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Statistique
              valeur={aConfirmer.meta?.total}
              libelle="À confirmer"
              icon="mail"
              // Or vif seulement s'il y a vraiment quelque chose à confirmer :
              // une tuile dorée à zéro crierait pour rien.
              tuile={
                aConfirmerTotal > 0
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-white/15 text-white"
              }
              accent={aConfirmerTotal > 0}
            />
            <Statistique
              valeur={aVenir.meta?.total}
              libelle="À venir"
              icon="event_available"
              tuile="bg-success text-white"
            />
            <Statistique
              valeur={envoyees.meta?.total}
              libelle="Envoyées"
              icon="send"
              tuile="bg-primary-fixed text-primary"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Un seul réglage pour toutes les sections — affiché seulement quand
            il sert à quelque chose. */}
          {!loading && total > taille.perPage && (
            <div className="flex justify-end">
              <PerPageSelect
                value={taille.perPage}
                options={ENTRETIENS_PER_PAGE_OPTIONS}
                label="Par section"
                onChange={taille.setPerPage}
              />
            </div>
          )}

          {error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : loading ? (
            <SkeletonList count={3} />
          ) : total === 0 ? (
            <EmptyState
              icon="event"
              title="Aucun entretien pour le moment"
              description="Vos invitations et vos rendez-vous apparaîtront ici dès qu'une entreprise vous répondra."
            />
          ) : (
            <>
              {/*
              Les invitations passent AVANT le prochain rendez-vous : elles sont
              la seule chose qui attende un geste, et un créneau non confirmé
              peut être repris par un autre candidat.
            */}
              <Section
                section={aConfirmer}
                icon="mail"
                iconClass="bg-secondary-container text-on-secondary-container"
                titre="Invitations à confirmer"
                actif
                vide="Aucune invitation en attente"
                onChanged={reload}
              />

              {prochain && <ProchainEntretien entretien={prochain} />}

              <Section
                section={aVenir}
                icon="event_available"
                iconClass="bg-success-container text-on-success-container"
                titre="À venir"
                // Le prochain a déjà son bandeau : le répéter juste en dessous
                // ferait lire deux fois la même chose.
                ignorer={prochain?.id}
                vide="Aucun entretien confirmé"
                onChanged={reload}
              />

              <Section
                section={envoyees}
                icon="send"
                iconClass="bg-primary/10 text-primary"
                titre="Demandes envoyées"
                sousTitre="Candidatures spontanées : l'entreprise doit encore répondre. Vous pouvez retirer une demande tant qu'elle est en attente."
                vide="Aucune demande spontanée en attente"
                onChanged={reload}
              />

              <section className="space-y-3 border-t border-outline-variant pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-3 font-headline text-lg font-bold text-primary">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                      <Icon name="work_history" className="text-[18px]" />
                    </span>
                    Historique
                  </h2>
                  <Bascule
                    onClick={() => setHistoriqueOuvert((ouvert) => !ouvert)}
                    ouvert={historiqueOuvert}
                  >
                    {historiqueOuvert ? "Masquer" : "Afficher"}
                  </Bascule>
                </div>
                {/* Monté seulement à l'ouverture : l'historique ne déclenche
                  aucune requête tant que personne ne le demande. */}
                {/* Dépliage en hauteur : le contenu en dessous est poussé en
                    douceur au lieu de sauter d'un bloc. `overflow-hidden`
                    seulement pendant le mouvement serait idéal ; ici le bloc
                    ne contient rien qui doive déborder. */}
                <AnimatePresence initial={false}>
                  {historiqueOuvert && (
                    <motion.div
                      key="historique"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={depliage}
                      className="overflow-hidden"
                    >
                      <HistoriqueEntretiens
                        taille={taille}
                        veille={veille}
                        onChanged={reload}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="space-y-4 lg:sticky lg:top-20">
            <PreparerEntretien entretien={prochain} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Compteur du bandeau : tuile d'icône teintée, chiffre, libellé. */
function Statistique({
  valeur,
  libelle,
  icon,
  tuile,
  accent,
}: {
  valeur: number | undefined;
  libelle: string;
  icon: IconName;
  /** Teinte de la tuile — la couleur de la section correspondante. */
  tuile: string;
  /** Souligne le chiffre qui appelle une action. */
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl bg-white/[0.07] px-2 py-3 ring-1 ring-white/10 sm:flex-row sm:gap-3 sm:px-4",
        accent && "ring-secondary-container/60",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10",
          tuile,
        )}
      >
        <Icon name={icon} className="text-[20px]" />
      </span>
      <div className="text-center sm:text-left">
        <p
          className={cn(
            "font-headline text-2xl font-bold leading-tight",
            accent && "text-secondary-fixed-dim",
          )}
        >
          {valeur ?? "—"}
        </p>
        <p className="text-xs text-white/75">{libelle}</p>
      </div>
    </div>
  );
}

/**
 * Section de liste, repliée sur elle-même quand elle est vide.
 *
 * Une section vide gardait la même hauteur qu'une section pleine : trois
 * grands encadrés « aucun élément » repoussaient hors de l'écran le seul
 * contenu réel. Elle se réduit maintenant à une ligne.
 */
function Section({
  section,
  icon,
  iconClass,
  titre,
  sousTitre,
  actif,
  ignorer,
  vide,
  onChanged,
}: {
  section: EntretiensSection;
  icon: "mail" | "event_available" | "send";
  iconClass: string;
  titre: string;
  sousTitre?: string;
  actif?: boolean;
  /** Entretien déjà mis en avant ailleurs — retiré de la liste. */
  ignorer?: string;
  vide: string;
  onChanged: () => void;
}) {
  const items = ignorer
    ? section.items.filter((e) => e.id !== ignorer)
    : section.items;

  if (section.items.length === 0) {
    return (
      <p className="flex items-center gap-3 rounded-xl border border-dashed border-outline-variant px-3 py-2.5 text-sm text-on-surface-variant">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-container">
          <Icon name={icon} className="text-[16px]" />
        </span>
        {vide}
      </p>
    );
  }

  return (
    <section ref={section.listRef} className="space-y-3">
      <div className="space-y-1">
        <h2 className="flex items-center gap-3 font-headline text-lg font-bold text-primary">
          {/* Tuile à la couleur de la section — la même que le compteur du
              bandeau et le liseré des cartes qu'elle contient. */}
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              iconClass,
            )}
          >
            <Icon name={icon} className="text-[18px]" />
          </span>
          {titre}
          <CompteurSection
            total={section.meta?.total}
            {...(actif ? { actif: true } : {})}
          />
        </h2>
        {sousTitre && (
          <p className="pl-11 text-sm text-on-surface-variant">{sousTitre}</p>
        )}
      </div>

      {items.map((entretien, rang) => (
        <div
          key={entretien.id}
          className="apparition"
          style={{ "--rang": rang } as React.CSSProperties}
        >
          <EntretienCard
            entretien={entretien}
            viewer="jeune"
            onChanged={onChanged}
          />
        </div>
      ))}

      {/* Le titre porte déjà le contexte : la pagination n'apparaît que
          lorsqu'elle sert vraiment à naviguer. */}
      {section.meta && section.meta.totalPages > 1 && (
        <Pagination
          meta={section.meta}
          onPageChange={section.goTo}
          busy={section.loading}
          unit="entretien"
        />
      )}
    </section>
  );
}
