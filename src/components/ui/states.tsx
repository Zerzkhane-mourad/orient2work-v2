"use client";

/**
 * États de chargement et d'erreur.
 *
 * Toute page connectée à l'API doit rendre l'un de ces trois états : jamais
 * d'écran blanc pendant le chargement, jamais de page qui casse parce que
 * l'API a répondu 403 ou 500.
 */
import { ApiError, humanizeError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Card, CardBody } from "./card";
import { Icon, type IconName } from "./icon";

// ── Squelettes ───────────────────────────────────────────────────────────────

/** Bloc gris animé, aux dimensions du contenu attendu. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-surface-container-highest", className)}
      aria-hidden
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          // La dernière ligne plus courte : imite un paragraphe réel.
          className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <SkeletonText lines={2} />
      </CardBody>
    </Card>
  );
}

export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Chargement en cours">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

// ── Chargement ───────────────────────────────────────────────────────────────

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant"
      role="status"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-outline-variant border-t-secondary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ── Erreur ───────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  error: unknown;
  /** Affiche un bouton « Réessayer » quand l'action a du sens. */
  onRetry?: () => void;
  className?: string;
}

/** Icône et titre adaptés à la nature de l'erreur. */
function describe(error: unknown): { icon: IconName; title: string; retryable: boolean } {
  if (!(error instanceof ApiError)) {
    return { icon: "error", title: "Une erreur est survenue", retryable: true };
  }
  if (error.isNotFound) {
    return { icon: "search_off", title: "Introuvable", retryable: false };
  }
  if (error.isForbidden) {
    return { icon: "lock", title: "Accès refusé", retryable: false };
  }
  if (error.isAuthError) {
    return { icon: "logout", title: "Session expirée", retryable: false };
  }
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") {
    return { icon: "wifi_off", title: "Connexion impossible", retryable: true };
  }
  if (error.code === "RATE_LIMITED") {
    return { icon: "hourglass_top", title: "Trop de tentatives", retryable: false };
  }
  return { icon: "error", title: "Une erreur est survenue", retryable: true };
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const { icon, title, retryable } = describe(error);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-6 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-on-error-container">
        <Icon name={icon} />
      </span>
      <h3 className="font-headline text-lg font-bold text-primary">{title}</h3>
      <p className="max-w-md text-sm text-on-surface-variant">{humanizeError(error)}</p>
      {onRetry && retryable && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          <Icon name="refresh" className="text-[18px]" /> Réessayer
        </Button>
      )}
    </div>
  );
}

/** Bandeau d'erreur compact, pour les formulaires. */
export function ErrorBanner({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container",
        className,
      )}
      role="alert"
    >
      <Icon name="error" className="mt-0.5 shrink-0 text-[18px]" />
      <span>{humanizeError(error)}</span>
    </div>
  );
}

/** Bandeau de succès, même gabarit que `ErrorBanner`. */
export function SuccessBanner({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg bg-success-container px-4 py-3 text-sm font-medium text-success",
        className,
      )}
      role="status"
    >
      <Icon name="check_circle" filled className="mt-0.5 shrink-0 text-[18px]" />
      <span>{message}</span>
    </div>
  );
}
