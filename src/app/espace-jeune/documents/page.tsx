"use client";

import { useRef, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  SkeletonList,
  type IconName,
} from "@/components/ui";
import { CertificatButton } from "@/features/formations/certificat-button";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { openProtectedDocument } from "@/lib/api/media";
import type { ApiDocument, DocumentType } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { useClampPage, usePageSize, usePagination } from "@/lib/use-pagination";
import { cn, formatDate } from "@/lib/utils";

const TYPE_ICONS: Record<DocumentType, IconName> = {
  CV: "description",
  PHOTO: "photo_camera",
  BANNIERE: "photo_camera",
  LOGO: "business",
  AUTRE: "picture_as_pdf",
};

/** Ce que cet écran gère : le reste (photo, bannière, logo) vit dans le profil. */
const PIECES_JOINTES = ["CV", "AUTRE"] as const satisfies readonly DocumentType[];

const PER_PAGE = 10;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export default function MesDocumentsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [downloadError, setDownloadError] = useState<ApiError | null>(null);

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "jeune-documents",
  });
  const { page, goTo, listRef, clampTo } = usePagination({ perPage });

  // Le tri se fait côté serveur : photo, bannière et logo sont gérés depuis le
  // profil, seules les pièces jointes de candidature sont listées ici.
  const { data, loading, error, refetch } = useApi(
    () => api.documents.list({ type: PIECES_JOINTES, page, perPage }),
    [page, perPage],
  );

  // Supprimer la dernière pièce d'une page ne doit pas laisser un écran vide.
  useClampPage(data?.meta, clampTo);

  const upload = useMutation(api.documents.upload);
  const remove = useMutation(api.documents.remove);

  const pieces = data?.items ?? [];

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    // Un PDF part en CV, le reste en pièce jointe générique.
    const type: DocumentType = file.type === "application/pdf" ? "CV" : "AUTRE";
    void upload.run(type, file).then((created) => {
      if (created) refetch();
    });
  };

  const download = (doc: ApiDocument) => {
    setDownloadError(null);
    openProtectedDocument(doc.url, doc.filename).catch(() => {
      setDownloadError(new ApiError(0, "NETWORK_ERROR", "Téléchargement impossible."));
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes documents"
        subtitle="Gérez votre CV, vos pièces jointes et vos certificats de formation."
        actions={
          <Button
            variant="secondary"
            disabled={upload.pending}
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="upload" className="text-[18px]" />
            {upload.pending ? "Envoi…" : "Téléverser"}
          </Button>
        }
      />

      {upload.error && <ErrorBanner error={upload.error} />}
      {remove.error && <ErrorBanner error={remove.error} />}
      {downloadError && <ErrorBanner error={downloadError} />}

      {/* Upload zone */}
      <Card>
        <CardBody>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition-colors",
              dragging ? "border-secondary bg-secondary-container/20" : "border-outline-variant",
            )}
          >
            <Icon name="cloud_upload" className="text-4xl text-secondary" />
            <p className="font-semibold text-primary">Glissez vos fichiers ici</p>
            {/* Contraintes réelles du backend : type MIME, extension, signature
                binaire et taille sont vérifiés côté serveur. */}
            <p className="text-sm text-on-surface-variant">PDF, JPG ou PNG — 5 Mo maximum</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </CardBody>
      </Card>

      {/* Documents list */}
      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : pieces.length === 0 ? (
        <EmptyState
          icon="description"
          title="Aucun document"
          description="Déposez votre CV pour pouvoir le joindre à vos candidatures."
        />
      ) : (
        <div ref={listRef} className="space-y-4">
          <Card>
            <CardBody className="space-y-2">
              {pieces.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-surface-container-low"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container text-primary">
                    <Icon name={TYPE_ICONS[doc.type]} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-on-surface">{doc.filename}</p>
                    <p className="text-xs text-on-surface-variant">
                      {formatDate(doc.createdAt)} • {formatSize(doc.size)}
                    </p>
                  </div>
                  <Badge tone="neutral">{doc.type}</Badge>
                  <button
                    type="button"
                    onClick={() => download(doc)}
                    className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container"
                    aria-label={`Télécharger ${doc.filename}`}
                  >
                    <Icon name="download" />
                  </button>
                  <button
                    type="button"
                    disabled={remove.pending}
                    onClick={() => {
                      void remove.run(doc.id).then((done) => {
                        if (done !== null) refetch();
                      });
                    }}
                    className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-40"
                    aria-label={`Supprimer ${doc.filename}`}
                  >
                    <Icon name="delete" />
                  </button>
                </div>
              ))}
            </CardBody>
          </Card>

          {data?.meta && (
            <Pagination
              meta={data.meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              busy={loading}
              unit="document"
            />
          )}
        </div>
      )}

      <MesCertificats />
    </div>
  );
}

/** Un certificat par formation validée — lecture complète puis test réussi. */
function MesCertificats() {
  const { data, loading, error, refetch } = useApi(() => api.formations.certificats(), []);

  return (
    <section id="certificats" className="space-y-3">
      <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
        <Icon name="workspace_premium" className="text-secondary" /> Mes certificats
      </h2>

      {loading ? (
        <SkeletonList count={2} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="flex flex-col items-start gap-3 text-sm text-on-surface-variant sm:flex-row sm:items-center">
            <span className="flex-1">
              Terminez une formation et réussissez son test pour obtenir votre certificat
              nominatif.
            </span>
            <ButtonLink href="/espace-jeune/formations" variant="outline" size="sm">
              Voir les formations
            </ButtonLink>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="space-y-2">
            {data.map((certificat) => (
              <div
                key={certificat.formationId}
                className="flex flex-wrap items-center gap-4 rounded-lg p-3 transition-colors hover:bg-surface-container-low"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                  <Icon name="workspace_premium" filled />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-on-surface">{certificat.formation}</p>
                  <p className="text-xs text-on-surface-variant">
                    Délivré le {formatDate(certificat.delivreLe)} • {certificat.reference}
                  </p>
                </div>
                <CertificatButton
                  formationId={certificat.formationId}
                  formation={certificat.formation}
                  label="Télécharger"
                  variant="outline"
                  size="sm"
                />
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </section>
  );
}
