/**
 * Pièces de présentation d'une offre, communes à la liste des offres et au
 * suivi des candidatures.
 *
 * Les deux écrans montrent la même offre : même teinte de type, mêmes
 * compétences résumées, même panneau « en bref ». Définies une fois, elles ne
 * peuvent pas se mettre à diverger d'un écran à l'autre.
 */
import { Badge, Chip, Icon, type IconName } from "@/components/ui";
import type { OpportunityType } from "@/lib/constants";

type Ton = React.ComponentProps<typeof Badge>["tone"];

/**
 * Une teinte par type d'opportunité : on repère un stage d'une alternance
 * avant d'avoir lu le mot. Un type inconnu (ancien libellé) reste neutre.
 */
const TYPE_TON: Record<OpportunityType, Ton> = {
  Stage: "primary",
  Emploi: "success",
  PFE: "info",
  Alternance: "gold",
  Freelance: "warning",
  Projet: "neutral",
};

export function BadgeType({ type }: { type: string }) {
  return <Badge tone={TYPE_TON[type as OpportunityType] ?? "neutral"}>{type}</Badge>;
}

/**
 * La même teinte, en couleur PLEINE — pour une pastille de filtre ou le liseré
 * d'une carte. Le filtre « Stage » et les cartes de stage portent ainsi la
 * même couleur : on relie l'un aux autres sans lire.
 */
const TYPE_ACCENT: Record<OpportunityType, string> = {
  Stage: "bg-primary",
  Emploi: "bg-success",
  PFE: "bg-primary/45",
  Alternance: "bg-secondary-container",
  Freelance: "bg-warning",
  Projet: "bg-outline",
};

export function accentType(type: string): string {
  return TYPE_ACCENT[type as OpportunityType] ?? "bg-outline";
}

/** Compétences montrées en clair ; les suivantes se résument en « +N ». */
const COMPETENCES_VISIBLES = 3;

export function CompetencesApercu({ competences }: { competences: readonly string[] }) {
  if (competences.length === 0) return null;
  const autres = competences.length - COMPETENCES_VISIBLES;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Compétences demandées">
      {competences.slice(0, COMPETENCES_VISIBLES).map((competence) => (
        <li key={competence}>
          <Chip className="px-2.5 py-0.5 text-xs">{competence}</Chip>
        </li>
      ))}
      {autres > 0 && (
        <li>
          {/* Le détail au survol : « +23 » seul ne dit pas si la compétence
              qu'on cherche en fait partie. */}
          <Chip
            className="px-2.5 py-0.5 text-xs"
            title={competences.slice(COMPETENCES_VISIBLES).join(", ")}
          >
            +{autres}
            <span className="sr-only"> autres compétences</span>
          </Chip>
        </li>
      )}
    </ul>
  );
}

/** Une entrée du panneau « en bref » : libellé discret, valeur avec icône. */
export function Repere({
  icon,
  terme,
  children,
}: {
  icon: IconName;
  terme: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
        {terme}
      </dt>
      <dd className="mt-0.5 flex items-start gap-1.5 text-sm text-on-surface">
        <Icon name={icon} className="mt-0.5 shrink-0 text-[16px] text-primary/70" />
        <span className="min-w-0 break-words">{children}</span>
      </dd>
    </div>
  );
}

/**
 * Jours restants avant la date limite, `0` le jour même.
 *
 * `dateLimite` est un JOUR (`YYYY-MM-DD`), et ce jour-là l'offre est encore
 * ouverte : on compte donc jusqu'à sa FIN, en heure locale — `new Date(jour)`
 * seul vaudrait minuit UTC.
 */
export function joursRestants(dateLimite: string, maintenant: Date = new Date()): number {
  const fin = new Date(`${dateLimite}T23:59:59`);
  return Math.floor((fin.getTime() - maintenant.getTime()) / 86_400_000);
}
