"use client";

/**
 * Bandeau du prochain entretien confirmé.
 *
 * Un seul rendez-vous compte vraiment : le suivant. Il est donc sorti de la
 * liste et porte les trois choses dont on a besoin dans l'instant — QUAND
 * (compte à rebours, pas une date à calculer de tête), AVEC QUI, et COMMENT
 * s'y rendre : le lien de visio, ou à défaut les consignes laissées par
 * l'entreprise.
 *
 * Ce dernier point manquait : un entretien sur place n'affichait aucune adresse,
 * le message du recruteur restant noyé en petit dans la carte de liste.
 */
import { Button, ButtonLink, Card, CardBody, Icon } from "@/components/ui";
import type { ApiEntretien } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/utils";
import { echeance } from "./echeance";

export function ProchainEntretien({ entretien }: { entretien: ApiEntretien }) {
  const { libelle, imminent } = echeance(entretien.date);
  const jour = new Date(entretien.date);

  return (
    <Card className="overflow-hidden bg-primary text-white">
      <CardBody className="relative space-y-4">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="min-w-16 rounded-xl bg-white p-3 text-center text-primary">
              <p className="text-[10px] font-bold uppercase">
                {jour.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}
              </p>
              <p className="text-2xl font-bold leading-tight">{jour.getUTCDate()}</p>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
                  Prochain entretien
                </p>
                {/* Le compte à rebours passe en pastille pleine quand c'est
                    pour aujourd'hui ou demain : c'est là qu'il change une
                    décision — préparer ce soir plutôt que la semaine prochaine. */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    imminent ? "bg-secondary text-on-secondary" : "bg-white/15 text-white",
                  )}
                >
                  <Icon name={imminent ? "priority_high" : "timer"} className="text-[13px]" />
                  {libelle} à {entretien.heure}
                </span>
              </div>

              <p className="truncate font-headline text-lg font-bold">{entretien.entreprise.nom}</p>
              <p className="truncate text-sm text-white/80">
                {entretien.offreTitre} · {formatDate(entretien.date)}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {entretien.lienReunion ? (
              <ButtonLink
                href={entretien.lienReunion}
                variant="secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="video_call" className="text-[18px]" /> Rejoindre
              </ButtonLink>
            ) : (
              /* Pas de lien : l'entretien est sur place, ou le recruteur ne l'a
                 pas encore transmis. Le dire évite d'attendre un bouton qui ne
                 viendra pas. */
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/85">
                <Icon name="location_on" className="text-[16px]" />
                Sur place ou lien à venir
              </span>
            )}
          </div>
        </div>

        {entretien.commentaire && (
          <p className="relative z-10 flex items-start gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/90">
            <Icon name="info" className="mt-0.5 shrink-0 text-[16px]" />
            {entretien.commentaire}
          </p>
        )}

        <Icon
          name="event_available"
          className="pointer-events-none absolute -bottom-6 right-4 text-[130px] text-white/5"
        />
      </CardBody>
    </Card>
  );
}

/**
 * Rappel de préparation, cadré sur l'entretien qui arrive.
 *
 * La liste était la même en toute circonstance, y compris sans aucun entretien
 * au calendrier — un conseil hors sol qu'on cesse de lire. Elle ne s'affiche
 * plus que quand elle sert, et nomme l'entreprise concernée.
 */
export function PreparerEntretien({ entretien }: { entretien: ApiEntretien | undefined }) {
  const etapes = [
    entretien ? `Relire l'annonce « ${entretien.offreTitre} »` : "Relire l'offre et le profil visé",
    entretien ? `Se renseigner sur ${entretien.entreprise.nom}` : "Se renseigner sur l'entreprise",
    "Préparer 2 questions sur le poste",
    "Revoir vos projets et expériences clés",
    entretien?.lienReunion
      ? "Tester votre connexion et votre matériel"
      : "Vérifier le lieu et le temps de trajet",
  ];

  return (
    <Card>
      <CardBody className="space-y-3">
        <h3 className="flex items-center gap-2 font-bold text-primary">
          <Icon name="lightbulb" className="text-secondary" /> Préparer mon entretien
        </h3>
        <ul className="space-y-2">
          {etapes.map((etape) => (
            <li key={etape} className="flex items-start gap-2 text-sm text-on-surface">
              <Icon name="check_circle" className="mt-0.5 shrink-0 text-[16px] text-success" />
              {etape}
            </li>
          ))}
        </ul>
        <ButtonLink href="/espace-jeune/formations" variant="outline" size="sm" fullWidth>
          Formation « Réussir son entretien »
        </ButtonLink>
      </CardBody>
    </Card>
  );
}

/** Compteur d'en-tête de section — le nombre exact, pas celui de la page. */
export function CompteurSection({
  total,
  actif,
}: {
  total: number | undefined;
  /** Met le compteur en évidence : il y a quelque chose à faire. */
  actif?: boolean;
}) {
  if (!total) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-bold",
        actif
          ? "bg-secondary-container text-on-secondary-container"
          : "bg-surface-container text-on-surface-variant",
      )}
    >
      {total}
    </span>
  );
}

/** Bouton neutre, réservé aux bascules internes à l'écran. */
export function Bascule({
  onClick,
  ouvert,
  children,
}: {
  onClick: () => void;
  ouvert: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} aria-expanded={ouvert}>
      {children}
      <Icon name="expand_more" className={cn("text-[18px] transition-transform", ouvert && "rotate-180")} />
    </Button>
  );
}
