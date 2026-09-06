"use client";

/**
 * Colonne de droite du tableau de bord : qui je suis, ce qui m'attend, ce qui
 * vient.
 *
 * ── Pourquoi une colonne séparée ────────────────────────────────────────────
 *
 * La colonne principale porte des MESURES — des totaux, des taux, des
 * graphiques — qu'on lit à froid. Celle-ci porte des ÉCHÉANCES et des files
 * d'attente, qu'on lit pour agir. Mélanger les deux dans une même grille
 * obligeait à trier du regard à chaque visite ; séparées, chacune se balaye
 * pour ce qu'elle est.
 *
 * Les trois cartes sont PRÉSENTATIONNELLES, à une exception près : les
 * entretiens sont la seule donnée que la page principale n'a pas déjà, ils sont
 * donc chargés ici plutôt que d'être remontés puis redescendus en propriété.
 */
import Link from "next/link";
import {
  Avatar,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DatePill,
  Icon,
  Skeleton,
} from "@/components/ui";
import type { IconName } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { cn } from "@/lib/utils";

/**
 * Nom d'affichage du compte d'administration — le même que celui passé à
 * `AppShell` dans `admin/layout.tsx`. Un compte administrateur n'a pas de fiche
 * de profil (`profileId` vaut `null`) : il n'y a donc aucun nom à lire, et ce
 * libellé d'équipe tient lieu d'identité dans toute l'interface.
 */
const LIBELLE_COMPTE = "Équipe OMB";

/** Constante de module : un tableau recréé à chaque rendu boucle la requête. */
const CONFIRMES = ["accepte"] as const;
const A_VENIR = 4;

/** `YYYY-MM-DD` en heure locale — `toISOString` basculerait en UTC. */
function jourIso(): string {
  const date = new Date();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

// ── Identité ────────────────────────────────────────────────────────────────

const RACCOURCIS: { href: string; icone: IconName; libelle: string }[] = [
  { href: "/admin/messages", icone: "mail", libelle: "Messages reçus" },
  { href: "/admin/entretiens", icone: "event", libelle: "Suivi des entretiens" },
  { href: "/admin/parametres", icone: "settings", libelle: "Paramètres" },
];

/**
 * Carte d'identité de l'administrateur connecté.
 *
 * Un compte administrateur n'a pas de fiche de profil (`profileId` vaut
 * `null`) : son identité tient au libellé d'équipe, repris de la barre
 * supérieure, et à son adresse — le seul identifiant qu'il possède vraiment.
 */
export function CarteProfil() {
  const { user, loading } = useSession();

  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-3 text-center">
        {loading && !user ? (
          <>
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            {/*
              Même identité que la barre supérieure.

              Elle annonce « Équipe OMB / ÉO », cette carte affichait
              « admin@orient2work.ma / A » : deux noms et deux initiales pour un
              seul compte, à trente centimètres l'un de l'autre. Le libellé
              d'équipe passe donc en titre — l'avatar en tire les mêmes
              initiales — et l'adresse, qui reste l'identifiant réel du compte,
              se lit en dessous.
            */}
            <Avatar alt={LIBELLE_COMPTE} size={64} />
            <div className="min-w-0">
              <p className="font-headline text-base font-bold text-primary">{LIBELLE_COMPTE}</p>
              <p className="truncate text-xs text-on-surface-variant">
                {user?.email ?? "Administration OMB"}
              </p>
            </div>
          </>
        )}

        {/* Trois raccourcis, pas trois boutons décoratifs : chacun mène à
            l'écran que la carte laisse deviner. */}
        <div className="flex items-center gap-2 pt-1">
          {RACCOURCIS.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              title={r.libelle}
              aria-label={r.libelle}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              <Icon name={r.icone} className="text-[18px]" />
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

// ── Files d'attente ─────────────────────────────────────────────────────────

export interface FileAttente {
  icone: IconName;
  libelle: string;
  count: number;
  href: string;
}

/**
 * Ce qui attend une décision.
 *
 * Le compteur est le sujet de chaque ligne, d'où sa pastille : à zéro elle
 * reste neutre — une file vide est une bonne nouvelle, pas une alerte —, et
 * passe en rouge dès qu'il y a quelque chose à traiter.
 */
export function CarteATraiter({ files, loading }: { files: FileAttente[]; loading?: boolean }) {
  const total = files.reduce((somme, f) => somme + f.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>À traiter</CardTitle>
        {!loading && (
          <span className="text-xs font-semibold text-on-surface-variant">
            {total === 0 ? "Rien en attente" : `${total} en attente`}
          </span>
        )}
      </CardHeader>
      <CardBody className="space-y-1 pt-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          : files.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-container-low"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                  <Icon name={f.icone} className="text-[18px]" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-on-surface">
                  {f.libelle}
                </span>
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums",
                    f.count > 0
                      ? "bg-error text-on-error"
                      : "bg-surface-container text-on-surface-variant",
                  )}
                >
                  {f.count}
                </span>
              </Link>
            ))}
      </CardBody>
    </Card>
  );
}

// ── Échéances ───────────────────────────────────────────────────────────────

/** Les prochains entretiens confirmés, toutes entreprises confondues. */
export function CarteEntretiens() {
  const { data, loading } = useApi(
    () =>
      api.entretiens.list({
        status: CONFIRMES,
        from: jourIso(),
        ordre: "asc",
        perPage: A_VENIR,
      }),
    [],
  );

  const entretiens = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prochains entretiens</CardTitle>
        <Link
          href="/admin/entretiens"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Tout voir
        </Link>
      </CardHeader>
      <CardBody className="space-y-3 pt-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : entretiens.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Aucun entretien confirmé à venir.</p>
        ) : (
          entretiens.map((e) => (
            <div key={e.id} className="flex items-center gap-3">
              <DatePill date={e.date} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-snug text-on-surface">
                  {e.offreTitre}
                </p>
                <p className="truncate text-xs text-on-surface-variant">
                  {e.heure} · {e.jeune.prenom} {e.jeune.nom} — {e.entreprise.nom}
                </p>
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
