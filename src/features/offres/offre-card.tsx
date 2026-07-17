import Link from "next/link";
import { Badge, Card, CardBody, Chip, Icon } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Offre } from "@/lib/types";

interface OffreCardProps {
  offre: Offre;
  /** Base path for the detail link (differs by space). */
  href?: string;
}

/** Compact job-offer card used on the offers list and dashboards. */
export function OffreCard({ offre, href }: OffreCardProps) {
  const body = (
    <CardBody className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
            <Icon name="business_center" />
          </span>
          <div>
            <h3 className="font-bold text-primary">{offre.titre}</h3>
            <p className="text-sm text-on-surface-variant">
              {offre.entreprise.nom} • {offre.ville}
            </p>
          </div>
        </div>
        <Badge tone="gold">{offre.type}</Badge>
      </div>

      <p className="line-clamp-2 text-sm text-on-surface-variant">{offre.description}</p>

      <div className="flex flex-wrap gap-2">
        {offre.competences.slice(0, 3).map((c) => (
          <Chip key={c} className="text-xs">
            {c}
          </Chip>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant pt-4 text-xs text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Icon name="schedule" className="text-[16px]" />
          Limite : {formatDate(offre.dateLimite)}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="location_on" className="text-[16px]" />
          {offre.mode}
        </span>
      </div>
    </CardBody>
  );

  if (href) {
    return (
      <Card interactive>
        <Link href={href} className="block">
          {body}
        </Link>
      </Card>
    );
  }
  return <Card>{body}</Card>;
}
