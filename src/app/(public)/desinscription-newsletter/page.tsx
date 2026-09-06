import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { UnsubscribeNewsletter } from "@/features/contact/unsubscribe";

export const metadata: Metadata = {
  title: "Désinscription newsletter",
};

export default function DesinscriptionNewsletterPage() {
  return (
    <div className="mx-auto max-w-lg px-margin-mobile py-24">
      <Suspense fallback={<LoadingState />}>
        <UnsubscribeNewsletter />
      </Suspense>
    </div>
  );
}
