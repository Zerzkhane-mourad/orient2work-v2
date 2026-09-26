"use client";

/**
 * Fiche d'un talent, vue recruteur.
 *
 * ── Ce que la fiche taisait ─────────────────────────────────────────────────
 *
 * Le profil rapporté par l'API contenait bien plus que ce qui était affiché :
 *
 *  • la BIO n'apparaissait nulle part — le seul texte où le candidat se
 *    présente avec ses mots ;
 *  • les COMPÉTENCES de chaque expérience étaient chargées puis jetées, alors
 *    qu'elles disent ce qui a réellement été pratiqué, poste par poste ;
 *  • établissement, spécialité, année d'étude et diplôme n'étaient pas rendus ;
 *  • les FORMATIONS se résumaient à « 3 formation(s) validée(s) ». C'est le
 *    seul acquis que la plateforme certifie elle-même, et le recruteur n'en
 *    voyait ni le titre, ni le score, ni le certificat.
 *
 *  • « Employabilité » affichait un nombre nu. Sans ses quatre leviers, un
 *    recruteur le lit comme une note de compétence, alors qu'il mesure surtout
 *    l'activité du candidat sur la plateforme.
 */
import { use, useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Chip,
  ErrorState,
  Icon,
  LoadingState,
  ProgressBar,
} from "@/components/ui";
import { useEntreprise } from "@/features/entreprise/entreprise-store";
import { ProposeEntretienModal } from "@/features/entretiens/propose-entretien-modal";
import { api } from "@/lib/api";
import type { ApiFormationSuivie } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { scoreLevel, scoreParts } from "@/lib/score";

/** « 2026-03-12T… » → « mars 2026 ». Le jour exact n'apprend rien ici. */
const moisAnnee = (iso: string): string =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(iso));

export default function CandidatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isValidated } = useEntreprise();
  const [proposing, setProposing] = useState(false);

  // Vue publique : l'API omet email, téléphone et liens personnels tant que le
  // candidat n'a pas lui-même initié le contact.
  const { data: talent, loading, error, refetch } = useApi(() => api.jeunes.byId(id), [id]);

  if (loading) return <LoadingState label="Chargement du profil…" />;

  if (error || !talent) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const validees = talent.formations.filter((f) => f.valide);
  const enCours = talent.formations.filter((f) => !f.valide);
  const niveau = scoreLevel(talent.score);

  return (
    <div className="space-y-6">
      <Link
        href="/espace-entreprise/talents"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
      >
        <Icon name="arrow_back" className="text-[18px]" /> Retour aux profils
      </Link>

      <Card>
        <CardBody className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Avatar src={talent.photo} alt={`${talent.prenom} ${talent.nom}`} size={96} />
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h1 className="font-headline text-2xl font-bold text-primary">
              {talent.prenom} {talent.nom}
            </h1>
            <p className="font-semibold text-on-surface-variant">{talent.titre}</p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-on-surface-variant sm:justify-start">
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-[16px]" /> {talent.ville}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="school" className="text-[16px]" /> {talent.niveauEtudes} —{" "}
                {talent.filiere}
              </span>
              {/* L'établissement situe le candidat autant que la filière : c'est
                  le premier repère d'un recruteur qui connaît les écoles. */}
              {talent.etablissement && (
                <span className="flex items-center gap-1">
                  <Icon name="business" className="text-[16px]" /> {talent.etablissement}
                </span>
              )}
            </div>
            {/* Qualificatifs secondaires : présents en base, jamais rendus. */}
            {(talent.specialite || talent.anneeEtude || talent.diplome) && (
              <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {talent.specialite && <Badge tone="neutral">{talent.specialite}</Badge>}
                {talent.anneeEtude && <Badge tone="neutral">{talent.anneeEtude}</Badge>}
                {talent.diplome && (
                  <Badge tone="neutral" icon="workspace_premium">
                    {talent.diplome}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl bg-secondary-container px-5 py-3 text-center text-on-secondary-container">
              <p className="text-2xl font-bold">{talent.scoreQuiz ?? "—"}%</p>
              <p className="text-xs font-semibold uppercase">Score test</p>
            </div>
            <div className="rounded-xl bg-surface-container px-5 py-2 text-center">
              <p className="text-lg font-bold text-primary">{talent.score}</p>
              <p className="text-[10px] font-semibold uppercase text-on-surface-variant">
                Employabilité
              </p>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant">
              <Icon name={niveau.icon} className="text-[14px]" /> {niveau.label}
            </span>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Le seul texte où le candidat se présente avec ses mots : il passe
              avant les listes, qui sont toutes des données saisies. */}
          {talent.bio && (
            <Card>
              <CardHeader>
                <CardTitle>À propos</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-line text-sm leading-relaxed text-on-surface">
                  {talent.bio}
                </p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Expériences</CardTitle>
              {talent.experiences.length > 0 && (
                <span className="text-xs font-semibold text-on-surface-variant">
                  {talent.experiences.length}
                </span>
              )}
            </CardHeader>
            <CardBody className="space-y-4">
              {talent.experiences.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Aucune expérience renseignée.</p>
              ) : (
                talent.experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="border-b border-outline-variant pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-primary">{exp.titre}</h4>
                      <Badge tone="neutral">{exp.type}</Badge>
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      {exp.structure} • {exp.periode}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-on-surface">
                      {exp.description}
                    </p>
                    {/* Chargées depuis toujours, affichées maintenant : ce sont
                        elles qui rattachent une compétence à un poste réel,
                        là où la liste globale plus bas ne dit pas d'où elle vient. */}
                    {exp.competences.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {exp.competences.map((competence) => (
                          <span
                            key={competence}
                            className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant"
                          >
                            {competence}
                          </span>
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
              <CardTitle>Formations Orient2Work</CardTitle>
              <span className="text-xs font-semibold text-on-surface-variant">
                {validees.length} validée{validees.length > 1 ? "s" : ""}
                {enCours.length > 0 && ` · ${enCours.length} en cours`}
              </span>
            </CardHeader>
            <CardBody className="space-y-3">
              {talent.formations.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Ce candidat n&apos;a pas encore suivi de formation du catalogue.
                </p>
              ) : (
                <>
                  {validees.map((formation) => (
                    <LigneFormation key={formation.id} formation={formation} />
                  ))}

                  {enCours.length > 0 && (
                    <>
                      {validees.length > 0 && (
                        <p className="pt-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                          En cours
                        </p>
                      )}
                      {enCours.map((formation) => (
                        <LigneFormation key={formation.id} formation={formation} />
                      ))}
                    </>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compétences &amp; langues</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {talent.competences.length === 0 && talent.langues.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Aucune compétence renseignée.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {talent.competences.map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {talent.langues.map((l) => (
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

        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3">
              <Button
                variant="secondary"
                fullWidth
                disabled={!isValidated}
                onClick={() => setProposing(true)}
              >
                <Icon name="event" className="text-[18px]" /> Proposer un entretien
              </Button>
              {/* Le CV n'est accessible que si le candidat l'a joint à une
                  candidature : le backend refuse tout autre accès. */}
              <p className="flex items-start gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
                <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
                Le CV du candidat est consultable depuis sa candidature, s&apos;il en a déposé une
                sur l&apos;une de vos offres.
              </p>
            </CardBody>
          </Card>

          <DetailEmployabilite talent={talent} />
        </div>
      </div>

      <ProposeEntretienModal
        open={proposing}
        onClose={() => setProposing(false)}
        jeuneId={talent.id}
        jeuneNom={`${talent.prenom} ${talent.nom}`}
      />
    </div>
  );
}

/**
 * Une formation du parcours.
 *
 * Validée, elle porte son score et sa référence de certificat — de quoi la
 * vérifier. En cours, elle porte son avancement : un candidat à 80 % d'un cours
 * n'est pas un candidat qui n'a rien fait, et la distinction se perdait dans un
 * compte qui n'additionnait que les validations.
 */
function LigneFormation({ formation }: { formation: ApiFormationSuivie }) {
  return (
    <div className="rounded-lg border border-outline-variant p-3">
      <div className="flex items-start gap-3">
        <span
          className={
            formation.valide
              ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-container text-on-success-container"
              : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant"
          }
        >
          <Icon
            name={formation.valide ? "workspace_premium" : "menu_book"}
            className="text-[18px]"
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-on-surface">{formation.titre}</p>
          <p className="text-xs text-on-surface-variant">
            {formation.categorie}
            {formation.niveau && ` · ${formation.niveau}`}
            {` · ${formation.tempsLectureMin} min`}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {formation.valide ? (
              <>
                {formation.meilleurScore !== undefined && (
                  <Badge tone="success">{formation.meilleurScore}% au quiz</Badge>
                )}
                {formation.valideAt && (
                  <span className="text-[11px] text-on-surface-variant">
                    Validée en {moisAnnee(formation.valideAt)}
                  </span>
                )}
              </>
            ) : (
              <Badge tone="neutral">{formation.lu ? "Cours lu" : "Lecture en cours"}</Badge>
            )}
            {/* Une formation certifiante non encore validée le reste : c'est ce
                que le candidat obtiendra, pas ce qu'il a obtenu. */}
            {formation.certifiante && !formation.valide && (
              <span className="text-[11px] text-on-surface-variant">Certifiante</span>
            )}
          </div>

          {/*
            La référence permet de VÉRIFIER le certificat. Le PDF, lui, reste
            derrière le jeton du candidat : c'est son document, le recruteur en
            lit le numéro, il ne le télécharge pas.
          */}
          {formation.certificat && (
            <p className="mt-1 flex items-center gap-1 font-mono text-[11px] text-on-surface-variant">
              <Icon name="verified" className="text-[13px] text-success" />
              {formation.certificat}
            </p>
          )}

          {!formation.valide && formation.progression > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={formation.progression} className="h-1.5 flex-1" />
              <span className="text-[11px] tabular-nums text-on-surface-variant">
                {formation.progression}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Les quatre leviers du score d'employabilité.
 *
 * Le nombre seul se lit comme une note de compétence. Il mesure en réalité
 * l'activité sur la plateforme : 40 points sur 100 viennent du catalogue de
 * formations et 10 du simple fait d'avoir postulé. Un excellent candidat
 * inscrit la veille plafonne à 48 — le détail évite de le disqualifier.
 *
 * Les libellés d'action de `scoreParts` s'adressent au JEUNE (« Compléter mon
 * profil ») : seuls le libellé, les points et le repère chiffré sont repris.
 */
function DetailEmployabilite({
  talent,
}: {
  talent: {
    score: number;
    profilCompletion: number;
    scoreQuiz?: number;
    formationsLues: string[];
    formationsValidees: string[];
    candidatures: number;
  };
}) {
  const parts = scoreParts(talent);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détail de l&apos;employabilité</CardTitle>
        <span className="font-headline text-lg font-bold text-primary">{talent.score}/100</span>
      </CardHeader>
      <CardBody className="space-y-3">
        {parts.map((part) => (
          <div key={part.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                <Icon name={part.icon} className="text-[15px] text-on-surface-variant" />
                {part.label}
              </span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-on-surface-variant">
                {part.points}/{part.max}
              </span>
            </div>
            <ProgressBar value={(part.points / part.max) * 100} className="h-1.5" />
            <p className="text-[11px] text-on-surface-variant">{part.hint}</p>
          </div>
        ))}

        <p className="flex items-start gap-2 rounded-lg bg-surface-container px-3 py-2 text-[11px] leading-relaxed text-on-surface-variant">
          <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
          Cette note mesure l&apos;activité du candidat sur Orient2Work, pas son niveau
          professionnel. Un profil récent y est mécaniquement bas.
        </p>
      </CardBody>
    </Card>
  );
}
