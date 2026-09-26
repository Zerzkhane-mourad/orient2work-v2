"use client";

import { useCallback, useId, useState } from "react";
import { Icon, ImageUpload } from "@/components/ui";
import { apercuDepuisCouleur } from "@/features/entreprise/theme-from-color";
import { couleursDuFichier, type Swatch } from "@/lib/color";
import { cn } from "@/lib/utils";

/** Ce que le formulaire d'inscription transmet à l'API. */
export interface LogoEntreprise {
  fichier: File;
  /** Couleur principale retenue, en hexadécimal. Absente si le logo est gris. */
  couleur?: string;
  accent?: string;
}

interface LogoEntrepriseFieldProps {
  value: LogoEntreprise | null;
  onChange: (valeur: LogoEntreprise | null) => void;
  /** Message renvoyé par le serveur pour le champ `logo`. */
  error?: string;
}

/**
 * Logo de l'entreprise à l'inscription — obligatoire, et source du thème.
 *
 * Le logo n'est pas ici qu'une image de profil : les couleurs qu'on y relève
 * donnent sa palette à l'espace entreprise. C'est ce que montre l'aperçu, et
 * c'est la raison pour laquelle on le demande dès l'inscription plutôt que dans
 * les paramètres — un espace qui s'ouvre déjà aux couleurs de la marque n'a pas
 * à être configuré pour le devenir.
 *
 * Les couleurs sont relevées DANS LE NAVIGATEUR (canevas), pas sur le serveur :
 * l'entreprise voit le thème avant de valider, et le serveur n'a ni à décoder
 * l'image ni à embarquer une bibliothèque pour cela — il reçoit deux
 * hexadécimaux qu'il valide comme n'importe quel autre champ.
 */
export function LogoEntrepriseField({ value, onChange, error }: LogoEntrepriseFieldProps) {
  const [apercu, setApercu] = useState<string | undefined>();
  const [couleurs, setCouleurs] = useState<Swatch[]>([]);
  const [analyse, setAnalyse] = useState(false);
  const titreId = useId();

  const choisirFichier = useCallback(
    async (fichier: File | undefined) => {
      if (!fichier) {
        setCouleurs([]);
        onChange(null);
        return;
      }

      setAnalyse(true);
      try {
        const releve = await couleursDuFichier(fichier, 4);
        setCouleurs(releve);
        onChange({
          fichier,
          // Un logo strictement noir et blanc ne donne aucune teinte : le compte
          // démarrera sur la palette par défaut, ce que dit l'encart plus bas.
          couleur: releve[0]?.hex,
          accent: releve[1]?.hex,
        });
      } catch {
        // Image illisible : `ImageUpload` a déjà refusé le fichier et affiché
        // son propre message. Il n'y a pas de second message à donner ici.
        setCouleurs([]);
        onChange(null);
      } finally {
        setAnalyse(false);
      }
    },
    [onChange],
  );

  /** Promeut une couleur relevée au rang de couleur principale. */
  const choisirCouleur = (hex: string) => {
    if (!value) return;
    onChange({
      ...value,
      couleur: hex,
      // L'accent reprend la première AUTRE couleur : garder l'ancien accent
      // permettrait de désigner deux fois la même teinte.
      accent: couleurs.find((c) => c.hex !== hex)?.hex,
    });
  };

  const theme = value?.couleur
    ? apercuDepuisCouleur({ couleur: value.couleur, accent: value.accent })
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <label id={titreId} className="text-sm font-semibold text-on-surface">
          Logo de l&apos;entreprise <span className="text-error">*</span>
        </label>
        {analyse && (
          <span className="flex items-center gap-1 text-xs text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-[14px]" />
            Lecture des couleurs…
          </span>
        )}
      </div>

      <ImageUpload
        value={apercu}
        onChange={setApercu}
        onFile={(fichier) => void choisirFichier(fichier)}
        shape="wide"
        maxWidth={512}
        maxHeight={512}
        emptyLabel="Ajouter votre logo"
        hint="JPG, PNG ou WebP — 5 Mo maximum."
      />

      {error && (
        <p className="flex items-center gap-1 text-xs text-error">
          <Icon name="warning" className="text-[14px]" /> {error}
        </p>
      )}

      {value && couleurs.length > 0 && theme && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
          <p className="text-xs font-semibold text-on-surface">
            Votre espace reprendra ces couleurs
          </p>

          <div className="mt-3 flex items-center gap-3">
            <ApercuEspace {...theme} />
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-on-surface-variant">
                {couleurs.length > 1
                  ? "Cliquez pour changer de couleur principale."
                  : "Couleur relevée dans votre logo."}
              </span>
              <div className="flex gap-1.5">
                {couleurs.map((swatch) => {
                  const actif = swatch.hex === value.couleur;
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => choisirCouleur(swatch.hex)}
                      aria-label={`Couleur principale ${swatch.hex}`}
                      aria-pressed={actif}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-transform",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1",
                        actif
                          ? "border-on-surface scale-110"
                          : "border-outline-variant hover:scale-110",
                      )}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-on-surface-variant">
            Vous pourrez en changer à tout moment dans vos paramètres.
          </p>
        </div>
      )}

      {value && couleurs.length === 0 && !analyse && (
        <p className="rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
          Aucune couleur dominante dans ce logo : votre espace gardera la palette par défaut,
          que vous pourrez changer dans vos paramètres.
        </p>
      )}
    </div>
  );
}

/** Miniature de l'espace — mêmes formes que l'aperçu du sélecteur de thème. */
function ApercuEspace({
  primaire,
  accent,
  fond,
}: {
  primaire: string;
  accent: string;
  fond: string;
}) {
  return (
    <span
      aria-hidden
      className="flex h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-outline-variant"
      style={{ backgroundColor: fond }}
    >
      <span className="flex w-1/3 flex-col gap-1.5 bg-white p-2">
        <span className="h-1.5 w-full rounded-full" style={{ backgroundColor: accent }} />
        <span className="h-1.5 w-3/4 rounded-full bg-black/10" />
        <span className="h-1.5 w-2/3 rounded-full bg-black/10" />
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-2">
        <span className="h-2 w-2/3 rounded-full" style={{ backgroundColor: primaire }} />
        <span className="mt-auto h-4 w-1/2 rounded-md" style={{ backgroundColor: primaire }} />
      </span>
    </span>
  );
}
