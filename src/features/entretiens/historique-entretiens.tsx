"use client";

/**
 * Historique des entretiens — le passé, et ce qui n'a pas abouti.
 *
 * L'écran ne montrait QUE les entretiens confirmés et les demandes en attente.
 * Un refus ou une annulation disparaissait donc sans laisser de trace, et un
 * entretien passé restait indéfiniment sous « À venir », en tête de liste,
 * puisque rien ne filtrait sur la date.
 *
 * Deux vues plutôt que quatre sections : « Terminés » et « Sans suite » ne se
 * consultent pas ensemble, et une seule requête est active à la fois. Le bloc
 * n'est monté qu'une fois ouvert — l'historique ne coûte rien tant que personne
 * ne le demande.
 */
import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  EmptyState,
  ErrorState,
  Icon,
  Pagination,
  SkeletonList,
} from "@/components/ui";
import {
  DUREE_PANNEAU,
  useTransitionUI,
} from "@/components/motion/transitions";
import { EntretienCard } from "./entretien-card";
import {
  useEntretiensSection,
  type SectionFiltres,
} from "./use-entretiens-sections";
import type { PageSize } from "@/lib/use-pagination";
import type { EntretienStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Constantes de module : un tableau recréé à chaque rendu boucle la requête. */
const TERMINES = ["accepte"] as const;
const SANS_SUITE = ["refuse", "annule"] as const;

type Vue = "termines" | "sans_suite";

const VUES: Array<{
  cle: Vue;
  libelle: string;
  statuts: readonly EntretienStatus[];
}> = [
  { cle: "termines", libelle: "Terminés", statuts: TERMINES },
  { cle: "sans_suite", libelle: "Sans suite", statuts: SANS_SUITE },
];

interface Props {
  taille: PageSize;
  /** `YYYY-MM-DD` de la veille : borne haute des entretiens terminés. */
  veille: string;
  onChanged: () => void;
}

export function HistoriqueEntretiens({ taille, veille, onChanged }: Props) {
  const [vue, setVue] = useState<Vue>("termines");
  /** Sens du dernier changement d'onglet : +1 vers la droite, -1 vers la gauche. */
  const [sens, setSens] = useState<1 | -1>(1);
  // Identifiant propre à CETTE instance : deux historiques à l'écran ne
  // doivent pas se disputer la même pastille.
  const pastilleId = `historique-onglet-${useId()}`;
  const glisse = useTransitionUI(DUREE_PANNEAU);

  /*
   * Les entretiens terminés se bornent à la veille — sans quoi ils feraient
   * double emploi avec « À venir ». Ceux sans suite ne sont pas bornés : une
   * annulation peut porter sur un rendez-vous de la semaine prochaine, et la
   * masquer serait exactement le défaut qu'on corrige ici.
   */
  const filtres: SectionFiltres =
    vue === "termines" ? { to: veille, ordre: "desc" } : { ordre: "desc" };

  const section = useEntretiensSection(
    vue === "termines" ? TERMINES : SANS_SUITE,
    taille,
    filtres,
  );

  const changer = (suivante: Vue) => {
    if (suivante === vue) return;
    setSens(ordre(suivante) > ordre(vue) ? 1 : -1);
    setVue(suivante);
  };

  return (
    <div className="space-y-3">
      <div
        className="flex gap-1 rounded-full bg-surface-container p-1"
        role="tablist"
      >
        {VUES.map(({ cle, libelle }) => {
          const actif = vue === cle;
          return (
            <button
              key={cle}
              type="button"
              role="tab"
              aria-selected={actif}
              onClick={() => changer(cle)}
              className={cn(
                "relative min-h-9 flex-1 rounded-full px-3 text-sm font-semibold transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                actif
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-primary",
              )}
            >
              {/*
                UNE pastille partagée (`layoutId`) qui glisse d'un onglet à
                l'autre. Deux fonds qui s'éteignent et s'allument sur place ne
                disent pas où l'on est allé ; un objet qui se déplace, si.
              */}
              {actif && (
                <motion.span
                  layoutId={pastilleId}
                  transition={glisse}
                  className="absolute inset-0 rounded-full bg-surface-container-lowest shadow-level-1"
                />
              )}
              <span className="relative z-10">{libelle}</span>
            </button>
          );
        })}
      </div>

      {/*
        Le contenu part et arrive du côté de l'onglet choisi : vers la droite
        pour « Sans suite », vers la gauche en revenant. `mode="wait"` : l'ancien
        contenu sort avant que le nouveau n'entre — deux listes superposées le
        temps d'une transition seraient illisibles.
      */}
      <AnimatePresence mode="wait" initial={false} custom={sens}>
        <motion.div
          key={vue}
          custom={sens}
          variants={GLISSEMENT}
          initial="entree"
          animate="present"
          exit="sortie"
          transition={glisse}
          className="space-y-3"
        >
          {section.error ? (
            <ErrorState error={section.error} onRetry={section.refetch} />
          ) : section.loading ? (
            <SkeletonList count={2} />
          ) : section.items.length === 0 ? (
            <EmptyState
              icon={vue === "termines" ? "work_history" : "event_busy"}
              title={
                vue === "termines"
                  ? "Aucun entretien passé"
                  : "Aucun entretien sans suite"
              }
              description={
                vue === "termines"
                  ? "Vos entretiens passés s'archiveront ici."
                  : "Les demandes refusées ou annulées apparaîtront ici."
              }
            />
          ) : (
            <div ref={section.listRef} className="space-y-3">
              {section.items.map((entretien) => (
                <EntretienCard
                  key={entretien.id}
                  entretien={entretien}
                  viewer="jeune"
                  onChanged={onChanged}
                />
              ))}
              {section.meta && section.meta.totalPages > 1 && (
                <Pagination
                  meta={section.meta}
                  onPageChange={section.goTo}
                  busy={section.loading}
                  unit="entretien"
                />
              )}
            </div>
          )}

          {vue === "termines" && section.items.length > 0 && (
            <p className="flex items-start gap-2 text-xs text-on-surface-variant">
              <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
              Un avis sur l&apos;entreprise aide les autres candidats à se
              préparer.
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const ordre = (vue: Vue) => VUES.findIndex((v) => v.cle === vue);

/** Déplacement court : on devine le sens, sans que le contenu traverse l'écran. */
const GLISSEMENT = {
  entree: (sens: 1 | -1) => ({ opacity: 0, x: 24 * sens }),
  present: { opacity: 1, x: 0 },
  sortie: (sens: 1 | -1) => ({ opacity: 0, x: -24 * sens }),
};
