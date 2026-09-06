"use client";

/**
 * Une candidature, dans la liste du candidat.
 *
 * Trois manques que la fiche ne comblait pas :
 *
 *  • AUCUNE ACTION. « Entretien proposé » s'affichait comme une nouvelle parmi
 *    d'autres, sans dire qu'une invitation attend une réponse ailleurs.
 *  • AUCUNE TRACE DE L'ENVOI. `message` et `cv` sont servis par l'API et
 *    n'étaient montrés nulle part : impossible de se rappeler ce qu'on avait
 *    écrit, ni quel CV était parti.
 *  • AUCUN RETRAIT. Il fallait rouvrir la fiche de l'offre pour se désister.
 *
 * Le détail de l'envoi est REPLIÉ par défaut : c'est une information de
 * vérification, consultée une fois, qui doublerait sinon la hauteur de chaque
 * ligne d'une liste qu'on parcourt.
 */
import { useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  ErrorBanner,
  Icon,
  type IconName,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/api/adapters";
import type { ApiCandidature } from "@/lib/api/types";
import { useMutation } from "@/lib/api/use-api";
import { cn, formatDate } from "@/lib/utils";
import {
  avancement,
  LIBELLE_JEUNE,
  PIPELINE,
  PIPELINE_LABELS,
  STATUT_ICONE,
  STATUT_TON,
} from "./pipeline";
import { suivi } from "./suivi";

export function LigneCandidature({
  candidature,
  onChanged,
}: {
  candidature: ApiCandidature;
  onChanged: () => void;
}) {
  const { offre } = candidature;
  const etat = avancement(candidature.status);
  const { action, signal, retirable } = suivi(candidature);

  const [detailsOuverts, setDetailsOuverts] = useState(false);
  /** Deux temps pour le retrait : un clic isolé ne doit pas suffire. */
  const [confirmeRetrait, setConfirmeRetrait] = useState(false);
  const retrait = useMutation(api.candidatures.withdraw);

  const aDesDetails = Boolean(candidature.message || candidature.cv);

  return (
    <Card className="transition-shadow hover:shadow-level-1">
      <CardBody className="space-y-3">
        <div className="flex items-start gap-3">
          {/* Logo réel de l'entreprise : c'est le repère par lequel on
              reconnaît une candidature dans une liste. */}
          <Avatar
            src={offre.entreprise.logo}
            alt={offre.entreprise.nom}
            size={44}
            className="rounded-lg"
          />

          <div className="min-w-0 flex-1">
            {/* Titre de niveau 2 : chaque candidature est une entrée que le
                lecteur d'écran doit pouvoir atteindre directement. */}
            <h2 className="font-bold">
              <Link
                href={`/espace-jeune/offres/${offre.id}`}
                className="text-primary hover:underline"
              >
                {offre.titre}
              </Link>
            </h2>
            <p className="truncate text-sm text-on-surface-variant">
              {offre.entreprise.nom} · {offre.ville}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Etiquette icon="work">{offre.type}</Etiquette>
              <Etiquette icon="laptop">{offre.mode}</Etiquette>
            </div>
          </div>

          <Badge
            tone={STATUT_TON[candidature.status]}
            icon={STATUT_ICONE[candidature.status]}
            className="shrink-0"
          >
            {LIBELLE_JEUNE[candidature.status]}
          </Badge>
        </div>

        <div className="space-y-1 border-t border-outline-variant pt-3">
          <Rail etat={etat} />
          <p className="text-xs text-on-surface-variant">
            <span title={formatDate(candidature.createdAt)}>
              Envoyée {formatRelative(candidature.createdAt).toLowerCase()}
            </span>
            {/* Accusé de lecture : le seul signe tangible que la candidature
                n'est pas restée lettre morte. */}
            {candidature.vueLe && <> · Lue {formatRelative(candidature.vueLe).toLowerCase()}</>}
          </p>
        </div>

        {signal && (
          <p
            className={cn(
              "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
              signal.ton === "alerte"
                ? "bg-error-container text-error"
                : "bg-surface-container text-on-surface-variant",
            )}
          >
            <Icon name={signal.icon} className="mt-0.5 shrink-0 text-[14px]" />
            {signal.texte}
          </p>
        )}

        {detailsOuverts && (
          <div className="space-y-2 rounded-lg bg-surface-container-low p-3">
            <p className="text-xs font-semibold text-on-surface-variant">Ce que vous avez envoyé</p>
            {candidature.message ? (
              <p className="whitespace-pre-line text-sm italic text-on-surface">
                « {candidature.message} »
              </p>
            ) : (
              <p className="text-sm text-on-surface-variant">Aucun message d&apos;accompagnement.</p>
            )}
            {candidature.cv && (
              <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Icon name="description" className="text-[15px]" />
                {candidature.cv.filename}
              </p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Icon name="event" className="text-[15px]" />
              Offre ouverte jusqu&apos;au {formatDate(offre.dateLimite)}
            </p>
          </div>
        )}

        {retrait.error && <ErrorBanner error={retrait.error} />}

        <div className="flex flex-wrap items-center gap-2">
          {action && (
            <ButtonLink href={action.href} variant={action.urgent ? "secondary" : "outline"} size="sm">
              <Icon name={action.icon} className="text-[16px]" /> {action.libelle}
            </ButtonLink>
          )}

          {aDesDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailsOuverts((ouvert) => !ouvert)}
              aria-expanded={detailsOuverts}
            >
              Ma candidature
              <Icon
                name="expand_more"
                className={cn("text-[18px] transition-transform", detailsOuverts && "rotate-180")}
              />
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {retirable &&
              (confirmeRetrait ? (
                <>
                  {/* Le retrait n'est pas définitif — l'API réactive le dossier
                      si l'on repostule — mais il prévient le recruteur : deux
                      temps suffisent, une modale serait de trop. */}
                  <span className="text-xs text-on-surface-variant">Retirer ?</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={retrait.pending}
                    onClick={() => setConfirmeRetrait(false)}
                  >
                    Non
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={retrait.pending}
                    onClick={() => {
                      void retrait.run(candidature.id).then((fait) => {
                        if (fait) onChanged();
                      });
                    }}
                  >
                    {retrait.pending ? "Retrait…" : "Oui, retirer"}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmeRetrait(true)}>
                  <Icon name="undo" className="text-[16px]" /> Retirer
                </Button>
              ))}

            {!action && !retirable && (
              <ButtonLink href={`/espace-jeune/offres/${offre.id}`} variant="ghost" size="sm">
                Voir l&apos;offre <Icon name="arrow_forward" className="text-[16px]" />
              </ButtonLink>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Etiquette({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 text-xs font-medium text-on-surface-variant">
      <Icon name={icon} className="text-[13px]" />
      {children}
    </span>
  );
}

/**
 * Rail d'avancement, en segments plutôt qu'en pastilles numérotées.
 *
 * Quatre segments fins tiennent sur une ligne, là où les pastilles et leurs
 * libellés en occupaient trois — pour la même information. L'étape atteinte est
 * nommée à côté, ce qui évite d'avoir à compter les segments.
 */
function Rail({ etat }: { etat: ReturnType<typeof avancement> }) {
  if (etat.close) {
    return (
      <p className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
        <Icon name="do_not_disturb_on" className="text-[14px]" /> Candidature clôturée
      </p>
    );
  }

  const courante = PIPELINE[Math.min(etat.franchies, PIPELINE.length) - 1];

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={etat.franchies}
        aria-valuemin={0}
        aria-valuemax={PIPELINE.length}
        aria-label={`Avancement : ${etat.franchies} étape${etat.franchies > 1 ? "s" : ""} sur ${PIPELINE.length}`}
      >
        {PIPELINE.map((etape, index) => (
          <span
            key={etape}
            className={cn(
              "h-1.5 w-7 rounded-full transition-colors",
              index < etat.franchies
                ? etat.aboutie
                  ? "bg-success"
                  : "bg-secondary-container"
                : "bg-surface-variant",
            )}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-primary">
        {etat.aboutie ? "Acceptée" : courante ? PIPELINE_LABELS[courante] : ""}
      </span>
    </div>
  );
}
