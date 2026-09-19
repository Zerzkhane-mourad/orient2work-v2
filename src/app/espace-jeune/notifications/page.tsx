"use client";

import { NotificationsView } from "@/features/notifications/notifications-view";

export default function NotificationsPage() {
  return (
    <NotificationsView
      bottomNav
      emptyDescription="Réponses à vos candidatures, demandes d'entretien, formations validées : vous serez prévenu ici."
    />
  );
}
