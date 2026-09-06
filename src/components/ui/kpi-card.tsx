import { Card, CardBody } from "./card";
import { Icon, type IconName } from "./icon";

/**
 * Compteur de tête d'un tableau de bord.
 *
 * ── Pourquoi un rapport accompagne toujours le total ────────────────────────
 *
 * « 42 candidatures » ne dit pas s'il faut agir. « 42 candidatures — 37 déjà
 * traitées » le dit, et le même chiffre change de sens selon le second. Le
 * rapport est donc obligatoire, pas décoratif : une carte qui n'aurait qu'un
 * total appartient à `Stat`, pas ici.
 *
 * Le rapport est écrit DEUX FOIS — en pourcentage et en clair. Le pourcentage
 * se compare d'une carte à l'autre ; le libellé dit de quoi il est le
 * pourcentage, ce qu'un « 88 % » seul laisserait deviner.
 *
 * ── La jauge n'est pas une courbe ───────────────────────────────────────────
 *
 * Les tableaux de bord du commerce montrent ici une sparkline et un « +12 % ce
 * mois ». L'API ne renvoie que des totaux instantanés : il n'y a aucune série
 * datée à tracer, et une tendance inventée serait un mensonge. La barre montre
 * donc la part réelle, sur la même piste que les jauges du reste de la page.
 */
export interface KpiPart {
  /**
   * Numérateur — un SOUS-ENSEMBLE du dénominateur, jamais un compteur voisin.
   *
   * L'écran des statistiques a rapproché un temps « candidatures » et
   * « entretiens demandés » : la carte annonçait 143 %, avec une jauge pleine
   * et une pastille de succès. Les deux nombres sont justes, mais l'un n'est
   * pas une part de l'autre — un entretien peut naître d'une candidature
   * spontanée, sans candidature. La jauge est bornée à 100 % pour ne jamais
   * déborder, mais la borne ne répare pas un rapprochement faux : c'est à
   * l'appelant de ne rapprocher que ce qui est réellement inclus.
   */
  valeur: number;
  /** Dénominateur — pas toujours la valeur affichée (offres publiées/soumises). */
  total: number;
  /** Ce que compte le numérateur : « validés », « en ligne », « confirmés »… */
  libelle: string;
}

export function KpiCard({
  libelle,
  valeur,
  icone,
  part,
  rang,
}: {
  libelle: string;
  valeur: number;
  icone: IconName;
  part: KpiPart;
  /**
   * Rang dans la rangée : décale l'apparition de 45 ms par carte, pour que la
   * lecture suive l'ordre des compteurs. Voir `.apparition` (globals.css).
   */
  rang?: number;
}) {
  // Un dénominateur nul n'est pas une erreur : c'est un compte tout neuf. La
  // jauge reste à zéro plutôt que d'afficher « NaN % ».
  const pourcentage = part.total > 0 ? Math.round((part.valeur / part.total) * 100) : 0;

  return (
    <Card
      className={rang === undefined ? undefined : "apparition"}
      style={rang === undefined ? undefined : ({ "--rang": rang } as React.CSSProperties)}
    >
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-on-surface-variant">{libelle}</p>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
            <Icon name={icone} className="text-[18px]" />
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <p className="font-headline text-3xl font-bold leading-none text-primary">
            {valeur.toLocaleString("fr-FR")}
          </p>
          {/*
            Pastille NEUTRE, et non verte.

            Le vert est un jeton de statut : il dit « bon ». Il habillait ici
            n'importe quelle proportion — « 11 % des jeunes sont validés »
            s'affichait en vert succès, ce qui félicite l'équipe d'un chiffre
            qui appelle au contraire une action. Une part n'est ni bonne ni
            mauvaise en soi : elle se lit à côté de son libellé.
          */}
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
            {pourcentage} %
          </span>
        </div>

        {/* Même piste et même remplissage que les jauges linéaires : deux blocs
            qui mesurent la même chose se peignent pareil. */}
        <div className="h-2 w-full rounded-r-sm bg-[var(--chart-piste)]">
          <div
            className="h-full rounded-r-sm bg-[var(--chart-barre)] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, pourcentage)}%` }}
          />
        </div>

        <p className="text-xs tabular-nums text-on-surface-variant">
          {part.valeur.toLocaleString("fr-FR")} {part.libelle}
        </p>
      </CardBody>
    </Card>
  );
}
