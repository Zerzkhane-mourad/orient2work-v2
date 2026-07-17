"use client";

import { useMemo, useState } from "react";
import { TalentCard } from "./talent-card";
import { EmptyState, Icon, Select } from "@/components/ui";
import { FILIERES, NIVEAUX_ETUDES } from "@/lib/constants";
import type { Jeune } from "@/lib/types";

/** Talent search engine with filters by filière, niveau and free-text query (§6.5). */
export function TalentSearch({ talents }: { talents: Jeune[] }) {
  const [query, setQuery] = useState("");
  const [filiere, setFiliere] = useState("");
  const [niveau, setNiveau] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return talents.filter((t) => {
      const matchQuery =
        !q ||
        `${t.prenom} ${t.nom}`.toLowerCase().includes(q) ||
        t.competences.some((c) => c.toLowerCase().includes(q));
      const matchFiliere = !filiere || t.filiere === filiere;
      const matchNiveau = !niveau || t.niveauEtudes === niveau;
      return matchQuery && matchFiliere && matchNiveau;
    });
  }, [talents, query, filiere, niveau]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom ou compétence…"
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2.5 pl-12 pr-4 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </div>
        <Select value={filiere} onChange={(e) => setFiliere(e.target.value)} className="min-w-44">
          <option value="">Toutes les filières</option>
          {FILIERES.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </Select>
        <Select value={niveau} onChange={(e) => setNiveau(e.target.value)} className="min-w-40">
          <option value="">Tous les niveaux</option>
          {NIVEAUX_ETUDES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </Select>
      </div>

      <p className="text-sm text-on-surface-variant">{results.length} talent(s) validé(s)</p>

      {results.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((t) => (
            <TalentCard key={t.id} talent={t} />
          ))}
        </div>
      ) : (
        <EmptyState icon="person_search" title="Aucun talent trouvé" description="Ajustez vos filtres de recherche." />
      )}
    </div>
  );
}
