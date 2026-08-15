import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/seo-schema";

/**
 * Structured data emitted as an inline <script>. The CSP is nonce-based, so the
 * nonce minted by middleware has to be stamped on the tag or the browser drops
 * it — and with it the page's rich results.
 */
export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
