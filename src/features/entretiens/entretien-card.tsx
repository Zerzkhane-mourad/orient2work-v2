"use client";

import { useState } from "react";
import Link from "next/link";
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
import { cn, formatDate } from "@/lib/utils";
import { LienReunionModal } from "./lien-reunion-modal";

type Situation = "a_repondre" | "confirme" | "tombe" | "attente";

const LISERE: Record<Situation, string> = {
  a_repondre: "bg-secondary-container",
  confirme: "bg-success",
  tombe: "bg-error/70",
  attente: "bg-outline-variant",
};

const PAVE_DATE: Record<Situation, string> = {
  a_repondre: "bg-secondary-container text-on-secondary-container",
  confirme: "bg-success-container text-on-success-container",
  tombe:
    "bg-surface-container text-on-surface-variant line-through decoration-1",
  attente: "bg-primary/10 text-primary",
};

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
export function EntretienCard({
  entretien,
  viewer,
  onChanged,
}: EntretienCardProps) {
  const respond = useMutation(api.entretiens.respond);
  const update = useMutation(api.entretiens.update);
  const retirer = useMutation(api.entretiens.retirer);
  /** Modale ouverte : acceptation avec lien, ou pose du lien seul. `null` = fermée. */
  const [modale, setModale] = useState<"accepter" | "lien" | null>(null);

  const counterpart =
    viewer === "jeune"
      ? entretien.entreprise.nom
      : `${entretien.jeune.prenom} ${entretien.jeune.nom}`;

  const pending = respond.pending || update.pending || retirer.pending;

  /**
   * Qui doit répondre à cette demande.
   *
   * Miroir de la règle serveur : l'initiateur attend, l'autre partie tranche.
   * Une candidature spontanée est réservée par le jeune, c'est donc
   * l'entreprise qui accepte ou décline.
   */
  const doitRepondre = entretien.spontanee
    ? viewer === "entreprise"
    : viewer === "jeune";

  /**
   * Le candidat peut RENONCER à sa propre demande spontanée, tant qu'elle n'a
   * pas été tranchée.
   *
   * Sans cela, une erreur de créneau l'enfermait jusqu'à la réponse du
   * recruteur : une seule réservation active étant permise par entreprise, il
   * ne pouvait ni corriger, ni réserver ailleurs chez elle. Le créneau
   * redevient libre pour les autres candidats.
   */
  const peutRetirer =
    viewer === "jeune" &&
    entretien.spontanee &&
    entretien.status === "en_attente";

  const error = respond.error ?? update.error ?? retirer.error;

  const act = (promise: Promise<unknown>) => {
    void promise.then((result) => {
      if (result) onChanged?.();
    });
  };

  /*
   * Une teinte par SITUATION, du point de vue de celui qui lit — et non par
   * statut brut : or quand une réponse est attendue de LUI, vert quand le
   * rendez-vous est confirmé, rouge quand il est tombé, neutre quand il attend
   * l'autre partie. Liseré et pavé de date la portent ensemble : la liste se
   * trie d'un coup d'œil, avant même les libellés.
   */
  const situation: Situation =
    entretien.status === "accepte"
      ? "confirme"
      : entretien.status === "refuse" || entretien.status === "annule"
        ? "tombe"
        : doitRepondre
          ? "a_repondre"
          : "attente";

  return (
    <Card className="relative overflow-hidden transition-shadow duration-200 hover:shadow-level-2">
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", LISERE[situation])}
      />
      <CardBody className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className={cn(
              "flex min-w-20 flex-row items-center justify-center gap-3 rounded-xl px-4 py-2 text-center sm:flex-col sm:gap-0",
              PAVE_DATE[situation],
            )}
          >
            <span className="text-xs font-bold uppercase opacity-80">
              {new Date(entretien.date).toLocaleDateString("fr-FR", {
                month: "short",
                timeZone: "UTC",
              })}
            </span>
            <span className="font-headline text-2xl font-bold leading-tight">
              {new Date(entretien.date).getUTCDate()}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold opacity-90">
              <Icon name="schedule" className="text-[13px]" />
              {entretien.heure}
            </span>
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
            {/*
              Sur une candidature spontanée, `offreTitre` vaut « Candidature
              spontanée » — déjà dit par la pastille juste au-dessus. Le titre
              du candidat renseigne bien davantage le recruteur qui doit
              trancher sans offre ni dossier de candidature derrière.
            */}
            <p className="text-sm text-on-surface-variant">
              {entretien.spontanee && viewer !== "jeune"
                ? entretien.jeune.titre || entretien.offreTitre
                : entretien.offreTitre}
            </p>
            <p className="flex items-center gap-1 text-xs text-on-surface-variant">
              <Icon name="event" className="text-[15px]" />{" "}
              {formatDate(entretien.date)} à {entretien.heure}
            </p>
            {/* Consulter le profil AVANT de répondre : c'est la seule matière
                dont dispose le recruteur sur une sollicitation directe. */}
            {viewer === "entreprise" && (
              <Link
                href={`/espace-entreprise/talents/${entretien.jeune.id}`}
                className="inline-flex items-center gap-1 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <Icon name="person_search" className="text-[15px]" /> Voir le
                profil
              </Link>
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
                onClick={() =>
                  act(update.run(entretien.id, { status: "annule" }))
                }
              >
                Annuler
              </Button>
            )}

            {/* Le retrait libère un créneau réservé chez un tiers : il se
                confirme, un clic accidentel ne doit pas le déclencher. */}
            {peutRetirer && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Retirer votre demande auprès de ${entretien.entreprise.nom} ? Le créneau du ${formatDate(entretien.date)} à ${entretien.heure} sera rendu aux autres candidats.`,
                    )
                  ) {
                    return;
                  }
                  act(retirer.run(entretien.id));
                }}
              >
                {retirer.pending ? "Retrait…" : "Retirer ma demande"}
              </Button>
            )}
          </div>
        </div>

        {/*
          Le message du candidat sort de la colonne du milieu, où il se
          réduisait à une ligne d'italique de 12px coincée sous la date. Sur une
          candidature spontanée, c'est pourtant la seule chose que le candidat
          ait écrite — et ce sur quoi le recruteur va décider.
        */}
        {entretien.commentaire && (
          <blockquote className="flex gap-2 rounded-r-lg border-l-4 border-secondary-container bg-secondary-container/20 px-3 py-2 text-sm text-on-surface">
            <Icon
              name="format_quote"
              className="mt-0.5 shrink-0 text-[16px] text-secondary"
            />
            <span className="min-w-0">{entretien.commentaire}</span>
          </blockquote>
        )}

        {/* L'erreur de la modale s'affiche DANS la modale ; ne reste ici que
            celle des actions directes, qui n'ont pas d'autre endroit où aller. */}
        {error && !modale && <ErrorBanner error={error} />}
      </CardBody>

      <LienReunionModal
        open={modale !== null}
        intention={modale ?? "lien"}
        interlocuteur={counterpart}
        quand={`${formatDate(entretien.date)} à ${entretien.heure}`}
        {...(entretien.lienReunion
          ? { lienActuel: entretien.lienReunion }
          : {})}
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
