"use client";

/**
 * « Mon profil de recherche », à côté de la liste des offres.
 *
 * La carte récitait trois valeurs et un bouton : rien qu'on ne sache déjà, et
 * rien à en faire sur cet écran. Elle sert maintenant la RECHERCHE :
 *
 *  • chaque critère utile — la ville, les compétences — lance la recherche
 *    correspondante d'un clic : la recherche couvre déjà ville et compétences,
 *    il ne manquait que le raccourci ;
 *  • un critère absent se dit « À renseigner » et mène au profil, au lieu d'un
 *    tiret qu'on ne remarque pas ;
 *  • la complétude du profil est montrée ici parce que c'est ici qu'elle se
 *    paie : les recruteurs lisent ce profil quand on postule.
 *
 * Appelant : lit l'URL, donc à placer sous une frontière `<Suspense>`.
 */
import Link from "next/link";
import { ButtonLink, Card, CardBody, Icon, ProgressBar, type IconName } from "@/components/ui";
import type { Jeune } from "@/lib/types";
import { useEcrireParams, useParam } from "@/lib/use-url-param";
import { cn } from "@/lib/utils";

/** Au-delà, les compétences encombrent la carte plus qu'elles n'aident. */
const COMPETENCES_MAX = 5;

const HREF_PROFIL = "/espace-jeune/profil";

export function ProfilRecherche({ jeune }: { jeune: Jeune }) {
  const ecrire = useEcrireParams();
  const termeActif = useParam("q");

  const rechercher = (terme: string) => {
    // Recliquer le raccourci actif l'annule : un interrupteur, pas un sens unique.
    const suivant = termeActif === terme ? undefined : terme;
    ecrire({ q: suivant }, { push: true });
    /*
     * Sous `xl`, cette carte est SOUS la liste : sans remonter, le clic
     * changerait des résultats hors de vue. Défilement doux, sauf pour qui a
     * demandé moins de mouvement.
     */
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduit ? "auto" : "smooth" });
  };

  const completion = Math.round(jeune.profilCompletion);
  const competences = jeune.competences.slice(0, COMPETENCES_MAX);

  return (
    <Card>
      <CardBody className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 font-bold text-primary">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon name="person_search" className="text-[18px]" />
            </span>
            <span className="truncate">Mon profil de recherche</span>
          </h3>
          <Link
            href={HREF_PROFIL}
            aria-label="Modifier mon profil"
            title="Modifier mon profil"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          >
            <Icon name="edit" className="text-[18px]" />
          </Link>
        </div>

        <dl className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
          <Critere icon="category" terme="Filière" valeur={jeune.filiere} />
          <Critere icon="school" terme="Niveau" valeur={jeune.niveauEtudes} />
          <Critere icon="location_on" terme="Ville" valeur={jeune.ville} />
        </dl>

        {(jeune.ville || competences.length > 0) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Recherches rapides
            </p>
            <div className="flex flex-wrap gap-1.5">
              {jeune.ville && (
                <Raccourci
                  icon="location_on"
                  actif={termeActif === jeune.ville}
                  onClick={() => rechercher(jeune.ville)}
                >
                  {jeune.ville}
                </Raccourci>
              )}
              {competences.map((competence) => (
                <Raccourci
                  key={competence}
                  actif={termeActif === competence}
                  onClick={() => rechercher(competence)}
                >
                  {competence}
                </Raccourci>
              ))}
            </div>
          </div>
        )}

        {completion < 100 ? (
          <div className="space-y-2 rounded-lg bg-secondary-container/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-on-surface">Profil complété</span>
              <span className="font-bold tabular-nums text-primary">{completion}%</span>
            </div>
            <ProgressBar value={completion} className="h-1.5 bg-surface-container-lowest" />
            <p className="text-xs text-on-surface-variant">
              Un profil complet est mieux lu par les recruteurs.
            </p>
            <ButtonLink href={HREF_PROFIL} variant="secondary" size="sm" fullWidth>
              Compléter mon profil
            </ButtonLink>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
            <Icon name="verified" className="text-[16px]" /> Profil complet
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function Critere({ icon, terme, valeur }: { icon: IconName; terme: string; valeur: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Icon name={icon} className="shrink-0 text-[18px] text-on-surface-variant" />
      <dt className="text-sm text-on-surface-variant">{terme}</dt>
      <dd className="ml-auto min-w-0 text-right">
        {valeur ? (
          // `title` : une valeur longue est tronquée, le survol la rend entière.
          <span className="block truncate text-sm font-semibold text-on-surface" title={valeur}>
            {valeur}
          </span>
        ) : (
          <Link
            href={HREF_PROFIL}
            className="inline-flex items-center gap-1 text-xs font-semibold text-on-warning-container underline-offset-2 hover:underline"
          >
            <Icon name="add" className="text-[14px]" /> À renseigner
          </Link>
        )}
      </dd>
    </div>
  );
}

function Raccourci({
  icon,
  actif,
  onClick,
  children,
}: {
  icon?: IconName;
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={cn(
        "inline-flex min-h-8 max-w-full items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors",
        actif
          ? "bg-primary text-on-primary"
          : "bg-primary/10 text-primary hover:bg-primary/20",
      )}
    >
      {icon && <Icon name={icon} className="shrink-0 text-[14px]" />}
      <span className="truncate">{children}</span>
      {actif && <Icon name="close" className="shrink-0 text-[14px]" />}
    </button>
  );
}
