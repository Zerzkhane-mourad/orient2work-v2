"use client";

import Link from "next/link";
import { Avatar, Card, Icon, ProgressBar, ProtectedImage, StatusBadge } from "@/components/ui";
import { useProfile } from "./profil/profile-store";
import { ScoreCard } from "./score-card";

/** LinkedIn-style left-rail identity card: cover banner, overlapping avatar, quick stats. */
export function ProfileSummaryCard() {
  // Live profile — photo, banner and completion follow edits made on the profil page.
  const { jeune } = useProfile();

  const quickLinks = [
    { icon: "description", label: "Mes documents", href: "/espace-jeune/documents" },
    { icon: "school", label: "Mes formations", href: "/espace-jeune/formations" },
    { icon: "send", label: "Mes candidatures", href: "/espace-jeune/candidatures" },
  ] as const;

  return (
    <Card className="overflow-hidden">
      {/*
        La bannière est un document PROTÉGÉ. Elle était rendue ici avec l'URL
        brute de l'API : chemin relatif résolu contre l'origine du frontend, et
        sans jeton — d'où une image affichée sur la page profil et sur aucune
        autre. Le commentaire d'origine parlait d'une « data URL de l'appareil »,
        ce qui n'était plus vrai depuis le branchement sur l'API.
      */}
      <ProtectedImage
        src={jeune.banniere}
        className="h-16 w-full object-cover"
        fallback={
          <div className="h-16 bg-gradient-to-r from-inverse-surface via-primary to-surface-tint" />
        }
      />

      <div className="px-4 pb-4">
        {/* Avatar overlapping the banner */}
        <Link href="/espace-jeune/profil" className="-mt-8 mb-2 inline-block">
          <Avatar
            src={jeune.photo}
            alt={`${jeune.prenom} ${jeune.nom}`}
            size={64}
            className="ring-4 ring-surface-container-lowest"
          />
        </Link>

        <Link href="/espace-jeune/profil" className="block">
          <h2 className="font-headline text-lg font-bold text-primary hover:underline">
            {jeune.prenom} {jeune.nom}
          </h2>
        </Link>
        <p className="text-sm text-on-surface-variant">{jeune.titre}</p>
        <div className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
          <Icon name="location_on" className="text-[14px]" /> {jeune.ville}
        </div>
        <div className="mt-3">
          <StatusBadge kind="jeune" status={jeune.status} />
        </div>
      </div>

      {/* Profile completion */}
      <Link
        href="/espace-jeune/profil"
        className="block border-t border-outline-variant px-4 py-3 transition-colors hover:bg-surface-container-low"
      >
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface">Profil complété</span>
          <span className="font-bold text-secondary">{jeune.profilCompletion}%</span>
        </div>
        <ProgressBar value={jeune.profilCompletion} className="h-1.5" />
      </Link>

      {/* Employability score — grows with formations, profile, test and applications */}
      <ScoreCard compact />

      {/* Quick stats */}
      <div className="border-t border-outline-variant px-4 py-3">
        {/* `min-h-11` : c'est un lien, et sur mobile cette carte descend en bas
            de page où on l'atteint au pouce. Deux lignes de 16 px de haut se
            manquent — et l'on touche la statistique voisine, qui n'en est pas
            un lien. */}
        <Link
          href="/espace-jeune/candidatures"
          className="flex min-h-11 items-center justify-between gap-2 text-xs text-on-surface-variant hover:text-primary"
        >
          <span>Candidatures envoyées</span>
          <span className="font-bold text-primary">{jeune.candidatures}</span>
        </Link>
        <div className="flex min-h-8 items-center justify-between gap-2 text-xs text-on-surface-variant">
          <span>Vues du profil cette semaine</span>
          <span className="font-bold text-secondary">27</span>
        </div>
      </div>

      {/* Quick links */}
      <nav className="border-t border-outline-variant py-2">
        {quickLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-11 items-center gap-3 px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <Icon name={l.icon} className="text-[18px]" /> {l.label}
          </Link>
        ))}
      </nav>
    </Card>
  );
}
