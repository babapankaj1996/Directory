import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeMeta, negotiateLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Resolves the locale for a server-rendered request: an explicit choice in the
 * cookie wins, otherwise the browser's Accept-Language is honoured, otherwise
 * English. Every page in this app already renders dynamically, so reading the
 * request here costs nothing extra.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const requestHeaders = await headers();
  return negotiateLocale(requestHeaders.get("accept-language")) || DEFAULT_LOCALE;
}

export async function getTranslations(): Promise<{ locale: Locale; t: Dictionary; tag: string; dir: "ltr" | "rtl" }> {
  const locale = await getLocale();
  const meta = localeMeta(locale);
  return { locale, t: getDictionary(locale), tag: meta.tag, dir: meta.dir };
}
