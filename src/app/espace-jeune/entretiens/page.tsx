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
import {
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  PerPageSelect,
  SkeletonList,
} from "@/components/ui";
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
  const aConfirmer = useEntretiensSection(EN_ATTENTE, taille, { spontanee: false });
  const aVenir = useEntretiensSection(CONFIRMES, taille, {
    from: aujourdhui,
    ordre: "asc",
  });
  const envoyees = useEntretiensSection(EN_ATTENTE, taille, { spontanee: true });

  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);

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
    (aConfirmer.meta?.total ?? 0) + (aVenir.meta?.total ?? 0) + (envoyees.meta?.total ?? 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <PageHeader
          size="sm"
          title="Mes entretiens"
          subtitle="Vos rendez-vous, vos invitations à confirmer et vos demandes envoyées."
          actions={
            /* Un seul réglage en tête d'écran : toutes les sections le suivent. */
            !loading && total > taille.perPage ? (
              <PerPageSelect
                value={taille.perPage}
                options={ENTRETIENS_PER_PAGE_OPTIONS}
                label="Par section"
                onChange={taille.setPerPage}
              />
            ) : undefined
          }
        />

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
              iconClass="text-secondary"
              titre="Invitations à confirmer"
              actif
              vide="Aucune invitation en attente"
              onChanged={reload}
            />

            {prochain && <ProchainEntretien entretien={prochain} />}

            <Section
              section={aVenir}
              icon="event_available"
              iconClass="text-secondary"
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
              iconClass="text-on-surface-variant"
              titre="Demandes envoyées"
              sousTitre="Candidatures spontanées : l'entreprise doit encore répondre."
              vide="Aucune demande spontanée en attente"
              onChanged={reload}
            />

            <section className="space-y-3 border-t border-outline-variant pt-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
                  <Icon name="work_history" className="text-on-surface-variant" /> Historique
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
              {historiqueOuvert && (
                <HistoriqueEntretiens taille={taille} veille={veille} onChanged={reload} />
              )}
            </section>
          </>
        )}
      </div>

      <aside className="space-y-4">
        <div className="space-y-4 lg:sticky lg:top-20">
          <Card>
            <CardBody className="grid grid-cols-3 gap-2 text-center">
              <Statistique
                valeur={aConfirmer.meta?.total}
                libelle="À confirmer"
                accent={(aConfirmer.meta?.total ?? 0) > 0}
              />
              <Statistique valeur={aVenir.meta?.total} libelle="À venir" />
              <Statistique valeur={envoyees.meta?.total} libelle="Envoyées" />
            </CardBody>
          </Card>

          <PreparerEntretien entretien={prochain} />
        </div>
      </aside>
    </div>
  );
}

function Statistique({
  valeur,
  libelle,
  accent,
}: {
  valeur: number | undefined;
  libelle: string;
  /** Souligne le chiffre qui appelle une action. */
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-headline text-2xl font-bold ${accent ? "text-secondary" : "text-primary"}`}
      >
        {valeur ?? "—"}
      </p>
      <p className="text-xs text-on-surface-variant">{libelle}</p>
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
  const items = ignorer ? section.items.filter((e) => e.id !== ignorer) : section.items;

  if (section.items.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
        <Icon name={icon} className="text-[18px]" />
        {vide}
      </p>
    );
  }

  return (
    <section ref={section.listRef} className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
          <Icon name={icon} className={iconClass} /> {titre}
          <CompteurSection total={section.meta?.total} {...(actif ? { actif: true } : {})} />
        </h2>
        {sousTitre && <p className="text-sm text-on-surface-variant">{sousTitre}</p>}
      </div>

      {items.map((entretien) => (
        <EntretienCard
          key={entretien.id}
          entretien={entretien}
          viewer="jeune"
          onChanged={onChanged}
        />
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
