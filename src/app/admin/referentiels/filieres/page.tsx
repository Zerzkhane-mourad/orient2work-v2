"use client";

import { ReferentielManager } from "@/features/admin/referentiel-manager";

export default function AdminFilieresPage() {
  return (
    <ReferentielManager
      config={{
        cle: "filieres",
        titre: "Filières",
        singulier: "filière",
        // Quatre tables référencent une filière : jeunes, offres, formations et
        // questions du test de validation.
        colonneUsages: "Utilisations",
        usagers: "les profils, offres, formations et questions de test",
        exemple: "Cybersécurité",
        portee: "qualifier les profils, les offres et les formations",
      }}
    />
  );
}
