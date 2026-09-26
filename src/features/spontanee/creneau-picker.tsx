"use client";

/**
 * Choix d'un créneau, à la manière de Calendly.
 *
 * Trois temps : on choisit un JOUR parmi ceux qui restent ouverts, puis une
 * HEURE dans ce jour, puis on confirme. Dérouler toutes les heures de plusieurs
 * semaines d'un seul tenant donnerait une liste illisible, alors que le jour se
 * choisit d'abord dans la tête.
 *
 * Les créneaux sont CALCULÉS par le serveur à chaque chargement : ce que
 * l'écran propose reflète l'état au moment de l'affichage, et la réservation
 * revérifie de toute façon.
 *
 * ── Ce que le pas à pas ne montrait pas ─────────────────────────────────────
 *
 *  • Le bouton de confirmation restait désactivé sans jamais dire ce qui
 *    manquait — le choix de l'heure, deux blocs plus haut, hors du regard sur
 *    un téléphone.
 *  • Les heures ne se distinguaient pas du matin au soir : une journée de
 *    vingt-quatre créneaux formait un mur de pastilles identiques.
 *  • Le message, non numéroté, se lisait comme une formalité détachée des deux
 *    étapes, alors qu'il part avec la demande.
 */
import { useState } from "react";
import { Button, ErrorBanner, Icon, Textarea } from "@/components/ui";
import type { ApiCalendrierSpontanee } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface CreneauPickerProps {
  calendrier: ApiCalendrierSpontanee;
  pending: boolean;
  error: unknown;
  onReserver: (choix: { date: string; heure: string; message?: string }) => void;
}

/** « lundi 17 août » — le jour de la semaine porte l'essentiel du repérage. */
function libelleJour(iso: string): string {
  // Minuit UTC, comme la date renvoyée : évite de basculer la veille au
  // formatage dans un fuseau négatif.
  const date = new Date(`${iso}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

/** Moment de la journée : sépare un mur de pastilles en trois blocs lisibles. */
function demiJournee(heure: string): "Matin" | "Après-midi" | "Soir" {
  const h = Number(heure.slice(0, 2));
  if (h < 12) return "Matin";
  return h < 18 ? "Après-midi" : "Soir";
}

const ORDRE_MOMENTS = ["Matin", "Après-midi", "Soir"] as const;

/** Intitulé d'étape, numéroté — l'écran se lit comme une marche à suivre. */
function Etape({
  numero,
  titre,
  precision,
  children,
}: {
  numero: number;
  titre: string;
  precision?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold tabular-nums text-on-primary">
          {numero}
        </span>
        <h3 className="text-sm font-bold text-on-surface">{titre}</h3>
        {precision && <span className="text-xs text-on-surface-variant">{precision}</span>}
      </div>
      {children}
    </section>
  );
}

export function CreneauPicker({ calendrier, pending, error, onReserver }: CreneauPickerProps) {
  const { journees, entreprise } = calendrier;
  const [jourActif, setJourActif] = useState(journees[0]?.date ?? "");
  const [heure, setHeure] = useState("");
  const [message, setMessage] = useState("");

  const journee = journees.find((j) => j.date === jourActif) ?? journees[0];

  if (journees.length === 0) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
        <Icon name="event_busy" className="mt-0.5 shrink-0 text-[18px]" />
        Aucun créneau libre pour le moment. Les disponibilités sont republiées chaque semaine —
        revenez d&apos;ici quelques jours.
      </p>
    );
  }

  /** Heures du jour retenu, groupées par moment, dans l'ordre naturel. */
  const moments = ORDRE_MOMENTS.map((moment) => ({
    moment,
    heures: (journee?.creneaux ?? []).filter((h) => demiJournee(h) === moment),
  })).filter((bloc) => bloc.heures.length > 0);

  const pret = Boolean(heure && journee);

  return (
    <div className="space-y-5">
      <Etape numero={1} titre="Choisissez un jour">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {journees.map((j) => {
            const actif = j.date === journee?.date;
            return (
              <button
                key={j.date}
                type="button"
                onClick={() => {
                  setJourActif(j.date);
                  // L'heure retenue appartenait au jour précédent.
                  setHeure("");
                }}
                aria-current={actif ? "true" : undefined}
                className={cn(
                  "min-h-14 rounded-xl border-2 px-3 py-2 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
                  actif
                    ? "border-primary bg-primary/[0.04]"
                    : "border-outline-variant hover:border-primary hover:bg-surface-container-low",
                )}
              >
                <span
                  className={cn(
                    "block text-sm font-semibold first-letter:uppercase",
                    actif ? "text-primary" : "text-on-surface",
                  )}
                >
                  {libelleJour(j.date)}
                </span>
                <span className="block text-xs text-on-surface-variant">
                  {j.creneaux.length} créneau{j.creneaux.length > 1 ? "x" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </Etape>

      {journee && (
        <Etape
          numero={2}
          titre="Choisissez une heure"
          precision={`échange de ${entreprise.creneauDureeMin} min`}
        >
          <div
            role="radiogroup"
            aria-label={`Créneaux du ${libelleJour(journee.date)}`}
            className="space-y-3"
          >
            {moments.map((bloc) => (
              <div key={bloc.moment} className="space-y-1.5">
                {/* Un seul bloc : l'intitulé n'apprendrait rien de plus que les
                    heures elles-mêmes. */}
                {moments.length > 1 && (
                  <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    {bloc.moment}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {bloc.heures.map((h) => {
                    const actif = h === heure;
                    return (
                      <button
                        key={h}
                        type="button"
                        role="radio"
                        aria-checked={actif}
                        onClick={() => setHeure(h)}
                        className={cn(
                          "min-h-11 min-w-20 rounded-lg border-2 px-3 text-sm font-semibold transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
                          actif
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline-variant text-on-surface hover:border-primary",
                        )}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Etape>
      )}

      <Etape numero={3} titre="Présentez-vous" precision="facultatif">
        <Textarea
          aria-label="Message à l'entreprise"
          rows={3}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ce qui vous intéresse chez eux, ce que vous cherchez…"
          hint={`${message.length}/1000 caractères — c'est souvent ce que le recruteur lit en premier.`}
        />
      </Etape>

      {error != null && <ErrorBanner error={error} />}

      {/*
        Récapitulatif et bouton dans le même bloc : la confirmation porte sur
        une date choisie deux étapes plus haut, hors du champ de vision. Tant
        qu'il manque une heure, le bloc le DIT — un bouton grisé sans explication
        laisse chercher ce qui bloque.
      */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border p-3",
          pret ? "border-primary bg-primary/[0.04]" : "border-outline-variant",
        )}
      >
        <Icon
          name={pret ? "event_available" : "schedule"}
          className={cn("text-[20px]", pret ? "text-primary" : "text-on-surface-variant")}
        />
        <p className="min-w-0 flex-1 text-sm">
          {pret ? (
            <span className="font-semibold text-on-surface first-letter:uppercase">
              {libelleJour(journee!.date)} à {heure}
            </span>
          ) : (
            <span className="text-on-surface-variant">
              Choisissez une heure pour confirmer votre demande.
            </span>
          )}
        </p>
        <Button
          variant="secondary"
          size="lg"
          disabled={!pret || pending}
          onClick={() =>
            journee &&
            onReserver({
              date: journee.date,
              heure,
              ...(message.trim() ? { message: message.trim() } : {}),
            })
          }
        >
          <Icon name="send" className="text-[18px]" />
          {pending ? "Envoi…" : "Confirmer ma demande"}
        </Button>
      </div>
    </div>
  );
}
