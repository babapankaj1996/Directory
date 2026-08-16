import type { LegalSection } from "@/lib/legal-content";
import { LAST_UPDATED } from "@/lib/legal-content";

/**
 * Shared layout for the policy pages, so privacy, terms and the disclaimer read
 * as one document set rather than three differently-styled pages.
 */
export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
  showUpdated = true
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
  showUpdated?: boolean;
}) {
  return (
    <main className="shell py-14 md:py-20">
      <div className="max-w-3xl">
        <p className="eyebrow text-copper-700">
          <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
          {eyebrow}
        </p>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-ink md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-[1.0625rem] leading-8 text-ink-muted">{intro}</p>
        {showUpdated ? (
          <p className="mt-6 inline-flex rounded-full bg-sunken px-3.5 py-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-ink-muted">
            Last updated {LAST_UPDATED}
          </p>
        ) : null}
      </div>

      <div className="mt-14 max-w-3xl border-t border-line">
        {sections.map((section) => (
          <section key={section.heading} className="border-b border-line py-8">
            <h2 className="text-xl font-semibold tracking-[-0.015em] text-ink md:text-2xl">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-[0.9375rem] leading-7 text-ink-muted">{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul className="mt-4 grid gap-3">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-[0.9375rem] leading-7 text-ink-muted">
                    <span aria-hidden="true" className="mt-3 h-1 w-1 shrink-0 rounded-full bg-copper-600" />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
