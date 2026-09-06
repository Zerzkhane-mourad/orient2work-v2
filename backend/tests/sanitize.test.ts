/**
 * Assainissement du contenu de cours.
 *
 * Ce filtre décide de ce qu'un administrateur peut réellement mettre en forme.
 * Trop strict, la mise en forme disparaît sans message à l'enregistrement ;
 * trop large, un compte compromis injecte du script chez tous les candidats.
 *
 * La liste des classes doit rester alignée sur celle du lecteur
 * (`components/ui/rich-text.tsx`) : ces tests en fixent le contrat.
 */
import { describe, expect, it } from "vitest";
import { sanitizeRichHtml, stripTags } from "../src/lib/sanitize.js";

describe("Ce qui doit PASSER", () => {
  it("conserve une illustration servie par l'API", () => {
    const html = sanitizeRichHtml(
      '<img src="/api/v1/formations/medias/abc" alt="Schéma" class="rt-image" loading="lazy" />',
    );
    expect(html).toContain('src="/api/v1/formations/medias/abc"');
    expect(html).toContain('alt="Schéma"');
    expect(html).toContain('class="rt-image"');
  });

  it("conserve la mise en forme de base", () => {
    const html = sanitizeRichHtml(
      "<h2>Chapitre</h2><p><strong>gras</strong> <em>italique</em></p><ul><li>point</li></ul>",
    );
    expect(html).toContain("<h2>Chapitre</h2>");
    expect(html).toContain("<strong>gras</strong>");
    expect(html).toContain("<li>point</li>");
  });
});

describe("Ce qui doit être RETIRÉ", () => {
  it("supprime un script", () => {
    expect(sanitizeRichHtml('<p>ok</p><script>alert(1)</script>')).not.toContain("script");
  });

  it("supprime un gestionnaire d'événement", () => {
    expect(sanitizeRichHtml('<p onclick="alert(1)">texte</p>')).not.toContain("onclick");
  });

  it("refuse une URL javascript:", () => {
    expect(sanitizeRichHtml('<a href="javascript:alert(1)">lien</a>')).not.toContain("javascript:");
  });

  it("refuse un attribut style", () => {
    const html = sanitizeRichHtml('<p style="position:fixed;inset:0">texte</p>');
    expect(html).not.toContain("style");
    expect(html).toContain("texte");
  });

  it("refuse une classe arbitraire sur une image", () => {
    // Le vrai risque : emprunter les utilitaires de l'application pour
    // recouvrir l'écran d'une zone cliquable.
    const html = sanitizeRichHtml('<img src="/x.png" class="fixed inset-0" />');
    expect(html).not.toContain("fixed");
    expect(html).not.toContain("inset-0");
  });

  it("ne garde que la classe connue quand elles sont mélangées", () => {
    const html = sanitizeRichHtml('<img src="/x.png" class="rt-image fixed" />');
    expect(html).toContain("rt-image");
    expect(html).not.toContain("fixed");
  });

  it("refuse une image en data: — un SVG y cacherait du script", () => {
    const html = sanitizeRichHtml(
      '<img src="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pjwvc2NyaXB0Pjwvc3ZnPg==" />',
    );
    expect(html).not.toContain("data:");
  });

  it("ajoute rel=noopener sur les liens", () => {
    expect(sanitizeRichHtml('<a href="https://exemple.ma">lien</a>')).toContain(
      'rel="noopener noreferrer"',
    );
  });
});

describe("stripTags", () => {
  it("ne laisse que le texte", () => {
    expect(stripTags("<b>Bonjour</b> <i>monde</i>")).toBe("Bonjour monde");
  });

  it("neutralise une tentative d'injection", () => {
    expect(stripTags('<script>alert(1)</script>salut')).not.toContain("<");
  });
});
