"use client";

/**
 * Matrice de permissions d'un rôle.
 *
 * ── Groupée par domaine, et non à plat ──────────────────────────────────────
 *
 * Une vingtaine de cases sans structure se cochent au hasard. Regroupées par
 * domaine — comptes, contenus, administration —, elles se lisent comme les
 * rubriques du menu, c'est-à-dire comme ce que le rôle pourra réellement ouvrir.
 *
 * ── Les libellés viennent du serveur ────────────────────────────────────────
 *
 * Le catalogue est servi par `GET /admin/permissions`. Recopier ici la liste
 * des codes créerait deux sources à maintenir : le jour où une permission est
 * ajoutée au serveur, l'écran ne la proposerait pas — et personne ne pourrait
 * l'attribuer.
 *
 * ── « Modifier » entraîne « Consulter » ─────────────────────────────────────
 *
 * Cocher `faq:write` seul produisait un rôle capable d'écrire dans la FAQ mais
 * incapable de l'ouvrir : `GET /admin/faq` exige `faq:read`. C'était un piège
 * silencieux — le rôle semblait correct et l'écran renvoyait 403. La case
 * d'écriture coche donc sa lecture, et décocher la lecture retire l'écriture.
 * La règle est DÉDUITE des codes (`<ressource>:read` / `<ressource>:write`) et
 * ne s'applique que si la lecture existe au catalogue : `formations:write` n'a
 * pas de pendant, le catalogue de formations étant public.
 */
import { Icon, ProgressBar } from "@/components/ui";
import type { ApiPermissionGroup, Permission } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Lecture exigée par un code d'écriture, si elle figure au catalogue. */
function prerequisDe(code: Permission, catalogue: Set<string>): Permission | null {
  if (!code.endsWith(":write")) return null;
  const lecture = code.replace(/:write$/, ":read");
  return catalogue.has(lecture) ? lecture : null;
}

/** Réciproque : l'écriture qui deviendrait inexploitable sans cette lecture. */
function dependantDe(code: Permission, catalogue: Set<string>): Permission | null {
  if (!code.endsWith(":read")) return null;
  const ecriture = code.replace(/:read$/, ":write");
  return catalogue.has(ecriture) ? ecriture : null;
}

export function PermissionMatrix({
  groupes,
  valeur,
  onChange,
  /** Rôle système : ses droits sont calculés, la matrice n'est plus qu'un état des lieux. */
  lectureSeule = false,
}: {
  groupes: ApiPermissionGroup[];
  valeur: Permission[];
  onChange: (permissions: Permission[]) => void;
  lectureSeule?: boolean;
}) {
  const coche = new Set(valeur);
  const catalogue = new Set(groupes.flatMap((g) => g.permissions.map((p) => p.code)));

  const basculer = (code: Permission) => {
    const suivant = new Set(coche);

    if (suivant.has(code)) {
      suivant.delete(code);
      const orpheline = dependantDe(code, catalogue);
      if (orpheline) suivant.delete(orpheline);
    } else {
      suivant.add(code);
      const requise = prerequisDe(code, catalogue);
      if (requise) suivant.add(requise);
    }

    onChange([...suivant]);
  };

  /**
   * Tout ou rien sur un domaine.
   *
   * « Tout cocher » d'abord : accorder un domaine entier est le geste courant
   * (« il s'occupe des contenus »), le retrait sélectif vient ensuite.
   */
  const basculerGroupe = (groupe: ApiPermissionGroup, tout: boolean) => {
    const codes = groupe.permissions.map((p) => p.code);
    const suivant = new Set(coche);
    codes.forEach((code) => (tout ? suivant.add(code) : suivant.delete(code)));
    onChange([...suivant]);
  };

  return (
    <div className="space-y-3">
      {groupes.map((groupe) => {
        const codes = groupe.permissions.map((p) => p.code);
        const retenues = codes.filter((code) => coche.has(code)).length;
        const toutes = retenues === codes.length;

        return (
          <fieldset
            key={groupe.cle}
            className={cn(
              "rounded-xl border bg-surface-container-lowest transition-colors",
              retenues > 0 ? "border-primary/30" : "border-outline-variant",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant px-4 py-3">
              <div className="min-w-0">
                <legend className="text-sm font-semibold text-on-surface">
                  {groupe.libelle}
                </legend>
                <p className="text-xs text-on-surface-variant">{groupe.description}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {/* Le compte du domaine plutôt que le seul total : c'est à ce
                    niveau qu'on décide, et c'est là qu'on relit son choix. */}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    retenues > 0
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-container text-on-surface-variant",
                  )}
                >
                  {retenues} / {codes.length}
                </span>
                {!lectureSeule && (
                  <button
                    type="button"
                    onClick={() => basculerGroupe(groupe, !toutes)}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    {toutes ? "Tout décocher" : "Tout cocher"}
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {groupe.permissions.map((permission) => {
                const actif = coche.has(permission.code);
                const requise = prerequisDe(permission.code, catalogue);

                return (
                  <label
                    key={permission.code}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                      actif
                        ? "border-primary/30 bg-primary/5"
                        : "border-transparent bg-surface-container-low",
                      lectureSeule
                        ? "cursor-default"
                        : "cursor-pointer hover:border-outline-variant hover:bg-surface-container",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={actif}
                      disabled={lectureSeule}
                      onChange={() => basculer(permission.code)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-outline text-primary focus:ring-primary disabled:opacity-60"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-on-surface">
                        {permission.libelle}
                      </span>
                      {/* Le code est montré : c'est lui que nomme le 403 du
                          serveur, il doit être rapprochable sans deviner. */}
                      <code className="block truncate text-[11px] text-on-surface-variant">
                        {permission.code}
                      </code>
                      {requise && !lectureSeule && (
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant">
                          <Icon name="link" className="text-[12px]" />
                          entraîne « consulter »
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {lectureSeule && (
        <p className="flex items-start gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
          <Icon name="lock" className="mt-0.5 shrink-0 text-[14px]" />
          Les permissions du rôle système suivent automatiquement le catalogue : elles ne se
          modifient pas.
        </p>
      )}
    </div>
  );
}

/** Nombre total de permissions au catalogue — dénominateur de « 7 / 18 ». */
export function compterPermissions(groupes: ApiPermissionGroup[]): number {
  return groupes.reduce((total, groupe) => total + groupe.permissions.length, 0);
}

/** Barre de couverture, affichée dans la colonne « Portée » de l'éditeur. */
export function CouverturePermissions({
  retenues,
  total,
  className,
}: {
  retenues: number;
  total: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-on-surface tabular-nums">
          {retenues} permission{retenues > 1 ? "s" : ""}
        </span>
        {total > 0 && <span className="text-on-surface-variant tabular-nums">sur {total}</span>}
      </div>
      <ProgressBar value={total > 0 ? (retenues / total) * 100 : 0} />
    </div>
  );
}
