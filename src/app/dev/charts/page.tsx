import { notFound } from "next/navigation";
import { ApercuGraphiques } from "./apercu";

export const metadata = { title: "Banc d'essai des graphiques" };

/**
 * Écran de conception, réservé au développement.
 *
 * Le garde n'est pas décoratif : cette page affiche des chiffres INVENTÉS, avec
 * exactement la même mise en forme que les vrais tableaux de bord. Servie en
 * production, une capture d'écran suffirait à la faire passer pour une mesure.
 * `notFound()` la fait donc répondre 404 hors développement — et comme la
 * condition est évaluée à la construction, la page n'est même pas prérendue.
 *
 * Elle n'est liée depuis aucune navigation : on l'ouvre en tapant l'adresse.
 */
export default function BancEssaiGraphiquesPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <ApercuGraphiques />;
}
