"use client";

/**
 * Barre d'onglets du bas — mobile uniquement.
 *
 * Remplace le menu « hamburger », qui coûtait deux gestes pour chaque
 * déplacement : ouvrir, puis choisir dans une liste qui repoussait la page. Ici
 * les quatre destinations quotidiennes sont visibles en permanence, à une
 * distance du pouce, et l'onglet courant se lit sans ouvrir quoi que ce soit.
 *
 * Cinq cibles au maximum, `min-h-14` chacune : en dessous, la précision du
 * pouce ne suffit plus et l'on ouvre l'onglet voisin.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { LogoutButton } from "@/features/auth/logout-button";
import { cn } from "@/lib/utils";
import {
  estActif,
  estImmersif,
  NAV_COMPTE,
  NAV_ONGLETS_MOBILE,
  NAV_PLUS_RECHERCHE,
  type Destination,
} from "./jeune-nav";

/**
 * @param unread Nombre de notifications non lues, pour la pastille.
 *
 *   Passé par la coquille plutôt que relu ici : `useNotifications` déclenche un
 *   appel réseau, et l'appeler une seconde fois dans cette barre en doublerait
 *   la fréquence pour afficher le même nombre.
 */
export function JeuneBottomNav({ unread = 0 }: { unread?: number }) {
  const chemin = usePathname();
  const [plusOuvert, setPlusOuvert] = useState(false);

  // La feuille se referme au changement de page : sans cela, elle resterait
  // ouverte par-dessus la destination que l'on vient d'atteindre.
  useEffect(() => {
    setPlusOuvert(false);
  }, [chemin]);

  /*
   * Corps figé pendant l'ouverture : sous iOS, un panneau superposé laisse la
   * page défiler derrière lui, et l'on retrouve un écran déplacé en refermant.
   */
  useEffect(() => {
    if (!plusOuvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [plusOuvert]);

  // « Plus » s'allume aussi quand la page courante s'y trouve : l'utilisateur
  // doit voir OÙ il est, même si la destination n'a pas son propre onglet.
  const ailleurs = [...NAV_PLUS_RECHERCHE, ...NAV_COMPTE].some((d) => estActif(d.href, chemin));

  // Après les hooks : leur ordre doit rester le même d'un rendu à l'autre.
  if (estImmersif(chemin)) return null;

  return (
    <>
      {plusOuvert && <FeuillePlus chemin={chemin} onClose={() => setPlusOuvert(false)} />}

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-container-lowest pb-safe sm:hidden"
      >
        <div className="flex items-stretch">
          {NAV_ONGLETS_MOBILE.map((item) => {
            const actif = estActif(item.href, chemin);
            const alertes = item.href.endsWith("/notifications") ? unread : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={actif ? "page" : undefined}
                aria-label={
                  alertes > 0 ? `${item.label}, ${alertes} non lues` : undefined
                }
                className={cn(
                  "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors",
                  actif ? "text-primary" : "text-on-surface-variant",
                )}
              >
                {/* Trait supérieur plutôt qu'un fond : il marque l'onglet sans
                    élargir la cible ni assombrir l'icône. */}
                {actif && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-secondary" />
                )}
                <span className="relative">
                  <Icon name={item.icon} filled={actif} className="text-2xl" />
                  {alertes > 0 && (
                    /*
                     * Pastille chiffrée, posée sur l'icône. Le nombre est
                     * VOLONTAIREMENT redondant avec `aria-label` : un lecteur
                     * d'écran ne lira pas ce `span` décoratif au milieu du
                     * libellé de l'onglet.
                     */
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-on-error"
                    >
                      {alertes > 9 ? "9+" : alertes}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.court ?? item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setPlusOuvert(true)}
            aria-expanded={plusOuvert}
            aria-haspopup="dialog"
            className={cn(
              "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors",
              ailleurs ? "text-primary" : "text-on-surface-variant",
            )}
          >
            {ailleurs && (
              <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-secondary" />
            )}
            <Icon name="menu" className="text-2xl" />
            <span>Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}

/**
 * Feuille du bas — le reste des destinations.
 *
 * Ancrée en BAS et non au centre : elle s'ouvre là où le pouce vient de
 * toucher, et les entrées restent dans la moitié atteignable de l'écran.
 */
function FeuillePlus({ chemin, onClose }: { chemin: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
        className="absolute inset-0 bg-primary/50 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-label="Plus de destinations"
        className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto overscroll-contain rounded-t-xl border-t border-outline-variant bg-surface-container-lowest pb-safe"
      >
        {/* Poignée : dit que le panneau se referme, avant même de chercher où. */}
        <div className="flex justify-center py-3">
          <span className="h-1 w-10 rounded-full bg-outline-variant" />
        </div>

        <GroupeFeuille titre="Ma recherche" destinations={NAV_PLUS_RECHERCHE} chemin={chemin} />
        <GroupeFeuille titre="Mon compte" destinations={NAV_COMPTE} chemin={chemin} />

        <div className="border-t border-outline-variant">
          <LogoutButton className="flex w-full min-h-14 items-center gap-3 px-4 text-sm font-semibold text-on-surface-variant" />
        </div>
      </div>
    </div>
  );
}

function GroupeFeuille({
  titre,
  destinations,
  chemin,
}: {
  titre: string;
  destinations: readonly Destination[];
  chemin: string;
}) {
  return (
    <div className="border-t border-outline-variant py-1 first:border-t-0">
      <p className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {titre}
      </p>
      {destinations.map((item) => {
        const actif = estActif(item.href, chemin);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "flex min-h-14 items-center gap-3 px-4 text-sm font-semibold",
              actif ? "text-primary" : "text-on-surface",
            )}
          >
            <Icon name={item.icon} filled={actif} className="text-[22px]" />
            {item.label}
            {actif && <Icon name="check" className="ml-auto text-[18px] text-secondary" />}
          </Link>
        );
      })}
    </div>
  );
}
