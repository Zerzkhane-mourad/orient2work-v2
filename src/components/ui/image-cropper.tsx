"use client";

/**
 * Rogneur d'image : on déplace l'image dans un cadre fixe, on zoome, on la
 * tourne par quarts de tour. Le cadre a le format de l'emplacement final
 * (rond pour une photo, bandeau pour une bannière) : ce qu'on voit est ce qui
 * sera affiché.
 */
import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Button } from "./button";
import { Icon } from "./icon";
import { cropImage, ImageError, type CropArea } from "@/lib/image";

export interface CropSettings {
  /** Largeur / hauteur du cadre. */
  aspect: number;
  shape: "round" | "rect";
  /** Largeur maximale de l'image produite, en pixels. */
  outputWidth: number;
}

interface ImageCropperProps extends CropSettings {
  /** URL affichable (`blob:` ou `data:`) de l'image à rogner. */
  src: string;
  filename: string;
  onCancel: () => void;
  onDone: (file: File) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function ImageCropper({
  src,
  filename,
  aspect,
  shape,
  outputWidth,
  onCancel,
  onDone,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<CropArea | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: CropArea, pixels: CropArea) => setArea(pixels), []);

  const apply = async () => {
    if (!area) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await cropImage(src, area, { rotation, maxWidth: outputWidth, filename }));
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "Le recadrage de l'image a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const zoomBy = (delta: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 10) / 10)));

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-72 overflow-hidden rounded-lg bg-inverse-surface sm:h-80">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          cropShape={shape}
          // L'image remplit la zone de travail : une photo en hauteur ne se
          // réduit pas à un mince bandeau quand le cadre est très large.
          objectFit="cover"
          showGrid={shape === "rect"}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
        />
      </div>

      <p className="text-center text-xs text-on-surface-variant">
        Faites glisser l&apos;image pour la cadrer, puis ajustez le zoom.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => zoomBy(-0.2)}
          aria-label="Dézoomer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
        >
          <Icon name="zoom_out" className="text-[20px]" />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="h-1.5 flex-1 cursor-pointer accent-secondary"
        />
        <button
          type="button"
          onClick={() => zoomBy(0.2)}
          aria-label="Zoomer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
        >
          <Icon name="zoom_in" className="text-[20px]" />
        </button>
        <button
          type="button"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          aria-label="Tourner de 90°"
          title="Tourner de 90°"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
        >
          <Icon name="rotate_right" className="text-[20px]" />
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-error">
          <Icon name="warning" className="text-[14px]" /> {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          <Icon name="arrow_back" className="text-[16px]" /> Retour
        </Button>
        <Button variant="primary" size="sm" onClick={() => void apply()} disabled={!area || busy}>
          <Icon name="crop" className="text-[16px]" />
          {busy ? "Recadrage…" : "Appliquer le recadrage"}
        </Button>
      </div>
    </div>
  );
}
