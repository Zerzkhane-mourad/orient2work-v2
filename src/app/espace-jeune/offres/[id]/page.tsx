"use client";

/**
 * Fiche d'une offre (espace jeune).
 *
 * Deux colonnes, comme une annonce d'emploi bien faite :
 *  • à gauche, ce qu'on LIT — l'entreprise, reconnaissable à son logo, puis
 *    l'annonce, les compétences, et de quoi la transmettre ;
 *  • à droite, ce qu'on DÉCIDE — l'offre en bref et le bouton pour postuler,
 *    collants au défilement : on n'a pas à remonter une longue annonce pour
 *    candidater.
 *
 * La carte « faits » en grille de six cases disparaît : ses informations
 * vivent maintenant dans la colonne de décision, en liste lisible d'un trait.
 */
import { use } from "react";
import Link from "next/link";
import { Avatar, Badge, Card, CardBody, Chip, ErrorState, Icon, LoadingState } from "@/components/ui";
import { OffreActions } from "@/features/offres/offre-actions";
import { PartagerOffre } from "@/features/offres/partager-offre";
import { accentType, BadgeType, joursRestants, Repere } from "@/features/offres/presentation";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { cn, formatDate } from "@/lib/utils";

/** À partir de ce nombre de jours restants, la clôture est signalée. */
const CLOTURE_PROCHE_JOURS = 7;

export default function OffreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: offre, loading, error, refetch } = useApi(() => api.offres.byId(id), [id]);

  // L'API n'expose pas « ai-je déjà candidaté à cette offre ? » : on interroge
  // mes candidatures SUR CETTE OFFRE. Le filtre est appliqué côté serveur — le
  // déduire d'une liste tronquée à 100 donnerait une réponse fausse au-delà.
  const { data: candidatures, refetch: refetchCandidatures } = useApi(
    () => api.candidatures.mine({ offreId: id, perPage: 1 }),
    [id],
  );

  if (loading) return <LoadingState label="Chargement de l'offre…" />;

  if (error || !offre) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const existante = candidatures?.items[0] ?? null;
  const restants = joursRestants(offre.dateLimite);
  const clotureProche = restants <= CLOTURE_PROCHE_JOURS;

  return (
    <div className="space-y-5">
      <Link
        href="/espace-jeune/offres"
        className="group inline-flex items-center gap-1 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
      >
        <Icon
          name="arrow_back"
          className="text-[18px] transition-transform duration-200 group-hover:-translate-x-1"
        />
        Retour aux offres
      </Link>

      {/* ── En-tête : l'entreprise d'abord, par son logo ─────────────────── */}
      <Card className="relative overflow-hidden">
        {/* Liseré à la couleur du type, comme dans la liste : on retrouve la
            même offre d'un écran à l'autre. */}
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", accentType(offre.type))} />
        <CardBody className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar
            src={offre.entreprise.logo}
            alt={`Logo de ${offre.entreprise.nom}`}
            size={88}
            className="shrink-0 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-level-1"
          />

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-bold uppercase tracking-wide text-on-surface-variant">
              {offre.entreprise.nom}
            </p>
            <h1 className="text-balance font-headline text-2xl font-bold leading-tight text-primary sm:text-3xl">
              {offre.titre}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <BadgeType type={offre.type} />
              {offre.filiere && <Badge tone="primary">{offre.filiere}</Badge>}
              {clotureProche && (
                <Badge tone="warning" icon="timer">
                  {restants <= 0 ? "Dernier jour" : `Clôture dans ${restants} j`}
                </Badge>
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1">
                <Icon name="location_on" className="text-[16px] text-primary/70" />
                {offre.ville}
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="laptop" className="text-[16px] text-primary/70" />
                {offre.mode}
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="event" className="text-[16px] text-primary/70" />
                Publiée le {formatDate(offre.publieeLe)}
              </span>
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Colonne de lecture ───────────────────────────────────────── */}
        <div className="min-w-0 space-y-5">
          <Card>
            {/* Barre d'outils de l'annonce : date à gauche, partage à droite,
                comme en tête d'un article. */}
            <div className="flex flex-col gap-3 border-b border-outline-variant px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <h2 className="flex items-center gap-3 font-headline text-lg font-bold text-primary">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon name="description" className="text-[18px]" />
                </span>
                Description du poste
              </h2>
              <PartagerOffre titre={offre.titre} entreprise={offre.entreprise.nom} />
            </div>
            <CardBody className="p-5 sm:p-6">
              {/* Largeur de lecture bornée et interligne aéré : une annonce
                  est un TEXTE, on la lit, on ne la parcourt pas. */}
              <p className="max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-on-surface">
                {offre.description}
              </p>
            </CardBody>
          </Card>

          {offre.competences.length > 0 && (
            <Card>
              <CardBody className="space-y-4 p-5 sm:p-6">
                <h2 className="flex items-center gap-3 font-headline text-lg font-bold text-primary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                    <Icon name="bolt" className="text-[18px]" />
                  </span>
                  Compétences recherchées
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold">
                    {offre.competences.length}
                  </span>
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {offre.competences.map((competence) => (
                    <li key={competence}>
                      <Chip>{competence}</Chip>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        {/*
          ── Colonne de décision, collante ───────────────────────────────

          « Postuler » en TÊTE de colonne, et non sous les faits : c'est
          l'action de la page, elle doit être la première chose vue à droite.
          Sur téléphone, `order-first` la remonte juste sous l'en-tête — elle
          n'arrivait qu'après toute l'annonce, plusieurs écrans plus bas.
        */}
        <aside className="order-first space-y-4 lg:sticky lg:top-20 lg:order-none lg:self-start">
          <OffreActions
            offreId={offre.id}
            existante={existante}
            onApplied={refetchCandidatures}
            dateLimite={offre.dateLimite}
          />

          <Card className="overflow-hidden">
            <CardBody className="space-y-4 p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                L&apos;offre en bref
              </h2>
              {/* Deux colonnes sur téléphone : placée avant l'annonce, la liste
                  ne doit pas la repousser d'un écran entier. */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 lg:grid-cols-1">
                <Repere icon="work" terme="Type de contrat">
                  {offre.type}
                </Repere>
                <Repere icon="laptop" terme="Mode de travail">
                  {offre.mode}
                </Repere>
                <Repere icon="location_on" terme="Lieu">
                  {offre.ville}
                </Repere>
                <Repere icon="school" terme="Niveau demandé">
                  {offre.niveauDemande}
                </Repere>
                <Repere icon="groups" terme="Postes">
                  {offre.nombrePostes} poste{offre.nombrePostes > 1 ? "s" : ""}
                </Repere>
                <Repere icon="event" terme="Date limite">
                  <span className={cn(clotureProche && "font-semibold text-on-warning-container")}>
                    {formatDate(offre.dateLimite)}
                  </span>
                </Repere>
              </dl>
            </CardBody>
          </Card>

          {/* L'entreprise, rappelée à côté du bouton : on postule à QUELQU'UN.
              Sur grand écran seulement — sur téléphone, l'en-tête juste au-dessus
              la montre déjà. */}
          <Card className="hidden lg:block">
            <CardBody className="flex items-center gap-3 p-4">
              <Avatar
                src={offre.entreprise.logo}
                alt=""
                size={44}
                className="shrink-0 rounded-xl border border-outline-variant"
              />
              <div className="min-w-0">
                <p className="truncate font-bold text-primary">{offre.entreprise.nom}</p>
                <p className="flex items-center gap-1 text-xs text-on-surface-variant">
                  <Icon name="location_on" className="text-[14px]" />
                  {offre.entreprise.ville}
                </p>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
