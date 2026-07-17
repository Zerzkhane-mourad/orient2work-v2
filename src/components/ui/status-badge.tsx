import { Badge } from "./badge";
import {
  ENTREPRISE_STATUSES,
  ENTRETIEN_STATUSES,
  JEUNE_STATUSES,
  OFFRE_STATUSES,
  type EntrepriseStatus,
  type EntretienStatus,
  type JeuneStatus,
  type OffreStatus,
} from "@/lib/constants";

type Tone = React.ComponentProps<typeof Badge>["tone"];

const REGISTRIES = {
  jeune: JEUNE_STATUSES,
  entreprise: ENTREPRISE_STATUSES,
  offre: OFFRE_STATUSES,
  entretien: ENTRETIEN_STATUSES,
} as const;

type StatusBadgeProps =
  | { kind: "jeune"; status: JeuneStatus }
  | { kind: "entreprise"; status: EntrepriseStatus }
  | { kind: "offre"; status: OffreStatus }
  | { kind: "entretien"; status: EntretienStatus };

/** Renders the correct label + tone for any domain status enum. */
export function StatusBadge({ kind, status }: StatusBadgeProps) {
  const registry = REGISTRIES[kind] as Record<string, { label: string; tone: string }>;
  const config = registry[status];
  return <Badge tone={config.tone as Tone}>{config.label}</Badge>;
}
