"use client";

/**
 * Téléversement d'une illustration de cours.
 *
 * Trois gestes mènent au même endroit — le bouton de la barre d'outils, le
 * glisser-déposer, le collage — et ils partagent donc UNE seule implémentation.
 * Recopiée trois fois, la validation aurait divergé au premier ajustement, et
 * l'un des trois chemins aurait fini par accepter ce que les deux autres
 * refusent.
 *
 * Le contrôle fait ici est un CONFORT, pas une sécurité : le serveur revérifie
 * type MIME, extension, signature binaire et taille. L'intérêt est de dire
 * « trop lourd » tout de suite plutôt qu'après avoir transféré six mégaoctets.
 */
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { humanizeError } from "@/lib/api/errors";

/**
 * Miroir de la liste du serveur (`backend/src/lib/upload.ts`, type `FORMATION`).
 *
 * Pas de SVG, volontairement : ces images sont servies SANS authentification,
 * et un SVG peut embarquer du JavaScript qui s'exécuterait alors dans l'origine
 * de l'API.
 */
export const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"] as const;

/** Miroir de `UPLOAD_MAX_SIZE_BYTES`. */
const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;

export interface TeleversementImage {
  /** `true` pendant l'envoi : les commandes d'insertion s'en servent. */
  envoiEnCours: boolean;
  /** Dernier échec, déjà mis en français ; `null` si tout va bien. */
  erreur: string | null;
  /**
   * Envoie le fichier et renvoie son URL, ou `null` si l'envoi a échoué.
   * L'appelant décide où insérer le résultat.
   */
  televerser: (fichier: File) => Promise<string | null>;
  /** Écarte un fichier qui n'est pas une image exploitable. */
  estImageAcceptee: (fichier: File) => boolean;
}

export function useTeleversementImage(): TeleversementImage {
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const estImageAcceptee = useCallback(
    (fichier: File) => (TYPES_IMAGE as readonly string[]).includes(fichier.type),
    [],
  );

  const televerser = useCallback(async (fichier: File): Promise<string | null> => {
    setErreur(null);

    if (!estImageAcceptee(fichier)) {
      setErreur("Format non pris en charge. Utilisez JPG, PNG ou WebP.");
      return null;
    }
    if (fichier.size > TAILLE_MAX_OCTETS) {
      setErreur(`Image trop lourde (${Math.round(fichier.size / 1024 / 1024)} Mo). 5 Mo maximum.`);
      return null;
    }

    setEnvoiEnCours(true);
    try {
      const media = await api.admin.uploadFormationMedia(fichier);
      return media.url;
    } catch (echec) {
      setErreur(humanizeError(echec));
      return null;
    } finally {
      setEnvoiEnCours(false);
    }
  }, [estImageAcceptee]);

  return { envoiEnCours, erreur, televerser, estImageAcceptee };
}

/** Première image d'un transfert — glisser-déposer ou presse-papiers. */
export function premiereImage(
  transfert: DataTransfer | null,
  accepte: (fichier: File) => boolean,
): File | null {
  if (!transfert?.files?.length) return null;
  return Array.from(transfert.files).find(accepte) ?? null;
}
