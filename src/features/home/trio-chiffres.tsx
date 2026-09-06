/**
 * Trio de chiffres, dont une carte sombre à anneau.
 *
 * ── Ce qui est repris de la référence ───────────────────────────────────────
 *
 * Sa rangée de statistiques ne fait pas trois cellules identiques : deux cartes
 * claires portent un nombre, la troisième est SOMBRE et porte un anneau de
 * progression. Ce déséquilibre est ce qui empêche la rangée de se lire comme un
 * tableau : l'œil se pose d'abord sur la carte sombre, puis revient lire les
 * deux autres.
 *
 * ── Ce qui change ───────────────────────────────────────────────────────────
 *
 * L'anneau de la référence répartit des projets en trois tranches inventées.
 * Ici il porte le SEUIL DE VALIDATION, qui est un vrai chiffre et l'argument
 * central de la plateforme : la portion remplie est le score minimum exigé,
 * la portion vide ce qu'il reste à parcourir.
 *
 * Quatre chiffres deviennent trois : la référence en montre trois, et surtout
 * une rangée de quatre nombres se lit comme un tableau de bord, pas comme un
 * argument. Le quatrième reste disponible plus bas si besoin.
 */
import { QUIZ_PASS_SCORE } from "@/lib/constants";
import { CompteurAnime } from "@/components/motion/compteur-anime";

const CHIFFRES = [
  { valeur: "5000+", label: "Jeunes inscrits", detail: "Profils créés sur la plateforme" },
  { valeur: "250+", label: "Entreprises partenaires", detail: "Toutes validées par OMB" },
] as const;

/**
 * Anneau de progression en SVG.
 *
 * `stroke-dasharray` sur un cercle : la longueur du trait visible vaut le
 * pourcentage de la circonférence. Pas de bibliothèque de graphiques pour un
 * seul anneau - ce serait plusieurs dizaines de kilo-octets pour dessiner un
 * cercle.
 */
function Anneau({ pourcentage }: { pourcentage: number }) {
  const rayon = 52;
  const circonference = 2 * Math.PI * rayon;
  const rempli = (pourcentage / 100) * circonference;

  return (
    <svg viewBox="0 0 128 128" className="h-32 w-32" role="img" aria-label={`${pourcentage} %`}>
      <circle
        cx="64"
        cy="64"
        r={rayon}
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        className="text-white/15"
      />
      <circle
        cx="64"
        cy="64"
        r={rayon}
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${rempli} ${circonference}`}
        // Départ à midi plutôt qu'à 3 heures : un anneau qui commence sur le
        // côté se lit comme une erreur de rendu.
        transform="rotate(-90 64 64)"
        className="text-secondary-fixed-dim"
      />
      <text
        x="64"
        y="64"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white font-headline text-[28px] font-extrabold"
      >
        {pourcentage}%
      </text>
    </svg>
  );
}

export function TrioChiffres() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {CHIFFRES.map((chiffre) => (
        /*
         * L'ombre s'ajoute à la bordure, comme sur le composant `Card` du
         * projet : sur un fond presque blanc (#f9f9ff), une carte blanche sans
         * contour n'a plus d'arêtes, et sans ombre elle ne se décolle pas.
         */
        <div
          key={chiffre.label}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-level-1"
        >
          <p className="font-headline text-4xl font-extrabold tracking-tight text-primary">
            <CompteurAnime valeur={chiffre.valeur} />
          </p>
          {/*
            Le seul or de toute la moitié claire de la page.

            Il est posé ENTRE le nombre et son libellé, et non en arête haute de
            carte : un filet plaqué contre le bord serait rogné en croissant par
            l'arrondi de 24px, alors qu'ici il sépare deux lignes qui se lisaient
            comme un bloc. Il ne porte aucun texte, donc aucune question de
            contraste — c'est ce qui autorise l'or vif plutôt que le bronze
            auquel il faut se résoudre dès qu'on écrit avec.
          */}
          <span
            aria-hidden
            className="mt-3 block h-1 w-10 rounded-full bg-secondary-fixed-dim"
          />
          <p className="mt-3 font-semibold text-primary">{chiffre.label}</p>
          <p className="text-sm text-on-surface-variant">{chiffre.detail}</p>
        </div>
      ))}

      {/* La carte sombre : le point d'arrêt de la rangée. La lueur est recentrée
          sur l'anneau, qui occupe ici la moitié gauche de la carte et non le
          cinquième comme dans la bande de confiance. */}
      <div
        className="champ-sombre flex items-center gap-5 overflow-hidden rounded-xl p-6 text-white [--lueur-sombre-x:30%]"
      >
        <Anneau pourcentage={QUIZ_PASS_SCORE} />
        <div>
          <p className="font-headline text-xl font-bold">Le seuil de validation</p>
          <p className="mt-1 text-sm text-white/70">
            Un profil n&apos;atteint les recruteurs qu&apos;au-delà de cette note.
          </p>
        </div>
      </div>
    </div>
  );
}
