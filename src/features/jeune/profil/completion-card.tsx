"use client";

import { Card, CardBody, Icon, ProgressRing } from "@/components/ui";
import { missingProfilItems } from "@/lib/profil";
import { useProfile } from "./profile-store";

/** Live completion meter that names exactly what's still missing. */
export function CompletionCard() {
  const { jeune } = useProfile();
  const missing = missingProfilItems(jeune);
  const complete = missing.length === 0;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4">
          <ProgressRing value={jeune.profilCompletion} size={64} strokeWidth={7} />
          <div>
            <p className="font-bold text-primary">
              {complete ? "Profil complet 🎉" : "Complétez votre profil"}
            </p>
            <p className="text-xs text-on-surface-variant">
              {complete
                ? "Votre profil est optimisé pour les recruteurs."
                : `${missing.length} élément(s) à compléter`}
            </p>
          </div>
        </div>

        {!complete && (
          <ul className="space-y-1.5 border-t border-outline-variant pt-3">
            {missing.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Icon name="radio_button_unchecked" className="text-[15px] text-outline" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
