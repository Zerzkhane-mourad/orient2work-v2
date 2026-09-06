import { redirect } from "next/navigation";

/**
 * « Référentiels » est un groupe de navigation, pas une page.
 *
 * Cette redirection garde l'URL courte fonctionnelle : un favori ou un lien
 * existant vers `/admin/referentiels` aboutit sur la première rubrique du
 * groupe au lieu d'un 404.
 */
export default function ReferentielsIndexPage() {
  redirect("/admin/referentiels/categories-formation");
}
