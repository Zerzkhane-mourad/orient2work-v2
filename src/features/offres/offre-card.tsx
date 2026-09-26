import Link from "next/link";
import { Avatar, Card, CardBody, Chip, Icon } from "@/components/ui";
import type { ApiOffre } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/utils";
import { accentType, BadgeType } from "./presentation";

interface OffreCardProps {
  offre: ApiOffre;
  /** Base path for the detail link (differs by space). */
  href?: string;
}

/**
 * Carte d'offre compacte — tableau de bord et grille publique.
 *
 * Même langage que la carte de la liste des offres : logo de l'entreprise,
 * étiquette de type en couleur, liseré de la même teinte. Une offre se
 * reconnaît ainsi d'un écran à l'autre.
 */
export function OffreCard({ offre, href }: OffreCardProps) {
  const body = (
    <CardBody className="flex flex-col gap-4 p-4 pl-5 sm:p-5 sm:pl-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            src={offre.entreprise.logo}
            alt={offre.entreprise.nom}
            size={48}
            className="shrink-0 rounded-xl border border-outline-variant"
          />
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-bold leading-snug text-primary group-hover:underline">
              {offre.titre}
            </h3>
            <p className="truncate text-sm text-on-surface-variant">
              {offre.entreprise.nom} · {offre.ville}
            </p>
          </div>
        </div>
        <BadgeType type={offre.type} />
      </div>

      <p className="line-clamp-2 text-sm text-on-surface-variant">{offre.description}</p>

      {offre.competences.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {offre.competences.slice(0, 3).map((c) => (
            <Chip key={c} className="px-2.5 py-0.5 text-xs">
              {c}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Icon name="schedule" className="text-[15px] text-primary/70" />
          Limite : {formatDate(offre.dateLimite)}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="laptop" className="text-[15px] text-primary/70" />
          {offre.mode}
        </span>
      </div>
    </CardBody>
  );

  const lisere = (
    <span
      aria-hidden
      className={cn(
        "absolute inset-y-0 left-0 w-1 transition-[width] duration-200 group-hover:w-1.5",
        accentType(offre.type),
      )}
    />
  );

  if (href) {
    return (
      <Card className="group relative overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-level-2 focus-within:ring-2 focus-within:ring-secondary">
        {lisere}
        <Link href={href} className="block focus-visible:outline-none">
          {body}
        </Link>
      </Card>
    );
  }
  return (
    <Card className="group relative overflow-hidden">
      {lisere}
      {body}
    </Card>
  );
}
