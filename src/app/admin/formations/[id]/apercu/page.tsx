"use client";

/**
 * Fiche d'une formation, vue administrateur — en LECTURE.
 *
 * `/admin/formations/[id]` est l'éditeur : utile pour corriger, malcommode pour
 * relire. Cette page montre la formation telle qu'un jeune la verra, plus ce
 * que lui ne verra jamais : l'état de publication et le corrigé du quiz.
 *
 * `bonneReponse` et `explication` ne sont sérialisés QUE pour un administrateur
 * (voir `formation.mapper.ts`) : c'est le seul endroit de l'interface où le
 * corrigé est lisible d'un coup d'œil.
 */
import { use } from "react";
import Image from "next/image";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Chip,
  ErrorState,
  Icon,
  LoadingState,
  RetourLien,
  RichText,
  StarRating,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { mediaUrl } from "@/lib/api/urls";

export default function ApercuFormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // En tant qu'admin, la réponse inclut les brouillons et le corrigé du quiz.
  const { data: formation, loading, error, refetch } = useApi(() => api.formations.byId(id), [id]);

  if (loading) return <LoadingState label="Chargement de la formation…" />;

  if (error || !formation) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const cover = mediaUrl(formation.image);

  return (
    <div className="space-y-6">
      <RetourLien href="/admin/formations">Retour au catalogue</RetourLien>

      {/* En-tête */}
      <Card className="overflow-hidden">
        {cover && (
          <Image
            src={cover}
            alt=""
            width={1280}
            height={549}
            priority
            className="aspect-[21/9] w-full object-cover"
          />
        )}
        <CardBody className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline text-2xl font-bold text-primary">{formation.titre}</h1>
              {/* Un brouillon n'est visible que de l'admin : autant le dire ici. */}
              {formation.publiee ? (
                <Badge tone="success" icon="check_circle">
                  Publiée
                </Badge>
              ) : (
                <Badge tone="warning" icon="edit_note">
                  Brouillon
                </Badge>
              )}
            </div>

            {formation.sousTitre && (
              <p className="text-on-surface-variant">{formation.sousTitre}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">{formation.categorie}</Badge>
              {formation.filiere && <Badge tone="neutral">{formation.filiere}</Badge>}
              {formation.certifiante && (
                <Badge tone="primary" icon="workspace_premium">
                  Certifiante
                </Badge>
              )}
              {formation.populaire && <Badge tone="info">Populaire</Badge>}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
              {formation.instructeur && (
                <span className="flex items-center gap-1">
                  <Icon name="person" className="text-[16px]" /> {formation.instructeur}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Icon name="timer" className="text-[16px]" /> {formation.tempsLectureMin} min
              </span>
              <span className="flex items-center gap-1">
                <Icon name="menu_book" className="text-[16px]" /> {formation.nombreChapitres}{" "}
                chapitres
              </span>
              {formation.niveau && (
                <span className="flex items-center gap-1">
                  <Icon name="bar_chart" className="text-[16px]" /> {formation.niveau}
                </span>
              )}
            </div>

            {typeof formation.note === "number" && (
              <StarRating value={formation.note} count={formation.nombreAvis} />
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 lg:w-52">
            <ButtonLink href={`/admin/formations/${formation.id}`} variant="secondary">
              <Icon name="edit" className="text-[18px]" /> Modifier
            </ButtonLink>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="whitespace-pre-line text-sm text-on-surface">{formation.description}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contenu du cours</CardTitle>
              <span className="text-xs text-on-surface-variant">tel que le jeune le lira</span>
            </CardHeader>
            <CardBody>
              {/* Le HTML a été assaini à l'enregistrement ; `RichText` repasse une
                  couche au rendu — défense en profondeur contre un XSS stocké. */}
              <RichText html={formation.contenuHtml} />
            </CardBody>
          </Card>

          {formation.quiz && (
            <Card>
              <CardHeader>
                <CardTitle>Test — {formation.quiz.titre}</CardTitle>
                <span className="text-xs text-on-surface-variant">
                  {formation.quiz.questions.length} question(s) · réussite à{" "}
                  {formation.quiz.scoreMinimum}%
                </span>
              </CardHeader>
              <CardBody className="space-y-5">
                {formation.quiz.description && (
                  <p className="text-sm text-on-surface-variant">{formation.quiz.description}</p>
                )}

                {formation.quiz.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="border-b border-outline-variant pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-bold text-on-surface-variant">
                        {index + 1}.
                      </span>
                      <p className="flex-1 font-semibold text-on-surface">{question.enonce}</p>
                      {question.chapitre && <Badge tone="neutral">{question.chapitre}</Badge>}
                    </div>

                    <ul className="mt-2 space-y-1">
                      {question.options.map((option, position) => {
                        const correcte = question.bonnesReponses?.includes(position) ?? false;
                        return (
                          <li
                            key={option}
                            className={
                              correcte
                                ? "flex items-center gap-2 rounded-lg bg-success-container px-3 py-1.5 text-sm font-semibold text-success"
                                : "flex items-center gap-2 px-3 py-1.5 text-sm text-on-surface-variant"
                            }
                          >
                            <Icon
                              name={correcte ? "check_circle" : "radio_button_unchecked"}
                              className="text-[16px]"
                            />
                            {option}
                          </li>
                        );
                      })}
                    </ul>

                    {question.explication && (
                      <p className="mt-2 rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                        {question.explication}
                      </p>
                    )}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objectifs</CardTitle>
            </CardHeader>
            <CardBody>
              {formation.objectifs.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Aucun objectif renseigné.</p>
              ) : (
                <ul className="space-y-2">
                  {formation.objectifs.map((objectif) => (
                    <li key={objectif} className="flex items-start gap-2 text-sm text-on-surface">
                      <Icon name="check" className="mt-0.5 shrink-0 text-[16px] text-success" />
                      {objectif}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prérequis</CardTitle>
            </CardHeader>
            <CardBody>
              {formation.prerequis.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Aucun prérequis.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formation.prerequis.map((p) => (
                    <Chip key={p}>{p}</Chip>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="border-dashed">
            <CardBody className="flex items-start gap-3 text-sm text-on-surface-variant">
              <Icon name="lock" className="mt-0.5 shrink-0 text-secondary" />
              <p>
                Le corrigé du test n&apos;est servi qu&apos;aux administrateurs : un jeune reçoit
                les questions sans les bonnes réponses, la correction se fait côté serveur.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
