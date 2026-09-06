"use client";

import Link from "next/link";
import { Card, CardBody, Icon, ProgressBar, ProgressRing } from "@/components/ui";
import { useProfile } from "./profil/profile-store";
import { prochainLevier, scoreLevel, scoreParts } from "@/lib/score";

/**
 * Variante pour bandeau sombre (héros des formations) : le score global et,
 * juste en dessous, les points déjà gagnés grâce aux formations.
 */
export function ScoreHeroPanel() {
  const { jeune, score } = useProfile();
  const formations = scoreParts(jeune).find((p) => p.key === "formations")!;

  return (
    <div className="min-w-52 rounded-xl bg-white/10 p-4 backdrop-blur">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-white/80">Score d&apos;employabilité</span>
        <span className="font-bold text-secondary-fixed-dim">{score}/100</span>
      </div>
      <ProgressBar value={score} className="bg-white/20" />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
        <Icon name="school" className="text-[15px] text-secondary-fixed-dim" />
        Formations : {formations.points}/{formations.max} pts · {formations.hint}
      </p>
    </div>
  );
}

/**
 * Score d'employabilité, levier par levier.
 *
 * Chaque ligne est cliquable et mène à l'action qui rapporte les points manquants —
 * les formations pèsent le plus lourd, c'est le levier mis en avant.
 */
export function ScoreCard({ compact = false }: { compact?: boolean }) {
  const { jeune, score } = useProfile();
  const parts = scoreParts(jeune);
  const niveau = scoreLevel(score);
  const levier = prochainLevier(jeune);

  if (compact) {
    return (
      <Link
        href="/espace-jeune/formations"
        className="block border-t border-outline-variant px-4 py-3 transition-colors hover:bg-surface-container-low"
      >
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-semibold text-on-surface">
            <Icon name="bolt" filled className="text-[14px] text-secondary" /> Score
            d&apos;employabilité
          </span>
          <span className="font-bold text-secondary">{score}/100</span>
        </div>
        <ProgressBar value={score} className="h-1.5" />
        <p className="mt-1.5 text-[11px] text-on-surface-variant">
          {levier ? `${levier.action} : +${levier.max - levier.points} pts` : niveau.label}
        </p>
      </Link>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4">
          <ProgressRing value={score} size={72} strokeWidth={8} label={`${score}`} />
          <div>
            <p className="flex items-center gap-1.5 font-bold text-primary">
              <Icon name={niveau.icon} filled className="text-[18px] text-secondary" />
              {niveau.label}
            </p>
            <p className="text-xs text-on-surface-variant">
              Score d&apos;employabilité : {score}/100
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-outline-variant pt-3">
          {parts.map((p) => {
            const complet = p.points >= p.max;
            return (
              <Link
                key={p.key}
                href={p.href}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-container-low"
              >
                <Icon
                  name={complet ? "check_circle" : p.icon}
                  filled={complet}
                  className={`text-[18px] ${complet ? "text-success" : "text-on-surface-variant"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-on-surface">{p.label}</span>
                  <span className="block text-xs text-on-surface-variant">{p.hint}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-primary">
                  {p.points}
                  <span className="text-xs font-normal text-on-surface-variant">/{p.max}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {levier && (
          <Link
            href={levier.href}
            className="flex items-center gap-2 rounded-lg bg-secondary-container px-3 py-2 text-sm font-semibold text-on-secondary-container transition-opacity hover:opacity-90"
          >
            <Icon name="trending_up" className="text-[18px]" />
            <span className="flex-1">
              {levier.action} — jusqu&apos;à +{levier.max - levier.points} points
            </span>
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        )}
      </CardBody>
    </Card>
  );
}
