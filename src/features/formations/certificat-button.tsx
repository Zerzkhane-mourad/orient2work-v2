"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import type { ButtonProps } from "@/components/ui/button";
import { API_URL } from "@/lib/config";
import { openProtectedDocument } from "@/lib/api/media";

interface CertificatButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  formationId: string;
  formation: string;
  label?: string;
}

/**
 * Télécharge le certificat PDF d'une formation validée.
 *
 * Le PDF est généré par l'API sur le modèle officiel ; la route est protégée,
 * d'où le passage par `openProtectedDocument` plutôt qu'un simple lien.
 */
export function CertificatButton({
  formationId,
  formation,
  label = "Télécharger mon certificat",
  disabled,
  ...props
}: CertificatButtonProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = () => {
    setPending(true);
    setFailed(false);
    openProtectedDocument(
      `${API_URL}/formations/${formationId}/certificat`,
      `certificat-${slug(formation)}.pdf`,
    )
      .catch(() => setFailed(true))
      .finally(() => setPending(false));
  };

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <Button {...props} disabled={disabled || pending} onClick={download}>
        <Icon name="workspace_premium" className="text-[18px]" />
        {pending ? "Préparation…" : label}
      </Button>
      {failed && (
        <span role="alert" className="text-xs font-semibold text-error">
          Téléchargement impossible, réessayez.
        </span>
      )}
    </span>
  );
}

function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "formation"
  );
}
