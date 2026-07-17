"use client";

import { useRef, useState } from "react";
import { Icon } from "./icon";
import { fileToResizedDataUrl, ImageError } from "@/lib/image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  /** "circle" for avatars, "wide" for cover banners. */
  shape?: "circle" | "wide";
  maxWidth: number;
  maxHeight: number;
  hint?: string;
  /** Shown inside the empty state. */
  emptyLabel?: string;
}

/** Pick an image from the device (click or drag & drop), preview and remove it. */
export function ImageUpload({
  value,
  onChange,
  shape = "wide",
  maxWidth,
  maxHeight,
  hint,
  emptyLabel = "Choisir une image",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await fileToResizedDataUrl(file, { maxWidth, maxHeight }));
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "Le chargement de l'image a échoué.");
    } finally {
      setBusy(false);
    }
  };

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
          dragging ? "border-secondary bg-secondary-container/20" : "border-outline-variant hover:border-secondary",
          shape === "circle" ? "mx-auto h-36 w-36 rounded-full" : "h-40 w-full rounded-lg",
        )}
      >
        {value ? (
          // Data URLs from the device — next/image adds no value here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Aperçu" className="h-full w-full object-cover" />
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
        <div className="flex gap-2">
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
