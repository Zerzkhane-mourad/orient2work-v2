"use client";

/**
 * Une candidature, dans le suivi du candidat.
 *
 * Deux zones, comme une fiche de suivi :
 *  • à gauche, CE QUE L'ON SUIT — l'offre, l'entreprise, et surtout le rail
 *    d'avancement, étape par étape et nommée, et non quatre segments muets
 *    qu'il fallait compter ;
 *  • à droite, L'OFFRE EN BREF — mode, lieu, niveau, postes, date limite :
 *    ce qu'on vient revérifier avant un entretien sans rouvrir l'annonce.
 *
 * Trois manques que l'ancienne fiche comblait déjà, et qu'on garde :
 *
 *  • UNE ACTION quand il y en a une — « Entretien proposé » renvoie à l'écran
 *    où l'invitation attend sa réponse ;
 *  • LA TRACE DE L'ENVOI — message et CV, repliés par défaut : c'est une
 *    information de vérification, consultée une fois ;
 *  • LE RETRAIT, en deux temps, sans rouvrir la fiche de l'offre.
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
import { BadgeType, CompetencesApercu, Repere } from "@/features/offres/presentation";
import { api } from "@/lib/api";
import type { ApiCandidature } from "@/lib/api/types";
import { useMutation } from "@/lib/api/use-api";
import { cn, formatDate } from "@/lib/utils";
import { avancement, LIBELLE_JEUNE, PIPELINE, STATUT_ICONE, STATUT_TON } from "./pipeline";
import { etatEntretien, suivi } from "./suivi";

/**
 * Teinte du liseré, par statut. Table exhaustive : un nouveau statut ne compile
 * pas tant qu'on n'a pas dit de quelle couleur il est.
 */
const LISERE: Record<ApiCandidature["status"], string> = {
  envoyee: "bg-primary/40",
  vue: "bg-primary/70",
  preselectionnee: "bg-primary",
  entretien: "bg-secondary-container",
  acceptee: "bg-success",
  refusee: "bg-error",
  retiree: "bg-outline",
};

export function LigneCandidature({
  candidature,
  onChanged,
}: {
  candidature: ApiCandidature;
  onChanged: () => void;
}) {
  const { offre } = candidature;
  const { action, signal, retirable } = suivi(candidature);
  /*
   * Invitation tranchée (acceptée, déclinée, annulée) : le statut reste
   * `entretien`, mais plus rien n'attend le candidat. Libellé, pastille et
   * liseré le disent — l'or « à vous de répondre » ne reste que tant qu'une
   * réponse est due.
   */
  const apresReponse = etatEntretien(candidature);

  const [detailsOuverts, setDetailsOuverts] = useState(false);
  /** Deux temps pour le retrait : un clic isolé ne doit pas suffire. */
  const [confirmeRetrait, setConfirmeRetrait] = useState(false);
  const retrait = useMutation(api.candidatures.withdraw);

  const aDesDetails = Boolean(candidature.message || candidature.cv);
  const hrefOffre = `/espace-jeune/offres/${offre.id}`;

  return (
    <Card className="group relative overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-level-2">
      {/* Liseré d'état, aux couleurs des onglets : la liste se lit d'un coup
          d'œil, et l'or signale ce qui attend une réponse de VOUS. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 z-10 w-1 transition-[width] duration-200 group-hover:w-1.5",
          apresReponse?.lisere ?? LISERE[candidature.status],
        )}
      />
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_15rem]">
        <CardBody className="space-y-4 p-4 sm:p-6">
          {/* Étiquettes et statut — le statut à la place du « favori » de la
              maquette : ici, c'est la nouvelle que l'on vient chercher. */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <BadgeType type={offre.type} />
              {offre.filiere && <Badge tone="primary">{offre.filiere}</Badge>}
            </div>
            <Badge
              tone={apresReponse?.ton ?? STATUT_TON[candidature.status]}
              icon={apresReponse?.icon ?? STATUT_ICONE[candidature.status]}
              className="shrink-0"
            >
              {apresReponse?.libelle ?? LIBELLE_JEUNE[candidature.status]}
            </Badge>
          </div>

          <div className="space-y-2">
            {/* Titre de niveau 2 : chaque candidature est une entrée que le
                lecteur d'écran doit pouvoir atteindre directement. */}
            <h2 className="text-balance font-headline text-lg font-bold leading-snug sm:text-xl">
              <Link href={hrefOffre} className="text-primary hover:underline">
                {offre.titre}
              </Link>
            </h2>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <CompetencesApercu competences={offre.competences} />
              <p className="text-sm text-on-surface-variant">
                Candidature du{" "}
                <span className="font-semibold text-on-surface">
                  {formatDate(candidature.createdAt)}
                </span>
              </p>
            </div>
          </div>

          {/* L'entreprise : son logo est le repère par lequel on reconnaît une
              candidature dans une liste. */}
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar
              src={offre.entreprise.logo}
              alt={offre.entreprise.nom}
              size={64}
              className="shrink-0 rounded-xl border border-outline-variant"
            />
            <div className="min-w-0">
              <p className="truncate font-bold text-on-surface">{offre.entreprise.nom}</p>
              {offre.apercu && (
                <p className="line-clamp-3 text-sm text-on-surface-variant">{offre.apercu}</p>
              )}
            </div>
          </div>

          <RailSuivi candidature={candidature} />

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
              <p className="text-xs font-semibold text-on-surface-variant">
                Ce que vous avez envoyé
              </p>
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
            </div>
          )}

          {retrait.error && <ErrorBanner error={retrait.error} />}

          <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
            {action && (
              <ButtonLink
                href={action.href}
                variant={action.urgent ? "secondary" : "outline"}
                size="sm"
              >
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

            {retirable &&
              (confirmeRetrait ? (
                <span className="flex items-center gap-2">
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
                </span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmeRetrait(true)}>
                  <Icon name="undo" className="text-[16px]" /> Retirer
                </Button>
              ))}

            <Link
              href={hrefOffre}
              className="ml-auto inline-flex min-h-11 items-center gap-1 font-bold text-primary hover:underline"
            >
              Voir cette offre <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
        </CardBody>

        {/* L'offre en bref. Deux colonnes sur téléphone : empilés, ces cinq
            repères doublaient la hauteur de la carte pour une ligne chacun. */}
        <aside
          aria-label="L'offre en bref"
          className="border-t border-outline-variant bg-surface-container-low p-4 sm:p-6 md:border-l md:border-t-0"
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-1">
            <Repere icon="laptop" terme="Mode de travail">
              {offre.mode}
            </Repere>
            <Repere icon="location_on" terme="Lieu">
              {offre.ville}
            </Repere>
            <Repere icon="school" terme="Niveau demandé">
              {offre.niveauDemande}
            </Repere>
            <Repere icon="groups" terme="Postes">
              {offre.nombrePostes} poste{offre.nombrePostes > 1 ? "s" : ""}
            </Repere>
            <Repere icon="event" terme="Date limite">
              {formatDate(offre.dateLimite)}
            </Repere>
          </dl>
        </aside>
      </div>
    </Card>
  );
}

/* ── Rail d'avancement ────────────────────────────────────────────────────── */

type EtatEtape = "franchie" | "actuelle" | "a_venir" | "acceptee" | "non_retenue" | "retiree";

interface Etape {
  libelle: string;
  icon: IconName;
  etat: EtatEtape;
}

const ETAPES: Record<(typeof PIPELINE)[number], { libelle: string; icon: IconName }> = {
  envoyee: { libelle: "Envoyée", icon: "send" },
  vue: { libelle: "Consultée", icon: "visibility" },
  preselectionnee: { libelle: "Présélection", icon: "star" },
  entretien: { libelle: "Entretien", icon: "event_available" },
};

/**
 * Les cinq étapes du rail : les quatre du parcours, puis l'issue.
 *
 * Une candidature close ne dit plus jusqu'où elle était allée — son statut a
 * été remplacé. On ne montre donc franchi que ce qui est ATTESTÉ : l'envoi, et
 * la lecture quand `vueLe` existe. Le reste reste gris plutôt que d'être
 * deviné.
 */
function etapesDe(candidature: ApiCandidature): Etape[] {
  const { status } = candidature;
  const etat = avancement(status);

  const franchies = etat.close ? (candidature.vueLe ? 2 : 1) : etat.franchies;

  const parcours: Etape[] = PIPELINE.map((cle, index) => ({
    ...ETAPES[cle],
    etat:
      index < franchies
        ? index === franchies - 1 && !etat.close && !etat.aboutie
          ? "actuelle"
          : "franchie"
        : "a_venir",
  }));

  const issue: Etape =
    status === "refusee"
      ? { libelle: "Non retenue", icon: "close", etat: "non_retenue" }
      : status === "retiree"
        ? { libelle: "Retirée", icon: "undo", etat: "retiree" }
        : {
            libelle: "Acceptée",
            icon: "verified",
            etat: etat.aboutie ? "acceptee" : "a_venir",
          };

  return [...parcours, issue];
}

const PASTILLE: Record<EtatEtape, string> = {
  franchie: "bg-primary text-on-primary",
  actuelle: "bg-primary text-on-primary ring-4 ring-primary/15",
  a_venir: "bg-surface-container-high text-on-surface-variant/70",
  acceptee: "bg-success text-white ring-4 ring-success/20",
  non_retenue: "bg-error text-white ring-4 ring-error/15",
  retiree: "bg-surface-container-highest text-on-surface-variant",
};

const LIBELLE: Record<EtatEtape, string> = {
  franchie: "text-primary",
  actuelle: "text-primary",
  a_venir: "text-on-surface-variant",
  acceptee: "text-success",
  non_retenue: "text-error",
  retiree: "text-on-surface-variant",
};

/** Ce que l'étape signifie pour un lecteur d'écran, qui ne voit pas la teinte. */
const ANNONCE: Record<EtatEtape, string> = {
  franchie: "étape franchie",
  actuelle: "étape actuelle",
  a_venir: "à venir",
  acceptee: "issue",
  non_retenue: "issue",
  retiree: "issue",
};

/**
 * Rail en pastilles nommées, reliées par un trait.
 *
 * Le trait entre deux étapes prend la couleur du parcours dès que l'étape
 * suivante est atteinte : on lit d'un coup d'œil jusqu'où le dossier est allé.
 */
function RailSuivi({ candidature }: { candidature: ApiCandidature }) {
  const etapes = etapesDe(candidature);

  return (
    <ol aria-label="Avancement de la candidature" className="flex pt-1">
      {etapes.map((etape, index) => {
        const suivante = etapes[index + 1];
        // Les DEUX bouts doivent être atteints : un dossier refusé après lecture
        // ne relie pas « Entretien », jamais atteint, à son issue.
        const traitActif =
          suivante !== undefined && etape.etat !== "a_venir" && suivante.etat !== "a_venir";
        return (
          <li
            key={etape.libelle}
            aria-current={etape.etat === "actuelle" ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
          >
            {suivante && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-1/2 top-[18px] h-[3px] w-full -translate-y-1/2",
                  traitActif ? "bg-primary" : "bg-surface-container-high",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                PASTILLE[etape.etat],
              )}
            >
              <Icon name={etape.icon} className="text-[18px]" />
            </span>
            <span
              className={cn(
                "px-0.5 text-[11px] font-semibold leading-tight sm:text-xs",
                LIBELLE[etape.etat],
              )}
            >
              {etape.libelle}
              <span className="sr-only"> — {ANNONCE[etape.etat]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
