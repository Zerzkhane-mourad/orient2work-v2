import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Number of chapters in a course body — each `<h2>` heading starts one. */
export function countChapitres(html: string): number {
  return (html.match(/<h2[\s>]/gi) ?? []).length;
}

/** Format a Date to a short French label, e.g. "15 juin 2024". */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
