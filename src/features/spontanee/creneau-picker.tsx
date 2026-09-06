"use client";

/**
 * Choix d'un créneau, à la manière de Calendly.
 *
 * Deux temps : on choisit un JOUR parmi ceux qui restent ouverts, puis une
 * HEURE dans ce jour. Dérouler toutes les heures de plusieurs semaines d'un
 * seul tenant donnerait une liste illisible, alors que le jour se choisit
 * d'abord dans la tête.
 *
 * Les créneaux sont CALCULÉS par le serveur à chaque chargement : ce que
 * l'écran propose reflète l'état au moment de l'affichage, et la réservation
 * revérifie de toute façon.
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

  return (
    <div className="space-y-5">
      {/* ── Jours ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          1. Choisissez un jour
        </p>
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
      </div>

      {/* ── Heures ─────────────────────────────────────────────────────── */}
      {journee && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            2. Choisissez une heure ({entreprise.creneauDureeMin} min)
          </p>
          <div
            role="radiogroup"
            aria-label={`Créneaux du ${libelleJour(journee.date)}`}
            className="flex flex-wrap gap-2"
          >
            {journee.creneaux.map((h) => {
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
      )}

      {/* ── Message ────────────────────────────────────────────────────── */}
      <Textarea
        label="Message (facultatif)"
        rows={3}
        maxLength={1000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ce qui vous intéresse chez eux, ce que vous cherchez…"
        hint={`${message.length}/1000 caractères`}
      />

      {error != null && <ErrorBanner error={error} />}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="lg"
          disabled={!heure || pending}
          onClick={() =>
            journee &&
            onReserver({
              date: journee.date,
              heure,
              ...(message.trim() ? { message: message.trim() } : {}),
            })
          }
        >
          <Icon name="event_available" className="text-[18px]" />
          {pending ? "Envoi…" : "Confirmer ma demande"}
        </Button>

        {/* Rappel de ce qui va être envoyé : la confirmation porte sur une date
            choisie deux étapes plus haut, hors du champ de vision. */}
        {heure && journee && (
          <span className="text-sm text-on-surface-variant first-letter:uppercase">
            {libelleJour(journee.date)} à {heure}
          </span>
        )}
      </div>
    </div>
  );
}
