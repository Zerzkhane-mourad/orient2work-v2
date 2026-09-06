"use client";

import { ReferentielManager } from "@/features/admin/referentiel-manager";

export default function AdminCategoriesFormationPage() {
  return (
    <ReferentielManager
      config={{
        cle: "categories-formation",
        titre: "Catégories de formation",
        singulier: "catégorie",
        colonneUsages: "Formations",
        usagers: "les formations",
        exemple: "Réseautage professionnel",
        portee: "classer les formations du catalogue",
      }}
    />
  );
}
