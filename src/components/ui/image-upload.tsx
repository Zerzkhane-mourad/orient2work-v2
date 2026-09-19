"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";
import { ImageCropper, type CropSettings } from "./image-cropper";
import { useProtectedImage } from "@/lib/api/media";
import { assertImageFile, blobToDataUrl, fileToResizedDataUrl, ImageError } from "@/lib/image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  /** Aperçu redimensionné, pour l'affichage immédiat. */
  onChange: (dataUrl: string | undefined) => void;
  /**
   * Fichier d'origine, à transmettre tel quel à l'API.
   *
   * L'aperçu est une data URL (pratique pour l'affichage), mais le backend
   * attend un vrai fichier en `multipart/form-data` : il en vérifie le type
   * MIME, l'extension et la signature binaire.
   */
  onFile?: (file: File | undefined) => void;
  /** "circle" for avatars, "wide" for cover banners. */
  shape?: "circle" | "wide";
  maxWidth: number;
  maxHeight: number;
  hint?: string;
  /** Shown inside the empty state. */
  emptyLabel?: string;
  /**
   * Active le rognage : chaque image choisie passe par le rogneur avant d'être
   * retenue, et l'image en place peut être recadrée. `onFile` reçoit alors le
   * fichier RECADRÉ.
   */
  crop?: CropSettings;
  /** Prévenu à l'ouverture et à la fermeture du rogneur (pour bloquer « Enregistrer »). */
  onCroppingChange?: (cropping: boolean) => void;
}

interface CropSource {
  src: string;
  filename: string;
}

/** Pick an image from the device (click or drag & drop), preview and remove it. */
export function ImageUpload({
  value,
  onChange,
  onFile,
  shape = "wide",
  maxWidth,
  maxHeight,
  hint,
  emptyLabel = "Choisir une image",
  crop,
  onCroppingChange,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Une image déjà enregistrée est servie par une route protégée : on
  // l'affiche (et on la recadre) via son URL `blob:`.
  const preview = useProtectedImage(value);

  // Dernière image choisie, en pleine résolution : recadrer une seconde fois
  // repart de l'original, pas du résultat déjà réduit.
  const [original, setOriginal] = useState<CropSource | null>(null);
  const [cropping, setCropping] = useState<CropSource | null>(null);

  useEffect(() => {
    onCroppingChange?.(cropping !== null);
  }, [cropping, onCroppingChange]);

  // Les URLs `blob:` des originaux restent en mémoire tant qu'on ne les libère pas.
  useEffect(() => {
    if (!original) return;
    return () => URL.revokeObjectURL(original.src);
  }, [original]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);

    if (crop) {
      try {
        assertImageFile(file);
      } catch (e) {
        setError(e instanceof ImageError ? e.message : "Le chargement de l'image a échoué.");
        return;
      }
      const source = { src: URL.createObjectURL(file), filename: file.name };
      setOriginal(source);
      setCropping(source);
      return;
    }

    setBusy(true);
    try {
      onChange(await fileToResizedDataUrl(file, { maxWidth, maxHeight }));
      onFile?.(file);
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "Le chargement de l'image a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const applyCrop = async (file: File) => {
    onChange(await blobToDataUrl(file));
    onFile?.(file);
    setCropping(null);
  };

  const recrop = () => {
    if (original) setCropping(original);
    else if (preview) setCropping({ src: preview, filename: "image.jpg" });
  };

  if (crop && cropping) {
    return (
      <ImageCropper
        key={cropping.src}
        src={cropping.src}
        filename={cropping.filename}
        {...crop}
        onCancel={() => setCropping(null)}
        onDone={(file) => void applyCrop(file)}
      />
    );
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "relative flex cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed transition-colors",
          dragging
            ? "border-secondary bg-secondary-container/20"
            : "border-outline-variant hover:border-secondary",
          shape === "circle"
            ? "mx-auto h-36 w-36 rounded-full"
            : cn("w-full rounded-lg", !crop && "h-40"),
        )}
        // Avec rognage, l'aperçu a exactement le format du cadre.
        style={shape === "wide" && crop ? { aspectRatio: crop.aspect } : undefined}
      >
        {preview ? (
          // Data/blob URLs from the device — next/image adds no value here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 px-4 text-center text-on-surface-variant">
            <Icon name="cloud_upload" className="text-3xl text-secondary" />
            <p className="text-sm font-semibold">{emptyLabel}</p>
            <p className="text-xs">Glissez-déposez ou cliquez</p>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/40 text-white">
            <Icon name="progress_activity" className="animate-spin text-2xl" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-on-surface-variant">{error ? "" : hint}</p>
        <div className="flex gap-3">
          {crop && preview && (
            <button
              type="button"
              onClick={recrop}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Icon name="crop" className="text-[14px]" /> Rogner
            </button>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {value ? "Remplacer" : "Parcourir"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                onFile?.(undefined);
                setOriginal(null);
                setError(null);
              }}
              className="text-xs font-semibold text-error hover:underline"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-error">
          <Icon name="warning" className="text-[14px]" /> {error}
        </p>
      )}
    </div>
  );
}
