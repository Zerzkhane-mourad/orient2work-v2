import { Button, ButtonLink, Card, CardBody, Icon, StatusBadge } from "@/components/ui";
import type { Entretien } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface EntretienCardProps {
  entretien: Entretien;
  /** Whose perspective — controls the title and available actions. */
  viewer: "jeune" | "entreprise";
}

/** Interview summary card with contextual actions. */
export function EntretienCard({ entretien, viewer }: EntretienCardProps) {
  const counterpart =
    viewer === "jeune"
      ? entretien.entreprise.nom
      : `${entretien.jeune.prenom} ${entretien.jeune.nom}`;

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-20 flex-col items-center rounded-lg bg-surface-container px-4 py-2 text-center">
          <span className="text-xs font-bold uppercase text-on-surface-variant">
            {new Date(entretien.date).toLocaleDateString("fr-FR", { month: "short" })}
          </span>
          <span className="font-headline text-2xl font-bold text-primary">
            {new Date(entretien.date).getDate()}
          </span>
          <span className="text-xs text-on-surface-variant">{entretien.heure}</span>
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-primary">{counterpart}</h3>
            <StatusBadge kind="entretien" status={entretien.status} />
          </div>
          <p className="text-sm text-on-surface-variant">{entretien.offreTitre}</p>
          <p className="flex items-center gap-1 text-xs text-on-surface-variant">
            <Icon name="event" className="text-[15px]" /> {formatDate(entretien.date)} à {entretien.heure}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {entretien.status === "accepte" && entretien.lienReunion && (
            <ButtonLink href={entretien.lienReunion} variant="secondary" size="sm">
              <Icon name="video_call" className="text-[18px]" /> Rejoindre
            </ButtonLink>
          )}
          {viewer === "entreprise" && entretien.status === "en_attente" && (
            <>
              <Button variant="secondary" size="sm">
                Accepter
              </Button>
              <Button variant="outline" size="sm">
                Refuser
              </Button>
            </>
          )}
          {viewer === "jeune" && entretien.status === "en_attente" && (
            <Button variant="ghost" size="sm">
              Annuler
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
