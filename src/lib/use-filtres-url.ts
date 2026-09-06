"use client";

/**
 * Filtres d'un écran de liste, portés par l'URL.
 *
 * ── Le problème, concret ────────────────────────────────────────────────────
 *
 * Un administrateur cherche « Atlas », filtre sur « en attente de validation »,
 * ouvre la troisième fiche, tranche, revient. Il retrouvait une liste NEUVE :
 * recherche vide, filtre à zéro, tout à refaire — à chaque dossier traité.
 * L'état vivait dans `useState`, que la navigation démonte.
 *
 * Dans l'URL, il survit au retour arrière, au rechargement, au partage d'un
 * lien (« regarde ces trois offres-là »), et permet à un autre écran de
 * pointer une liste déjà filtrée — ce que la fiche entreprise fait pour
 * retrouver les offres d'une société.
 *
 * ── Pourquoi un état local EN PLUS de l'URL ─────────────────────────────────
 *
 * Dériver la valeur du champ directement de `useSearchParams` ferait passer
 * chaque frappe par le routeur avant de revenir à l'input : la saisie
 * saccaderait. L'état local répond à la frappe, l'URL est écrite dans la
 * foulée ; les deux ne peuvent pas diverger puisque toute modification passe
 * par `definir`.
 *
 * `replace` et non `push` : filtrer n'est pas naviguer. Chaque lettre tapée
 * ajouterait sinon une entrée d'historique, et le bouton « retour » remonterait
 * la recherche caractère par caractère.
 *
 * ── Convention ──────────────────────────────────────────────────────────────
 *
 * Une valeur VIDE est l'absence de filtre : elle disparaît de l'URL au lieu de
 * s'y écrire `?status=`. L'URL ne montre donc que ce qui filtre réellement.
 *
 * `useSearchParams` impose une frontière `<Suspense>` dans une page rendue
 * statiquement — sans quoi la page entière bascule en rendu dynamique. Les
 * écrans qui utilisent ce hook enveloppent donc leur contenu.
 */
import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useFiltresUrl<T extends Record<string, string>>(defauts: T) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Lu UNE fois, à l'initialisation : ensuite, c'est ce hook qui écrit l'URL,
  // et la relire à chaque rendu ferait boucler l'état sur lui-même.
  const [valeurs, setValeurs] = useState<T>(() => {
    const initial = { ...defauts };
    for (const cle of Object.keys(defauts) as (keyof T & string)[]) {
      const valeur = params.get(cle);
      if (valeur !== null) initial[cle] = valeur as T[keyof T & string];
    }
    return initial;
  });

  const ecrire = useCallback(
    (suivantes: T) => {
      const query = new URLSearchParams();
      for (const [cle, valeur] of Object.entries(suivantes)) {
        if (valeur) query.set(cle, valeur);
      }
      const chaine = query.toString();
      // `scroll: false` : filtrer ne doit pas ramener la page en haut — on
      // regarde souvent la liste au moment où l'on change de statut.
      router.replace(chaine ? `${pathname}?${chaine}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const definir = useCallback(
    <K extends keyof T & string>(cle: K, valeur: T[K]) => {
      const suivantes = { ...valeurs, [cle]: valeur };
      setValeurs(suivantes);
      ecrire(suivantes);
    },
    [valeurs, ecrire],
  );

  const reinitialiser = useCallback(() => {
    setValeurs(defauts);
    ecrire(defauts);
    // `defauts` est une constante de module chez tous les appelants ; le mettre
    // en dépendance forcerait chacun à la mémoïser pour rien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecrire]);

  /** Vrai dès qu'un filtre s'écarte de sa valeur par défaut. */
  const actifs = (Object.keys(defauts) as (keyof T & string)[]).some(
    (cle) => valeurs[cle] !== defauts[cle],
  );

  return { valeurs, definir, reinitialiser, actifs };
}
