import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getTranslations } from "@/lib/i18n/server";

/**
 * Resolves the visitor's language once per request and hands it to the chrome,
 * so translated copy is server-rendered rather than swapped in on the client.
 */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getTranslations();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <Header locale={locale} t={t} />
      <div id="main-content" className="flex-1">
        {children}
      </div>
      <Footer t={t} />
    </div>
  );
}
