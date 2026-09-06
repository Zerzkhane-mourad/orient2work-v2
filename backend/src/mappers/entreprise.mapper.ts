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
  offresPubliees: number;
}

/** Vue publique : ni contact du responsable, ni téléphone. */
export type EntreprisePublicDto = Omit<
  EntrepriseDto,
  "emailResponsable" | "telephone" | "responsable"
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
    offresPubliees: entreprise._count.offres,
  };
}

export function toEntreprisePublicDto(entreprise: EntrepriseFull): EntreprisePublicDto {
  const {
    emailResponsable: _email,
    telephone: _telephone,
    responsable: _responsable,
    ...rest
  } = toEntrepriseDto(entreprise);
  return rest;
}
