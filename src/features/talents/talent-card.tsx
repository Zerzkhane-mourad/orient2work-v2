import { Avatar, ButtonLink, Card, CardBody, Chip, Icon } from "@/components/ui";
import type { Jeune } from "@/lib/types";

/** Compact candidate card for the recruiter search results. */
export function TalentCard({ talent }: { talent: Jeune }) {
  return (
    <Card interactive>
      <CardBody className="space-y-4">
        <div className="flex items-start gap-3">
          <Avatar src={talent.photo} alt={`${talent.prenom} ${talent.nom}`} size={56} />
          <div className="flex-1">
            <h3 className="font-bold text-primary">
              {talent.prenom} {talent.nom}
            </h3>
            <p className="text-sm text-on-surface-variant">{talent.titre}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
              <Icon name="location_on" className="text-[14px]" /> {talent.ville} • {talent.niveauEtudes}
            </p>
          </div>
          <div className="rounded-lg bg-secondary-container px-2.5 py-1 text-center text-on-secondary-container">
            <p className="text-sm font-bold">{talent.scoreQuiz}%</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {talent.competences.slice(0, 4).map((c) => (
            <Chip key={c} className="text-xs">
              {c}
            </Chip>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant pt-3">
          <span className="flex items-center gap-1 text-xs text-on-surface-variant">
            <Icon name="school" className="text-[15px]" /> {talent.formationsCompletees} formations
          </span>
          <ButtonLink href={`/espace-entreprise/talents/${talent.id}`} variant="ghost" size="sm">
            Voir le profil →
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}
