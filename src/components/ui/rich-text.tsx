import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

/** Tags/attributes the course editor is allowed to produce. */
const ALLOWED_TAGS = [
  "h2",
  "h3",
  "p",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "br",
  "hr",
  "a",
];

interface RichTextProps {
  html: string;
  className?: string;
}

/**
 * Renders admin-authored rich HTML.
 * The content is sanitized server-side before it ever reaches the DOM, so a
 * compromised or careless editor payload can't inject scripts.
 */
export function RichText({ html, className }: RichTextProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  return (
    <div
      className={cn("prose prose-lg max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
