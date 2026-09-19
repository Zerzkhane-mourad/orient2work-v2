
import type { EntrepriseThemeId } from "@/lib/api/types";

export interface EntrepriseTheme {
  id: EntrepriseThemeId;
  label: string;
  /** Aperçu du sélecteur : couleur principale, accent, fond. Copie des jetons CSS. */
  apercu: { primaire: string; accent: string; fond: string };
}

export const ENTREPRISE_THEMES: readonly EntrepriseTheme[] = [
  { id: "marine", label: "Marine", apercu: { primaire: "#0b1f3a", accent: "#fed65b", fond: "#e7eeff" } },
  { id: "emeraude", label: "Émeraude", apercu: { primaire: "#012619", accent: "#a9eeb7", fond: "#e1f3ee" } },
  { id: "ocean", label: "Océan", apercu: { primaire: "#01232f", accent: "#99ebea", fond: "#e3f0fa" } },
  { id: "amethyste", label: "Améthyste", apercu: { primaire: "#25143d", accent: "#e4d0ff", fond: "#f2ebf7" } },
  { id: "bordeaux", label: "Bordeaux", apercu: { primaire: "#3d0715", accent: "#feceb9", fond: "#f7ebea" } },
  { id: "ardoise", label: "Ardoise", apercu: { primaire: "#182029", accent: "#fecfb0", fond: "#ebeef4" } },
];

export const DEFAULT_ENTREPRISE_THEME: EntrepriseThemeId = "marine";

/** Attribut posé sur `<html>` — et non sur la coquille, pour que les modales en portail suivent. */
export const THEME_ATTRIBUTE = "data-theme-entreprise";
