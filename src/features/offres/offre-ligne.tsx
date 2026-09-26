/**
 * Une offre, dans la liste de recherche de l'espace jeune.
 *
 * Même construction que la carte de suivi d'une candidature : à gauche ce qui
 * DÉCIDE du clic — intitulé, compétences, entreprise, début d'annonce — à
 * droite l'offre en bref, ce que l'on compare d'une annonce à l'autre sans
 * les ouvrir : niveau, mode, lieu, date limite.
 *
 * Toute la carte mène à l'annonce, mais par UN seul lien, celui du titre,
 * étendu à la carte : un lecteur d'écran n'entend pas trois fois la même
 * destination, et le clavier ne s'y arrête qu'une fois.
 */
import Link from "next/link";
import { Avatar, Badge, Card, Icon } from "@/components/ui";
import type { ApiOffre } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/utils";
import {
  accentType,
  BadgeType,
  CompetencesApercu,
  joursRestants,
  Repere,
} from "./presentation";

/** Publiée depuis moins de ce nombre de jours : l'offre est « nouvelle ». */
const NOUVELLE_JOURS = 7;
/** À partir de ce nombre de jours restants, la clôture est signalée. */
const CLOTURE_PROCHE_JOURS = 7;

export function OffreLigne({ offre, href }: { offre: ApiOffre; href: string }) {
  const maintenant = new Date();
  const ageJours = Math.floor(
    (maintenant.getTime() - new Date(offre.publieeLe).getTime()) / 86_400_000,
  );
  const nouvelle = ageJours >= 0 && ageJours < NOUVELLE_JOURS;
  const restants = joursRestants(offre.dateLimite, maintenant);

  return (
    <Card className="group relative overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-level-2 focus-within:ring-2 focus-within:ring-secondary">
      {/* Liseré à la couleur du type : la liste se lit par familles d'un coup
          d'œil, et il s'épaissit au survol pour marquer la carte visée. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1 transition-[width] duration-200 group-hover:w-1.5",
          accentType(offre.type),
        )}
      />
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <BadgeType type={offre.type} />
              {offre.filiere && <Badge tone="primary">{offre.filiere}</Badge>}
            </div>
            {/* À droite, l'information qui presse : une clôture proche prime
                sur la nouveauté — c'est elle qui change quand il faut agir. */}
            {restants <= CLOTURE_PROCHE_JOURS ? (
              <Badge tone="warning" icon="timer" className="shrink-0">
                {restants <= 0 ? "Dernier jour" : `Clôture dans ${restants} j`}
              </Badge>
            ) : (
              nouvelle && (
                <Badge tone="success" icon="bolt" className="shrink-0">
                  Nouvelle
                </Badge>
              )
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-balance font-headline text-lg font-bold leading-snug text-primary sm:text-xl">
              <Link
                href={href}
                className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline"
              >
                {offre.titre}
              </Link>
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <CompetencesApercu competences={offre.competences} />
              <p className="text-sm text-on-surface-variant">
                Publiée le{" "}
                <span className="font-semibold text-on-surface">{formatDate(offre.publieeLe)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar
              src={offre.entreprise.logo}
              alt={offre.entreprise.nom}
              size={64}
              className="shrink-0 rounded-xl border border-outline-variant"
            />
            <div className="min-w-0">
              <p className="truncate font-bold uppercase tracking-wide text-on-surface">
                {offre.entreprise.nom}
              </p>
              <p className="line-clamp-3 text-sm text-on-surface-variant">{offre.description}</p>
            </div>
          </div>

          {/* Repère visuel seulement : le lien réel est le titre, étendu. */}
          <p
            aria-hidden
            className="flex items-center justify-end gap-1 font-bold text-primary transition-[gap] duration-200 group-hover:gap-2"
          >
            Voir cette offre <Icon name="arrow_forward" className="text-[18px]" />
          </p>
        </div>

        <aside
          aria-label="L'offre en bref"
          className="border-t border-outline-variant bg-primary/[0.035] p-4 sm:p-6 md:border-l md:border-t-0"
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-1">
            <Repere icon="school" terme="Niveau demandé">
              {offre.niveauDemande}
            </Repere>
            <Repere icon="laptop" terme="Mode de travail">
              {offre.mode}
            </Repere>
            <Repere icon="location_on" terme="Lieu">
              {offre.ville}
            </Repere>
            <Repere icon="event" terme="Date limite">
              {formatDate(offre.dateLimite)}
            </Repere>
            <Repere icon="groups" terme="Postes">
              {offre.nombrePostes} poste{offre.nombrePostes > 1 ? "s" : ""}
            </Repere>
          </dl>
        </aside>
      </div>
    </Card>
  );
}
