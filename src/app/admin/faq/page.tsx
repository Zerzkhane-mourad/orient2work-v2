import type { Metadata } from "next";
import { FaqManager } from "@/features/admin/faq-manager";

export const metadata: Metadata = { title: "Questions fréquentes" };

/**
 * Écran d'administration de la FAQ publique.
 *
 * La page est une simple enveloppe : tout l'écran est interactif (ajout,
 * modification, réordonnancement), il n'y a rien à rendre côté serveur qui ne
 * serait pas immédiatement remplacé.
 */
export default function AdminFaqPage() {
  return <FaqManager />;
}
