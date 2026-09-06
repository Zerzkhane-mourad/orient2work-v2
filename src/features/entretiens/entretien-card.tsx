"use client";

import { useState } from "react";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  ErrorBanner,
  Icon,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { ApiEntretien } from "@/lib/api/types";
import { useMutation } from "@/lib/api/use-api";
import { formatDate } from "@/lib/utils";
import { LienReunionModal } from "./lien-reunion-modal";

interface EntretienCardProps {
  entretien: ApiEntretien;
  /** Whose perspective — controls the title and available actions. */
  viewer: "jeune" | "entreprise" | "admin";
  onChanged?: () => void;
}

/**
 * Carte d'entretien avec ses actions contextuelles.
 *
 * Répartition des droits, imposée par le backend : répond la partie qui n'a PAS
 * pris l'initiative.
 *  • entretien proposé par l'entreprise → le JEUNE accepte ou refuse ;
 *  • candidature spontanée → le jeune a réservé, l'ENTREPRISE tranche.
 *
 * L'entreprise peut par ailleurs replanifier ou annuler dans les deux cas.
 * L'admin est en lecture seule.
 */
export function EntretienCard({ entretien, viewer, onChanged }: EntretienCardProps) {
  const respond = useMutation(api.entretiens.respond);
  const update = useMutation(api.entretiens.update);
  /** Modale ouverte : acceptation avec lien, ou pose du lien seul. `null` = fermée. */
  const [modale, setModale] = useState<"accepter" | "lien" | null>(null);

  const counterpart =
    viewer === "jeune"
      ? entretien.entreprise.nom
      : `${entretien.jeune.prenom} ${entretien.jeune.nom}`;

  const pending = respond.pending || update.pending;

  /**
   * Qui doit répondre à cette demande.
   *
   * Miroir de la règle serveur : l'initiateur attend, l'autre partie tranche.
   * Une candidature spontanée est réservée par le jeune, c'est donc
   * l'entreprise qui accepte ou décline.
   */
  const doitRepondre = entretien.spontanee ? viewer === "entreprise" : viewer === "jeune";
  const error = respond.error ?? update.error;

  const act = (promise: Promise<unknown>) => {
    void promise.then((result) => {
      if (result) onChanged?.();
    });
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-20 flex-col items-center rounded-lg bg-surface-container px-4 py-2 text-center">
            <span className="text-xs font-bold uppercase text-on-surface-variant">
              {new Date(entretien.date).toLocaleDateString("fr-FR", {
                month: "short",
                timeZone: "UTC",
              })}
            </span>
            <span className="font-headline text-2xl font-bold text-primary">
              {new Date(entretien.date).getUTCDate()}
            </span>
            <span className="text-xs text-on-surface-variant">{entretien.heure}</span>
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-primary">{counterpart}</h3>
              <StatusBadge kind="entretien" status={entretien.status} />
              {/* Origine de la demande : le recruteur doit savoir qu'il traite
                  une sollicitation directe, sans offre ni candidature derrière. */}
              {entretien.spontanee && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-on-secondary-container">
                  <Icon name="handshake" className="text-[13px]" />
                  Candidature spontanée
                </span>
              )}
              {viewer === "admin" && (
                <span className="text-xs text-on-surface-variant">
                  · {entretien.entreprise.nom}
                </span>
              )}
            </div>
            <p className="text-sm text-on-surface-variant">{entretien.offreTitre}</p>
            <p className="flex items-center gap-1 text-xs text-on-surface-variant">
              <Icon name="event" className="text-[15px]" /> {formatDate(entretien.date)} à{" "}
              {entretien.heure}
            </p>
            {entretien.commentaire && (
              <p className="text-xs italic text-on-surface-variant">« {entretien.commentaire} »</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Le lien de visio n'est renvoyé par l'API qu'une fois l'entretien accepté. */}
            {entretien.lienReunion && (
              <ButtonLink
                href={entretien.lienReunion}
                variant="secondary"
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="video_call" className="text-[18px]" /> Rejoindre
              </ButtonLink>
            )}

            {/*
              Répond celui qui n'a PAS pris l'initiative : le candidat sur un
              entretien proposé par l'entreprise, l'entreprise sur une
              candidature spontanée. La carte n'offrait ces boutons qu'au
              candidat — l'entreprise ne pouvait pas traiter les demandes
              spontanées, et le candidat pouvait « accepter » la sienne.
            */}
            {doitRepondre && entretien.status === "en_attente" && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  /*
                   * L'entreprise passe par la modale : accepter une candidature
                   * spontanée est sa SEULE occasion naturelle de fournir le lien
                   * de visio, le rendez-vous ayant été créé par le candidat.
                   * Le candidat, lui, accepte d'un clic — il n'a rien à fournir.
                   */
                  onClick={() =>
                    entretien.spontanee
                      ? setModale("accepter")
                      : act(respond.run(entretien.id, "accepte"))
                  }
                >
                  Accepter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => act(respond.run(entretien.id, "refuse"))}
                >
                  Refuser
                </Button>
              </>
            )}

            {/*
              Un entretien confirmé sans lien n'est joignable nulle part : le
              rappel envoyé une heure avant partirait sans bouton « rejoindre ».
              L'entreprise doit donc pouvoir le poser — ou le corriger, une
              salle de visio pouvant expirer — après l'acceptation.
            */}
            {viewer === "entreprise" && entretien.status === "accepte" && (
              <Button
                variant={entretien.lienReunion ? "ghost" : "outline"}
                size="sm"
                disabled={pending}
                onClick={() => setModale("lien")}
              >
                <Icon name="video_call" className="text-[18px]" />
                {entretien.lienReunion ? "Modifier le lien" : "Ajouter le lien"}
              </Button>
            )}

            {viewer === "entreprise" && entretien.status !== "annule" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => act(update.run(entretien.id, { status: "annule" }))}
              >
                Annuler
              </Button>
            )}
          </div>
        </div>

        {/* L'erreur de la modale s'affiche DANS la modale ; ne reste ici que
            celle des actions directes, qui n'ont pas d'autre endroit où aller. */}
        {error && !modale && <ErrorBanner error={error} />}
      </CardBody>

      <LienReunionModal
        open={modale !== null}
        intention={modale ?? "lien"}
        interlocuteur={counterpart}
        quand={`${formatDate(entretien.date)} à ${entretien.heure}`}
        {...(entretien.lienReunion ? { lienActuel: entretien.lienReunion } : {})}
        pending={pending}
        error={error}
        onClose={() => setModale(null)}
        onSubmit={(reponse) => {
          const envoi =
            modale === "accepter"
              ? respond.run(entretien.id, "accepte", reponse)
              : update.run(entretien.id, reponse);

          void envoi.then((resultat) => {
            // Fermée seulement en cas de succès : sur une URL refusée, la
            // modale doit rester ouverte avec la saisie et le message d'erreur.
            if (!resultat) return;
            setModale(null);
            onChanged?.();
          });
        }}
      />
    </Card>
  );
}
