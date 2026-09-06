"use client";

/**
 * Recherche globale de l'en-tête.
 *
 * Elle couvre les trois choses qu'un candidat cherche — une offre, une
 * formation, une entreprise qui reçoit des candidatures spontanées — et les
 * présente groupées, sous le champ. Auparavant elle ne menait qu'au catalogue
 * d'offres : chercher une formation par son nom ne donnait rien.
 *
 * Ce qui se joue ici :
 *  • UN SEUL appel serveur par frappe (`/recherche`), et non trois, avec la
 *    visibilité décidée côté serveur ;
 *  • les réponses hors d'usage sont ÉCARTÉES — sur une frappe rapide, une
 *    réponse lente arrivée après une plus récente réafficherait d'anciens
 *    résultats ;
 *  • le clavier suffit : flèches, Entrée, Échap.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Icon } from "@/components/ui";
import { api } from "@/lib/api";
import { DELAI_SUGGESTIONS_MS, useDebounced } from "@/lib/use-debounced";
import type { ApiRecherche, ApiResultatRecherche, TypeResultat } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ICONE_GROUPE, LIBELLE_GROUPE, lienGroupe, lienResultat } from "./destinations";

/** En deçà, presque tout correspond : la liste n'aiderait pas à choisir. */
const LONGUEUR_MINIMALE = 2;

/** Écran de repli quand on valide sans avoir choisi de suggestion. */
const CHEMIN_OFFRES = "/espace-jeune/offres";

/** Suggestion aplatie : la navigation au clavier ignore les groupes. */
interface Suggestion extends ApiResultatRecherche {
  type: TypeResultat;
}

interface Props {
  /** Focus à l'ouverture — la version dépliée sur mobile. */
  autoFocus?: boolean;
  /** Prévient l'appelant qu'il peut refermer le panneau de recherche. */
  onNavigated?: () => void;
}

export function RechercheNavbar({ autoFocus, onNavigated }: Props) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const listeId = useId();

  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState<ApiRecherche | null>(null);
  const [chargement, setChargement] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  /** Index dans la liste aplatie ; `-1` = rien de sélectionné. */
  const [actif, setActif] = useState(-1);

  useEffect(() => {
    if (autoFocus) champ.current?.focus();
  }, [autoFocus]);

  /** Ce qui est affiché dans le champ, sans délai. */
  const saisie = terme.trim();
  /** Ce qui part au serveur : la même chose, une fois la frappe calmée. */
  const requete = useDebounced(saisie, DELAI_SUGGESTIONS_MS);

  useEffect(() => {
    if (requete.length < LONGUEUR_MINIMALE) {
      setResultats(null);
      setChargement(false);
      return;
    }

    /*
     * `annule` plutôt qu'un `AbortController` : l'appel a de toute façon
     * démarré, et ce qui compte est de ne PAS écrire un résultat périmé.
     * Sans ce garde-fou, une réponse lente écraserait une réponse plus récente
     * et la liste reviendrait à une frappe antérieure.
     */
    let annule = false;
    setChargement(true);

    api.recherche
      .globale(requete)
      .then((reponse) => {
        if (!annule) setResultats(reponse);
      })
      .catch(() => {
        // Une recherche qui échoue ne mérite pas d'alarme : le champ reste
        // utilisable, et valider mène toujours au catalogue.
        if (!annule) setResultats(null);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, [requete]);

  /** Toutes les suggestions, dans l'ordre affiché — support des flèches. */
  const suggestions = useMemo<Suggestion[]>(
    () =>
      (resultats?.groupes ?? []).flatMap((groupe) =>
        groupe.items.map((item) => ({ ...item, type: groupe.type })),
      ),
    [resultats],
  );

  // La sélection est remise à zéro à chaque nouveau jeu de résultats : garder
  // l'index ferait pointer vers un autre élément que celui qui était surligné.
  useEffect(() => {
    setActif(-1);
  }, [suggestions]);

  const fermer = useCallback(() => {
    setOuvert(false);
    setActif(-1);
  }, []);

  const aller = useCallback(
    (url: string) => {
      router.push(url);
      fermer();
      champ.current?.blur();
      onNavigated?.();
    },
    [router, fermer, onNavigated],
  );

  const soumettre = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    const choisie = suggestions[actif];
    // Entrée ouvre la suggestion surlignée ; sans surlignage, elle bascule sur
    // le catalogue d'offres filtré — le comportement attendu d'un champ de
    // recherche qu'on valide sans regarder la liste.
    if (choisie) aller(lienResultat(choisie.type, choisie.id));
    else aller(saisie ? `${CHEMIN_OFFRES}?q=${encodeURIComponent(saisie)}` : CHEMIN_OFFRES);
  };

  const auClavier = (evenement: React.KeyboardEvent) => {
    if (evenement.key === "Escape") {
      fermer();
      return;
    }
    if (evenement.key !== "ArrowDown" && evenement.key !== "ArrowUp") return;
    if (suggestions.length === 0) return;

    // Le curseur du champ resterait sinon en bout de texte à chaque flèche.
    evenement.preventDefault();
    setOuvert(true);
    setActif((index) => {
      const pas = evenement.key === "ArrowDown" ? 1 : -1;
      /*
       * Le cycle compte une position de plus que de suggestions : « rien de
       * surligné » (-1) en fait partie, et c'est elle qui permet de revenir à
       * sa saisie après avoir parcouru la liste. Décalage de 1 pour ramener
       * l'intervalle à [0, n] et rendre le modulo utilisable.
       */
      const positions = suggestions.length + 1;
      return ((index + 1 + pas + positions) % positions) - 1;
    });
  };

  const afficherPanneau = ouvert && saisie.length >= LONGUEUR_MINIMALE;

  return (
    <div className="relative">
      <form role="search" onSubmit={soumettre}>
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
        />
        <input
          ref={champ}
          type="search"
          value={terme}
          onChange={(e) => {
            setTerme(e.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
          onKeyDown={auClavier}
          placeholder="Offres, formations, entreprises…"
          aria-label="Rechercher dans l'Espace Jeune"
          role="combobox"
          aria-expanded={afficherPanneau}
          aria-controls={listeId}
          aria-autocomplete="list"
          {...(actif >= 0 ? { "aria-activedescendant": `${listeId}-${actif}` } : {})}
          /*
           * `text-base` sur mobile : en dessous de 16 px, iOS zoome la page à la
           * prise de focus et ne la dézoome jamais.
           */
          className="min-h-11 w-full rounded-full border border-transparent bg-surface-container py-1.5 pl-9 pr-3 text-base focus:border-secondary focus:bg-surface-container-lowest focus:outline-none md:min-h-0 md:text-sm"
        />
      </form>

      {afficherPanneau && (
        <>
          {/* Fermeture au clic extérieur, sans écouteur global sur le document. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onMouseDown={fermer}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div
            id={listeId}
            role="listbox"
            aria-label="Résultats de recherche"
            /* Sur mobile le panneau prend toute la largeur : ancré à droite et
               large de 320 px, il dépasserait du cadre sur les petits écrans. */
            className="fixed inset-x-2 top-14 z-50 max-h-[70vh] overflow-y-auto overscroll-contain rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2 md:absolute md:inset-x-0 md:top-[calc(100%+0.5rem)] md:max-h-96"
          >
            <Panneau
              resultats={resultats}
              /*
               * En attente tant que la frappe n'est pas retombée : entre le
               * 2ᵉ caractère et la fin du délai, `resultats` est encore nul et
               * le panneau annoncerait « aucun résultat » pour une recherche
               * qui n'a pas encore eu lieu.
               */
              chargement={chargement || saisie !== requete}
              requete={requete}
              actif={actif}
              listeId={listeId}
              onAller={aller}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Panneau({
  resultats,
  chargement,
  requete,
  actif,
  listeId,
  onAller,
}: {
  resultats: ApiRecherche | null;
  chargement: boolean;
  requete: string;
  actif: number;
  listeId: string;
  onAller: (url: string) => void;
}) {
  // Le chargement n'est annoncé que s'il n'y a RIEN à montrer : entre deux
  // frappes, remplacer des résultats valides par un squelette fait clignoter la
  // liste sans rien apprendre.
  if (chargement && !resultats) {
    return <p className="px-4 py-6 text-center text-sm text-on-surface-variant">Recherche…</p>;
  }

  if (!resultats || resultats.total === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm font-semibold text-primary">Aucun résultat</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Rien ne correspond à « {requete} » dans les offres, les formations ni les entreprises.
        </p>
      </div>
    );
  }

  // Index courant dans la liste APLATIE : il traverse les groupes, comme les
  // flèches du clavier.
  let index = -1;

  return (
    <>
      {resultats.groupes.map((groupe) => (
        <section key={groupe.type} className="border-b border-outline-variant last:border-0">
          <p className="flex items-center gap-1.5 px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <Icon name={ICONE_GROUPE[groupe.type]} className="text-[14px]" />
            {LIBELLE_GROUPE[groupe.type]}
            <span className="font-normal normal-case tracking-normal">({groupe.total})</span>
          </p>

          {groupe.items.map((item) => {
            index += 1;
            const surligne = index === actif;
            return (
              <button
                key={item.id}
                type="button"
                id={`${listeId}-${index}`}
                role="option"
                aria-selected={surligne}
                /* `onMouseDown` et non `onClick` : le clic ferait d'abord
                   perdre le focus au champ, ce qui referme le panneau avant que
                   le clic n'aboutisse. */
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAller(lienResultat(groupe.type, item.id));
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  surligne ? "bg-surface-container-high" : "hover:bg-surface-container-low",
                )}
              >
                {item.image ? (
                  <Avatar src={item.image} alt="" size={32} className="rounded-md" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-container text-on-surface-variant">
                    <Icon name={ICONE_GROUPE[groupe.type]} className="text-[16px]" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-on-surface">
                    {item.titre}
                  </span>
                  <span className="block truncate text-xs text-on-surface-variant">
                    {item.sousTitre}
                  </span>
                </span>
              </button>
            );
          })}

          {/* Le panneau ne montre que les premiers de chaque groupe : dire
              combien il en reste, et où les voir. */}
          {groupe.total > groupe.items.length && (
            <Link
              href={lienGroupe(groupe.type, requete)}
              className="block px-4 py-2 text-xs font-semibold text-primary hover:underline"
            >
              Voir les {groupe.total - groupe.items.length} autres{" "}
              {LIBELLE_GROUPE[groupe.type].toLowerCase()}
            </Link>
          )}
        </section>
      ))}
    </>
  );
}
