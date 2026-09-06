"use client";

/**
 * Questions fréquentes, en accordéon animé.
 *
 * ── Ce qui a été échangé, et ce qui a été préservé ──────────────────────────
 *
 * La version précédente reposait sur `<details>` / `<summary>` : gratuit en
 * accessibilité, et fonctionnel sans JavaScript. L'animation demandée impose de
 * reprendre l'ouverture à la main — un `<details>` ne se laisse pas animer, le
 * navigateur bascule son contenu d'un coup.
 *
 * Trois choses ont donc été refaites explicitement, pour ne rien perdre au
 * change :
 *
 *  1. Les panneaux restent MONTÉS, même fermés. Leur hauteur est animée à zéro,
 *     mais le texte est bien dans le HTML rendu par le serveur : la FAQ reste
 *     indexable, ce qui est précisément l'intérêt d'une FAQ. Un
 *     `AnimatePresence` qui démonte le panneau fermé aurait servi une page
 *     d'accueil sans une seule réponse dedans.
 *  2. `inert` sur un panneau fermé : son contenu sort du parcours de
 *     tabulation et n'est plus annoncé par les lecteurs d'écran. Sans lui, un
 *     panneau replié mais présent serait lu comme s'il était ouvert.
 *  3. `aria-expanded` + `aria-controls` sur un vrai `<button>` : c'est ce que
 *     `<summary>` donnait nativement.
 *
 * ── Le comportement ─────────────────────────────────────────────────────────
 *
 * Les questions s'ouvrent INDÉPENDAMMENT : ouvrir la troisième ne referme pas
 * la première. Un accordéon exclusif fait disparaître une réponse que le
 * visiteur venait d'ouvrir volontairement, et l'oblige à comparer de mémoire.
 *
 * La première est ouverte au chargement : elle montre que la liste se déplie,
 * et donne du contenu à lire au lieu d'un empilement de titres.
 */
import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui";
import type { ApiFaq } from "@/lib/api/types";

/**
 * Courbe et durée communes au chevron et au dépliement.
 *
 * Les deux doivent finir ENSEMBLE : un chevron qui s'immobilise avant que le
 * panneau ait fini de s'ouvrir donne l'impression d'une animation qui traîne.
 */
const DUREE = 0.28;
const COURBE = [0.4, 0, 0.2, 1] as const;

function QuestionPliable({
  faq,
  ouverte,
  onToggle,
}: {
  faq: ApiFaq;
  ouverte: boolean;
  onToggle: () => void;
}) {
  const panneauId = useId();
  const boutonId = useId();

  // Framer Motion ne lit pas la préférence système tout seul : sans ce test,
  // l'animation s'exécuterait malgré « réduire les animations ». La règle CSS
  // de `globals.css` ne couvre que les transitions CSS, pas celles-ci.
  const reduire = useReducedMotion();
  const transition = { duration: reduire ? 0 : DUREE, ease: COURBE };

  return (
    <div className="py-1">
      {/* Le titre porte le bouton, et non l'inverse : la question reste un
          niveau de titre pour qui navigue de titre en titre. */}
      <h3>
        <button
          type="button"
          id={boutonId}
          aria-expanded={ouverte}
          aria-controls={panneauId}
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-4 rounded-md py-3 text-left font-headline text-lg font-semibold text-primary transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
        >
          {faq.question}
          <motion.span
            aria-hidden
            animate={{ rotate: ouverte ? 180 : 0 }}
            transition={transition}
            className="mt-0.5 shrink-0 text-on-surface-variant"
          >
            <Icon name="expand_more" className="block text-[22px]" />
          </motion.span>
        </button>
      </h3>

      <motion.div
        id={panneauId}
        // `initial={false}` : au premier rendu le panneau prend directement son
        // état final. Sans cela, la question ouverte par défaut se déplierait
        // toute seule à l'arrivée sur la page, comme si on avait cliqué.
        initial={false}
        animate={{ height: ouverte ? "auto" : 0, opacity: ouverte ? 1 : 0 }}
        transition={transition}
        // Le contenu reste dans le DOM une fois replié : `inert` est ce qui
        // évite qu'il soit lu ou atteint au clavier pour autant.
        inert={!ouverte}
        className="overflow-hidden"
      >
        <p className="max-w-2xl pb-4 pr-8 text-on-surface-variant">{faq.reponse}</p>
      </motion.div>
    </div>
  );
}

export function FaqSection({ questions }: { questions: ApiFaq[] }) {
  // Un ensemble d'identifiants plutôt qu'un seul « ouvert » : c'est ce qui rend
  // les ouvertures indépendantes. La première question part dépliée.
  const [ouvertes, setOuvertes] = useState<ReadonlySet<string>>(
    () => new Set(questions[0] ? [questions[0].id] : []),
  );

  const basculer = (id: string) => {
    setOuvertes((precedentes) => {
      const suivantes = new Set(precedentes);
      if (!suivantes.delete(id)) suivantes.add(id);
      return suivantes;
    });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
      <div className="lg:col-span-2">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary">
          Questions fréquentes
        </h2>
        <p className="mt-3 text-on-surface-variant">
          L&apos;essentiel de ce que nous demandent les candidats et les recruteurs avant de
          créer un compte.
        </p>

        {/* La porte de sortie, à côté de la liste et non après : celui qui ne
            trouve pas sa réponse la voit sans avoir à dérouler jusqu'en bas. */}
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Votre question n&apos;y est pas ? Écrivez-nous
          <Icon name="arrow_forward" aria-hidden className="text-[20px]" />
        </Link>
      </div>

      <div className="divide-y divide-outline-variant border-y border-outline-variant lg:col-span-3">
        {questions.map((faq) => (
          <QuestionPliable
            key={faq.id}
            faq={faq}
            ouverte={ouvertes.has(faq.id)}
            onToggle={() => basculer(faq.id)}
          />
        ))}
      </div>
    </div>
  );
}
