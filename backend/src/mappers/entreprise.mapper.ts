import type { EntrepriseStatus } from "@prisma/client";
import type { EntrepriseFull } from "../repositories/entreprise.repository.js";

/** Miroir de l'interface `Entreprise` du frontend. */
export interface EntrepriseDto {
  id: string;
  nom: string;
  logo?: string;
  secteur: string;
  ville: string;
  siteWeb?: string;
  description: string;
  responsable: string;
  emailResponsable: string;
  telephone: string;
  status: EntrepriseStatus;
  /** Palette de l'espace entreprise (préférence d'interface). */
  theme: string;
  /** Couleur principale du logo — source du thème « auto ». */
  themeCouleur?: string;
  /** Couleur d'accent du logo, si le logo en contient une seconde. */
  themeAccent?: string;
  offresPubliees: number;
}

/** Vue publique : ni contact du responsable, ni téléphone, ni préférence d'interface. */
export type EntreprisePublicDto = Omit<
  EntrepriseDto,
  "emailResponsable" | "telephone" | "responsable" | "theme" | "themeCouleur" | "themeAccent"
>;

export function toEntrepriseDto(entreprise: EntrepriseFull): EntrepriseDto {
  return {
    id: entreprise.id,
    nom: entreprise.nom,
    ...(entreprise.logo ? { logo: entreprise.logo } : {}),
    secteur: entreprise.secteur,
    ville: entreprise.ville,
    ...(entreprise.siteWeb ? { siteWeb: entreprise.siteWeb } : {}),
    description: entreprise.description,
    responsable: entreprise.responsable,
    emailResponsable: entreprise.emailResponsable,
    telephone: entreprise.telephone,
    status: entreprise.status,
    theme: entreprise.theme,
    ...(entreprise.themeCouleur ? { themeCouleur: entreprise.themeCouleur } : {}),
    ...(entreprise.themeAccent ? { themeAccent: entreprise.themeAccent } : {}),
    offresPubliees: entreprise._count.offres,
  };
}

export function toEntreprisePublicDto(entreprise: EntrepriseFull): EntreprisePublicDto {
  const {
    emailResponsable: _email,
    telephone: _telephone,
    responsable: _responsable,
    theme: _theme,
    themeCouleur: _themeCouleur,
    themeAccent: _themeAccent,
    ...rest
  } = toEntrepriseDto(entreprise);
  return rest;
}
