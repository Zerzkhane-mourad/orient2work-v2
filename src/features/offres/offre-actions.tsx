"use client";

import { useState } from "react";
import { Button, Card, CardBody, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

// Sample availability slots offered by the recruiter (§10).
const slots = [
  { day: "Lundi 21", times: ["10:00", "11:00"] },
  { day: "Mercredi 23", times: ["14:00", "15:00", "16:00"] },
  { day: "Vendredi 25", times: ["09:00", "10:00"] },
];

type ApplyState = "idle" | "applied" | "declined";

/** Candidature + demande d'entretien actions for a job offer. */
export function OffreActions() {
  const [apply, setApply] = useState<ApplyState>("idle");
  const [showSlots, setShowSlots] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  return (
    <Card>
      <CardBody className="space-y-4">
        <h3 className="font-bold text-primary">Intéressé par cette offre ?</h3>

        {apply === "applied" ? (
          <div className="flex items-center gap-2 rounded-lg bg-success-container px-4 py-3 text-sm font-semibold text-success">
            <Icon name="check_circle" filled /> Candidature envoyée à l&apos;entreprise.
          </div>
        ) : apply === "declined" ? (
          <div className="flex items-center gap-2 rounded-lg bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
            <Icon name="do_not_disturb_on" /> Marquée comme non intéressée.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="secondary" fullWidth onClick={() => setApply("applied")}>
              <Icon name="send" className="text-[18px]" /> Candidater
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setApply("declined")}>
              Non intéressé
            </Button>
          </div>
        )}

        <div className="border-t border-outline-variant pt-4">
          {requested ? (
            <div className="flex items-center gap-2 rounded-lg bg-warning-container px-4 py-3 text-sm font-semibold text-warning">
              <Icon name="schedule" /> Demande envoyée — en attente de confirmation.
            </div>
          ) : (
            <>
              <Button variant="outline" fullWidth onClick={() => setShowSlots((v) => !v)}>
                <Icon name="event" className="text-[18px]" /> Demander un entretien
              </Button>

              {showSlots && (
                <div className="mt-4 space-y-4">
                  <p className="text-sm font-semibold text-on-surface">Choisissez un créneau</p>
                  {slots.map((slot) => (
                    <div key={slot.day} className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                        {slot.day}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slot.times.map((time) => {
                          const id = `${slot.day} ${time}`;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setSelected(id)}
                              className={cn(
                                "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                                selected === id
                                  ? "border-secondary bg-secondary-container text-on-secondary-container"
                                  : "border-outline-variant hover:bg-surface-container-low",
                              )}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <Button variant="secondary" fullWidth disabled={!selected} onClick={() => setRequested(true)}>
                    Confirmer la demande
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
