"use client";

import { useMemo, useState } from "react";
import { FormationCard } from "./formation-card";
import { EmptyState } from "@/components/ui";
import type { Formation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FormationsCatalogProps {
  formations: Formation[];
  /** Base path for course detail; falls back to /inscription for the public catalog. */
  detailBase?: string;
}

/** Udemy-style browsable catalog: category tabs + responsive course grid. */
export function FormationsCatalog({ formations, detailBase }: FormationsCatalogProps) {
  const categories = useMemo(
    () => ["Tous", ...Array.from(new Set(formations.map((f) => f.categorie)))],
    [formations],
  );
  const [category, setCategory] = useState("Tous");

  const filtered =
    category === "Tous" ? formations : formations.filter((f) => f.categorie === category);

  const hrefFor = (id: string) => (detailBase ? `${detailBase}/${id}` : "/inscription");

  return (
    <div className="space-y-5">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-outline-variant pb-px">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 pb-2 text-sm font-semibold transition-colors",
              category === c
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-primary",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((f) => (
            <FormationCard key={f.id} formation={f} href={hrefFor(f.id)} />
          ))}
        </div>
      ) : (
        <EmptyState icon="search_off" title="Aucune formation dans cette catégorie" />
      )}
    </div>
  );
}
