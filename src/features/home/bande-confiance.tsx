/**
 * La vérification des profils, en bloc typographique.
 *
 * C'est l'argument de vente principal de la plateforme : une entreprise ne
 * reçoit que des candidats ayant franchi le test. Il figurait jusqu'ici comme
 * une carte parmi trois, au même rang que « formations incluses » — donc
 * invisible.
 *
 * Ici le seuil devient un CHIFFRE MONUMENTAL. Un nombre au corps de 11rem n'est
 * plus une donnée, c'est une image : on le lit avant même d'avoir lu la phrase
 * qui l'accompagne. C'est le seul endroit de la page qui s'autorise cette
 * échelle, et c'est ce qui lui donne son poids.
 */
import { Icon } from "@/components/ui";
import { QUIZ_PASS_SCORE } from "@/lib/constants";

/** Les trois garanties, dans l'ordre du parcours : entrer, prouver, être vu. */
const GARANTIES = [
  {
    icon: "verified_user",
    titre: "Entreprises validées par OMB",
    detail: "Chaque compte entreprise est vérifié avant de pouvoir publier une offre.",
  },
  {
    icon: "fact_check",
    titre: "Test de validation obligatoire",
    detail: "Aucun profil n'atteint les recruteurs sans avoir passé le seuil.",
  },
  {
    icon: "workspace_premium",
    titre: "Formations certifiantes",
    detail: "CV, lettre de motivation, entretien, LinkedIn : les acquis sont attestés.",
  },
] as const;

export function BandeConfiance() {
  return (
    /* `champ-sombre` : lueur or sous le chiffre monumental, lumière froide au
       coin opposé. L'aplat précédent aplatissait le seul endroit de la page qui
       doit dominer — voir la construction et les mesures dans `globals.css`. */
    <section className="champ-sombre relative overflow-hidden text-white">
      <div className="relative mx-auto max-w-container-max px-margin-mobile py-16 lg:px-margin-desktop lg:py-20">
        <div className="grid gap-10 lg:grid-cols-5 lg:items-center lg:gap-14">
          {/* Le chiffre occupe deux colonnes sur cinq : assez pour dominer,
              pas assez pour écraser le texte qui l'explique. */}
          <div className="lg:col-span-2">
            <p className="chiffre-monumental font-headline text-secondary-fixed-dim">
              {QUIZ_PASS_SCORE}
              {/* Le signe pourcent au tiers du corps : il accompagne le nombre
                  sans lui disputer la place. */}
              <span className="text-[0.35em] align-super">%</span>
            </p>
            <p className="mt-2 font-headline text-xl font-bold sm:text-2xl">
              Le seuil pour être visible.
            </p>
          </div>

          <div className="space-y-6 lg:col-span-3">
            <p className="max-w-xl text-lg text-white/75">
              Un recruteur qui ouvre un profil sur Orient2Work sait qu&apos;il a déjà été
              filtré. C&apos;est ce qui raccourcit ses entretiens, et ce qui donne du poids
              au vôtre.
            </p>

            {/* `divide-y` plutôt que trois cartes : les garanties se lisent
                comme une liste continue, pas comme un catalogue d'options. */}
            <ul className="divide-y divide-white/15 border-y border-white/15">
              {GARANTIES.map((garantie) => (
                <li key={garantie.titre} className="flex gap-4 py-4">
                  <Icon
                    name={garantie.icon}
                    className="mt-0.5 shrink-0 text-[22px] text-secondary-fixed-dim"
                  />
                  <div>
                    <p className="font-semibold">{garantie.titre}</p>
                    <p className="text-sm text-white/65">{garantie.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
