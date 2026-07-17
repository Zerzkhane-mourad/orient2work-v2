import { notFound } from "next/navigation";
import { FormationEditor } from "@/features/admin/formation-editor";
import { formations } from "@/lib/mock-data";

export default async function ModifierFormationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const formation = formations.find((f) => f.id === id);
  if (!formation) notFound();

  return <FormationEditor formation={formation} />;
}
