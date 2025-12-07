/**
 * Extracts only the @font-face rules from all stylesheets (inline and external).
 * Returns them as a single concatenated CSS string.
 */
function extractFontFaceRules(): string {
  let fontCssText = '';

  const styleSheets = Array.from(document.styleSheets) as (CSSStyleSheet | null)[];

  for (const sheet of styleSheets) {
    if (!sheet) continue;

    try {
      const cssRules = sheet.cssRules;
      if (!cssRules) continue;

      for (const rule of Array.from(cssRules)) {
        // Extract only @font-face rules
        if (rule.type === CSSRule.FONT_FACE_RULE) {
          fontCssText += rule.cssText + '\n';
        }

        // Optionally: handle @import rules
        if (rule.type === CSSRule.IMPORT_RULE) {
          const importRule = rule as CSSImportRule;
          const importedSheet = importRule.styleSheet;

          if (importedSheet) {
            try {
              const importedRules = importedSheet.cssRules;
              if (!importedRules) continue;

              for (const importedRule of Array.from(importedRules)) {
                if (importedRule.type === CSSRule.FONT_FACE_RULE) {
                  fontCssText += importedRule.cssText + '\n';
                }
              }
            } catch (e) {
              console.warn('Could not access imported stylesheet:', importRule.href, e);
            }
          }
        }
      }
    } catch (e) {
      // SecurityError: can't access cross-origin stylesheet
      console.warn('Could not access stylesheet:', (sheet as CSSStyleSheet).href, e);
    }
  }

  return fontCssText;
}

// Usage example:
const fontsOnlyCSS: string = extractFontFaceRules();
console.log(fontsOnlyCSS);
