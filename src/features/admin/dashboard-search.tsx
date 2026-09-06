"use client";

/**
 * Recherche rapide, en tête du tableau de bord.
 *
 * ── Pourquoi des suggestions et non un renvoi vers une liste ────────────────
 *
 * Les trois écrans de listes (jeunes, entreprises, offres) ont chacun leur
 * champ de recherche, avec leurs filtres et leur pagination. Ce champ-ci ne les
 * remplace pas : il sert le cas où l'on sait DÉJÀ ce qu'on cherche — un nom
 * d'entreprise, un candidat — et où passer par la liste, choisir l'onglet,
 * retaper le terme est un détour. Les trois collections sont donc interrogées
 * ENSEMBLE et chaque résultat mène directement à sa fiche.
 *
 * ── Trois requêtes, un aller-retour ─────────────────────────────────────────
 *
 * `Promise.all` les lance en parallèle : le coût perçu est celui de la plus
 * lente, pas de leur somme. Trois éléments par groupe — au-delà, le panneau
 * cesse d'être un raccourci et redevient une liste, que les écrans dédiés font
 * mieux.
 */
import { useState } from "react";
import Link from "next/link";
import { Avatar, Icon, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { DELAI_SUGGESTIONS_MS, useDebounced } from "@/lib/use-debounced";

/** En deçà, le terme n'est pas discriminant : chaque frappe ramènerait tout. */
const MIN_CARACTERES = 2;
const PAR_GROUPE = 3;

interface Suggestion {
  href: string;
  titre: string;
  detail: string;
  icone: IconName;
  /** Renseigné pour les personnes et les entreprises, qui ont une image. */
  avatar?: { nom: string; photo?: string };
}

export function DashboardSearch() {
  const [saisie, setSaisie] = useState("");
  const [ouvert, setOuvert] = useState(false);

  // Le `.trim()` AVANT le retard : « omb » et « omb  » sont une seule recherche.
  const q = useDebounced(saisie.trim(), DELAI_SUGGESTIONS_MS);
  const actif = q.length >= MIN_CARACTERES;

  const { data: suggestions, loading } = useApi<Suggestion[] | null>(async () => {
    if (!actif) return null;

    const [jeunes, entreprises, offres] = await Promise.all([
      api.admin.jeunes({ q, perPage: PAR_GROUPE }),
      api.admin.entreprises({ q, perPage: PAR_GROUPE }),
      api.admin.offres({ q, perPage: PAR_GROUPE }),
    ]);

    return [
      ...jeunes.items.map((j) => ({
        href: `/admin/jeunes/${j.id}`,
        titre: `${j.prenom} ${j.nom}`,
        detail: j.filiere || j.titre,
        icone: "school" as IconName,
        avatar: { nom: `${j.prenom} ${j.nom}`, photo: j.photo },
      })),
      ...entreprises.items.map((e) => ({
        href: `/admin/entreprises/${e.id}`,
        titre: e.nom,
        detail: [e.secteur, e.ville].filter(Boolean).join(" · "),
        icone: "business" as IconName,
        avatar: { nom: e.nom, photo: e.logo },
      })),
      ...offres.items.map((o) => ({
        href: `/admin/offres/${o.id}`,
        titre: o.titre,
        detail: `${o.entreprise.nom} · ${o.ville}`,
        icone: "work" as IconName,
      })),
    ];
    // `actif` dérive de `q`, mais il conditionne la requête : le déclarer évite
    // qu'une évolution du seuil se perde silencieusement hors des dépendances.
  }, [q, actif]);

  const afficherPanneau = ouvert && actif;

  return (
    <div
      className="relative w-full sm:w-72"
      // Le panneau se ferme quand le focus QUITTE le bloc, pas à chaque perte
      // de focus : passer du champ à un résultat au clavier resterait sinon
      // impossible, le panneau disparaissant avant le clic.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOuvert(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOuvert(false);
      }}
    >
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
        <Icon name="search" className="text-[20px]" />
      </span>
      <input
        type="search"
        value={saisie}
        onChange={(event) => {
          setSaisie(event.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        aria-label="Rechercher un jeune, une entreprise ou une offre"
        placeholder="Rechercher…"
        className="h-11 w-full rounded-full border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-0"
      />

      {/*
        Panneau ANNONCÉ, pas simulé en liste déroulante : les résultats sont des
        liens vers des fiches, pas des options à choisir. Un `role="combobox"`
        promettrait des touches fléchées et une sélection que ce panneau n'a
        pas ; `aria-live` dit simplement ce qui vient d'apparaître.
      */}
      {afficherPanneau && (
        <div
          role="region"
          aria-label="Résultats de la recherche"
          aria-live="polite"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest shadow-level-2"
        >
          {loading && !suggestions ? (
            <p className="px-4 py-3 text-sm text-on-surface-variant">Recherche…</p>
          ) : (suggestions?.length ?? 0) === 0 ? (
            <p className="px-4 py-3 text-sm text-on-surface-variant">
              Aucun résultat pour « {q} ».
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {suggestions?.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-surface-container-low"
                  >
                    {s.avatar ? (
                      <Avatar src={s.avatar.photo} alt={s.avatar.nom} size={32} />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary">
                        <Icon name={s.icone} className="text-[18px]" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-on-surface">
                        {s.titre}
                      </span>
                      <span className="block truncate text-xs text-on-surface-variant">
                        {s.detail}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
