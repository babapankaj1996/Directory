/**
 * Locale configuration.
 *
 * The visitor's choice is stored in a cookie rather than carried in the URL, so
 * every page keeps its single canonical address. That keeps the existing
 * /[country]/[city]/... routes intact — and avoids a genuine collision, since
 * es, fr, de, it, pt and ru are all real country codes in this directory's own
 * data, which would make a bare /es ambiguous.
 *
 * The trade-off is deliberate and worth stating: because each language is not a
 * distinct URL, search engines index the default (English) version only. The
 * translations serve visitors, not rankings. Multilingual SEO would need
 * per-language URLs and hreflang, which can be layered on later.
 */
export const DEFAULT_LOCALE = "en" as const;
export const LOCALE_COOKIE = "profinr-locale";

export type Locale = "en" | "es" | "fr" | "de" | "it" | "pt" | "ru" | "cs" | "hi";

export const LOCALES: {
  code: Locale;
  /** BCP-47 tag for the html lang attribute. */
  tag: string;
  /** Name shown in the switcher, written in that language. */
  label: string;
  dir: "ltr" | "rtl";
}[] = [
  { code: "en", tag: "en", label: "English", dir: "ltr" },
  { code: "es", tag: "es-ES", label: "Español", dir: "ltr" },
  { code: "fr", tag: "fr-FR", label: "Français", dir: "ltr" },
  { code: "de", tag: "de-DE", label: "Deutsch", dir: "ltr" },
  { code: "it", tag: "it-IT", label: "Italiano", dir: "ltr" },
  { code: "pt", tag: "pt-PT", label: "Português", dir: "ltr" },
  { code: "ru", tag: "ru-RU", label: "Русский", dir: "ltr" },
  { code: "cs", tag: "cs-CZ", label: "Čeština", dir: "ltr" },
  { code: "hi", tag: "hi-IN", label: "हिन्दी", dir: "ltr" }
];

const CODES = LOCALES.map((locale) => locale.code);

export function isLocale(value: string | undefined | null): value is Locale {
  return Boolean(value) && (CODES as string[]).includes(value as string);
}

export function localeMeta(code: string | undefined | null) {
  return LOCALES.find((locale) => locale.code === code) || LOCALES[0];
}

/** Pick the best supported locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.q - a.q);

  for (const entry of ranked) {
    const base = entry.tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
