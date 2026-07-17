"use client";

import { useMemo, useState } from "react";
import { OffreCard } from "./offre-card";
import { Icon } from "@/components/ui";
import { OPPORTUNITY_TYPES } from "@/lib/constants";
import type { Offre } from "@/lib/types";
import { cn } from "@/lib/utils";

interface OffresBrowserProps {
  offres: Offre[];
  /** Base path for offer detail links. */
  detailBase?: string;
  /** "grid" for marketing pages, "list" for the LinkedIn-style jobs feed. */
  variant?: "grid" | "list";
}

/** Searchable + filterable set of offers (shared by public and jeune spaces). */
export function OffresBrowser({ offres, detailBase, variant = "grid" }: OffresBrowserProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("Tous");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offres.filter((o) => {
      const matchesType = type === "Tous" || o.type === type;
      const matchesQuery =
        !q ||
        o.titre.toLowerCase().includes(q) ||
        o.entreprise.nom.toLowerCase().includes(q) ||
        o.ville.toLowerCase().includes(q) ||
        o.competences.some((c) => c.toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [offres, query, type]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Icon
          name="search"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par titre, entreprise, ville ou compétence…"
          className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-3 pl-12 pr-4 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {["Tous", ...OPPORTUNITY_TYPES].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              type === t
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="text-sm text-on-surface-variant">
        {filtered.length} offre{filtered.length > 1 ? "s" : ""} trouvée
        {filtered.length > 1 ? "s" : ""}
      </p>

      {filtered.length > 0 ? (
        <div
          className={
            variant === "list" ? "space-y-4" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          }
        >
          {filtered.map((o) => (
            <OffreCard key={o.id} offre={o} href={detailBase ? `${detailBase}/${o.id}` : undefined} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-outline-variant py-16 text-center text-on-surface-variant">
          <Icon name="search_off" className="text-4xl" />
          <p className="mt-2">Aucune offre ne correspond à votre recherche.</p>
        </div>
      )}
    </div>
  );
}
