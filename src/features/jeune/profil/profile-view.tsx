"use client";

import { Card, CardBody, ErrorBanner, Icon } from "@/components/ui";
import { IdentitySection } from "./identity-section";
import { AboutSection } from "./about-section";
import { EducationSection } from "./education-section";
import { ExperienceSection } from "./experience-section";
import { TagListSection } from "./tag-list-section";
import { LinksSection } from "./links-section";
import { CompletionCard } from "./completion-card";
import { ScoreCard } from "../score-card";
import { useProfile } from "./profile-store";

const SKILL_SUGGESTIONS = [
  "React",
  "TypeScript",
  "Python",
  "SQL",
  "Git",
  "Figma",
  "Excel",
  "Communication",
];
const LANGUAGE_SUGGESTIONS = ["Français", "Anglais", "Arabe", "Espagnol", "Allemand"];

/** Editable profile — every section opens its own modal. */
export function ProfileView() {
  const { jeune, update, saving, saveError, dismissSaveError } = useProfile();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Un échec d'enregistrement doit être visible : sans ce bandeau, la
          modification serait annulée en silence par le retour en arrière. */}
      {saveError && (
        <div className="lg:col-span-3">
          <button type="button" onClick={dismissSaveError} className="w-full text-left">
            <ErrorBanner error={saveError} />
          </button>
        </div>
      )}

      <div className="space-y-6 lg:col-span-2">
        <IdentitySection />
        <AboutSection />
        <ExperienceSection />
        <EducationSection />
      </div>

      <div className="space-y-6">
        <ScoreCard />

        <CompletionCard />

        {jeune.scoreQuiz != null && (
          <Card>
            <CardBody className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                <span className="text-lg font-bold leading-none">{jeune.scoreQuiz}%</span>
                <span className="text-[9px] font-semibold uppercase">Test</span>
              </div>
              <div>
                <p className="font-bold text-primary">Profil vérifié</p>
                <p className="text-sm text-on-surface-variant">
                  Test validé au-dessus du seuil de 80%.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        <TagListSection
          title="Compétences"
          value={jeune.competences}
          onSave={(competences) => update({ competences })}
          emptyLabel="Ajoutez vos compétences techniques, digitales et soft skills."
          placeholder="React, Communication…"
          suggestions={SKILL_SUGGESTIONS}
          highlightFirst={2}
        />

        <TagListSection
          title="Langues"
          value={jeune.langues}
          onSave={(langues) => update({ langues })}
          emptyLabel="Ajoutez les langues que vous maîtrisez."
          placeholder="Français, Anglais…"
          suggestions={LANGUAGE_SUGGESTIONS}
        />

        <LinksSection />

        <p className="flex items-center gap-1.5 px-2 text-xs text-on-surface-variant">
          {saving ? (
            <>
              <Icon name="progress_activity" className="animate-spin text-[14px]" />
              Enregistrement…
            </>
          ) : (
            <>
              <Icon name="check_circle" className="text-[14px] text-success" />
              Vos modifications sont enregistrées automatiquement.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
