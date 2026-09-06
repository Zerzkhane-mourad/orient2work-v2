"use client";

/**
 * Fiche d'un jeune, vue administrateur.
 *
 * Complète la liste de `/admin/jeunes`, qui ne montre que l'essentiel : ici on
 * dispose de tout ce sur quoi porte une décision de validation — coordonnées,
 * parcours, score au test, avancement des formations.
 *
 * L'API sert la vue COMPLÈTE (email, téléphone, liens) à un administrateur, là
 * où une entreprise ne reçoit que la vue publique. Les mêmes actions de statut
 * qu'en liste sont disponibles ici, pour décider sans faire l'aller-retour.
 */
import { use } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Chip,
  ErrorBanner,
  ErrorState,
  Icon,
  LoadingState,
  ProgressBar,
  ProtectedImage,
  RetourLien,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { QUIZ_PASS_SCORE } from "@/lib/constants";
import type { JeuneStatus } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";

export default function AdminJeuneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const {
    data: jeune,
    loading,
    error,
    refetch,
    setData,
  } = useApi(() => api.admin.jeuneById(id), [id]);

  const { run: setStatus, pending, error: actionError } = useMutation(api.admin.setJeuneStatus);

  const changerStatut = async (next: JeuneStatus) => {
    const updated = await setStatus(id, next);
    // La réponse porte le profil à jour : inutile de recharger toute la fiche.
    if (updated) setData(updated);
  };

  if (loading) return <LoadingState label="Chargement du profil…" />;

  if (error || !jeune) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RetourLien href="/admin/jeunes">Retour à la liste</RetourLien>

      {actionError && <ErrorBanner error={actionError} />}

      {/* En-tête : identité, statut et décisions */}
      <Card className="overflow-hidden">
        {/* `jeune` est garanti non nul ici : la garde de chargement est au-dessus. */}
        <ProtectedImage src={jeune.banniere} className="h-32 w-full object-cover" />
        <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar src={jeune.photo} alt={`${jeune.prenom} ${jeune.nom}`} size={96} />

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline text-2xl font-bold text-primary">
                {jeune.prenom} {jeune.nom}
              </h1>
              <StatusBadge kind="jeune" status={jeune.status} />
            </div>
            {jeune.titre && <p className="font-semibold text-on-surface-variant">{jeune.titre}</p>}

            {/* Coordonnées : réservées à l'admin et au jeune lui-même. */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
              <a
                href={`mailto:${jeune.email}`}
                className="flex items-center gap-1 hover:text-primary"
              >
                <Icon name="mail" className="text-[16px]" /> {jeune.email}
              </a>
              {jeune.telephone && (
                <span className="flex items-center gap-1">
                  <Icon name="call" className="text-[16px]" /> {jeune.telephone}
                </span>
              )}
              {jeune.ville && (
                <span className="flex items-center gap-1">
                  <Icon name="location_on" className="text-[16px]" /> {jeune.ville}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-52">
            {/* La validation manuelle sert aux cas traités hors ligne par OMB. */}
            {jeune.status !== "valide" && (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => void changerStatut("valide")}
              >
                <Icon name="check_circle" className="text-[18px]" /> Valider le compte
              </Button>
            )}
            {jeune.status !== "suspendu" ? (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void changerStatut("suspendu")}
              >
                <Icon name="block" className="text-[18px]" /> Suspendre
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void changerStatut("inscrit")}
              >
                <Icon name="undo" className="text-[18px]" /> Réactiver
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {jeune.bio && (
            <Card>
              <CardHeader>
                <CardTitle>Présentation</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-line text-sm text-on-surface">{jeune.bio}</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Parcours académique</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Champ label="Niveau d'études" valeur={jeune.niveauEtudes} />
                <Champ label="Établissement" valeur={jeune.etablissement} />
                <Champ label="Filière" valeur={jeune.filiere} />
                <Champ label="Spécialité" valeur={jeune.specialite} />
                <Champ label="Année d'étude" valeur={jeune.anneeEtude} />
                <Champ label="Diplôme" valeur={jeune.diplome} />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expériences</CardTitle>
              <span className="text-xs text-on-surface-variant">
                {jeune.experiences.length} entrée(s)
              </span>
            </CardHeader>
            <CardBody className="space-y-4">
              {jeune.experiences.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Aucune expérience renseignée.</p>
              ) : (
                jeune.experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="border-b border-outline-variant pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-primary">{exp.titre}</h3>
                      <Badge tone="neutral">{exp.type}</Badge>
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      {exp.structure} • {exp.periode}
                    </p>
                    {exp.description && (
                      <p className="mt-1 text-sm text-on-surface">{exp.description}</p>
                    )}
                    {exp.competences.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {exp.competences.map((c) => (
                          <Chip key={c} className="text-xs">
                            {c}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compétences &amp; langues</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {jeune.competences.length === 0 && jeune.langues.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Rien de renseigné.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {jeune.competences.map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {jeune.langues.map((l) => (
                      <Badge key={l} tone="primary" icon="translate">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Colonne de synthèse : ce qui fonde la décision de validation */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Indicateurs</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">Profil complété</span>
                  <span className="font-bold text-primary">{jeune.profilCompletion}%</span>
                </div>
                {/* Calculé par le serveur, jamais stocké ni recalculé ici. */}
                <ProgressBar value={jeune.profilCompletion} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                {/*
                  Le score est le fondement de la décision de validation : il
                  s'affichait NU. « 65 % » ne dit pas si le compte peut être
                  validé tant qu'on ne connaît pas le seuil par cœur — le voici,
                  à côté du chiffre qu'il qualifie.
                */}
                <Indicateur
                  valeur={typeof jeune.scoreQuiz === "number" ? `${jeune.scoreQuiz}%` : "—"}
                  label="Score au test"
                  aide={`Seuil ${QUIZ_PASS_SCORE} %`}
                />
                <Indicateur valeur={String(jeune.score)} label="Employabilité" />
                <Indicateur valeur={String(jeune.formationsCompletees)} label="Formations" />
                <Indicateur valeur={String(jeune.candidatures)} label="Candidatures" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liens</CardTitle>
            </CardHeader>
            <CardBody>
              {jeune.liens.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Aucun lien renseigné.</p>
              ) : (
                <ul className="space-y-2">
                  {jeune.liens.map((lien) => (
                    <li key={lien.id}>
                      <a
                        href={lien.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Icon name="link" className="text-[16px]" />
                        <span className="truncate">{lien.type}</span>
                        <Icon name="open_in_new" className="ml-auto text-[14px] shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-start gap-3 text-sm text-on-surface-variant">
              <Icon name="info" className="mt-0.5 shrink-0 text-secondary" />
              <p>
                Le CV n&apos;est consultable que depuis une candidature : le serveur refuse tout
                autre accès, y compris à un administrateur.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Ligne d'une liste de définitions ; « — » quand le champ n'est pas renseigné. */
function Champ({ label, valeur }: { label: string; valeur?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </dt>
      <dd className="text-sm text-on-surface">{valeur || "—"}</dd>
    </div>
  );
}

function Indicateur({ valeur, label, aide }: { valeur: string; label: string; aide?: string }) {
  return (
    <div className="rounded-xl bg-surface-container px-3 py-2">
      <p className="font-headline text-xl font-bold text-primary">{valeur}</p>
      <p className="text-[10px] font-semibold uppercase text-on-surface-variant">{label}</p>
      {aide && <p className="text-[10px] text-on-surface-variant">{aide}</p>}
    </div>
  );
}
