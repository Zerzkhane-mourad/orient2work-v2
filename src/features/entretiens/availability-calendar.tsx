"use client";

import { useState } from "react";
import { Card, CardBody, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const HOURS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

const key = (day: string, hour: string) => `${day}-${hour}`;

/** Weekly availability grid — recruiters toggle the slots they open for interviews (§10). */
export function AvailabilityCalendar() {
  const [slots, setSlots] = useState<Set<string>>(
    () => new Set(["Lundi-10:00", "Lundi-11:00", "Mercredi-14:00", "Mercredi-15:00", "Vendredi-09:00"]),
  );

  const toggle = (day: string, hour: string) =>
    setSlots((prev) => {
      const next = new Set(prev);
      const k = key(day, hour);
      if (next.has(k)) {
        next.delete(k);
      } else {
        next.add(k);
      }
      return next;
    });

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-secondary-container" /> Disponible
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-outline-variant" /> Fermé
          </span>
          <span className="ml-auto flex items-center gap-1 font-semibold text-primary">
            <Icon name="event_available" className="text-[16px]" /> {slots.size} créneaux ouverts
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-[80px_repeat(5,1fr)] gap-2">
            <div />
            {DAYS.map((d) => (
              <div key={d} className="text-center text-sm font-bold text-primary">
                {d}
              </div>
            ))}
            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div className="flex items-center justify-end pr-2 text-xs font-semibold text-on-surface-variant">
                  {hour}
                </div>
                {DAYS.map((day) => {
                  const active = slots.has(key(day, hour));
                  return (
                    <button
                      key={key(day, hour)}
                      type="button"
                      onClick={() => toggle(day, hour)}
                      className={cn(
                        "h-11 rounded-lg border text-xs font-semibold transition-colors",
                        active
                          ? "border-secondary bg-secondary-container text-on-secondary-container"
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
                      )}
                    >
                      {active ? "Ouvert" : ""}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
