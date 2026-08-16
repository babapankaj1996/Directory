import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MessageSquareText, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "About",
  description: `${SITE_NAME} is a directory of verified service providers. How listings get published, what verification means, and how the directory makes money.`,
  alternates: { canonical: "/about" }
};

const steps = [
  {
    icon: Search,
    title: "Search by what you need",
    body: "Start with a service, a city or a provider name. Every listing sits under a country, city and category, so you can narrow down to the people who actually work near you."
  },
  {
    icon: BadgeCheck,
    title: "Compare on real detail",
    body: "Ratings, review counts, services offered, pricing notes, availability and gallery work — side by side, before you contact anyone."
  },
  {
    icon: MessageSquareText,
    title: "Contact them directly",
    body: "Send an enquiry, call, or open WhatsApp. We do not sit in the middle of the conversation and we take no cut of what you agree."
  }
];

export default function AboutPage() {
  return (
    <main>
      <section className="border-b border-line bg-paper py-14 md:py-20">
        <div className="shell max-w-3xl">
          <p className="eyebrow text-copper-700">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
            About {SITE_NAME}
          </p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-ink md:text-5xl">
            A directory that earns its recommendations.
          </h1>
          <p className="mt-6 text-[1.0625rem] leading-8 text-ink-muted">
            Finding a good astrologer, doctor, tutor or makeup artist usually means trawling through search results with
            no way to tell who is real. {SITE_NAME} exists to make that comparison honest: every profile is reviewed
            before it appears, and the details that matter are on the page rather than buried in a phone call.
          </p>
        </div>
      </section>

      <section className="bg-surface py-16 md:py-20">
        <div className="shell">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.025em] text-ink md:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }, index) => (
              <div key={title} className="bg-surface p-6 md:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-copper-700">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-5 font-display text-sm text-copper-600">0{index + 1}</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper py-16 md:py-20">
        <div className="shell grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow text-copper-700">
              <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
              What verification means
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink md:text-4xl">
              We would rather be precise than impressive.
            </h2>
            <p className="mt-5 text-[0.9375rem] leading-7 text-ink-muted">
              A verified badge means a profile completed the review step for its category — for age-restricted
              listings, that includes checking an identity document. It is a statement about a check we performed,
              not a promise that a business will do good work.
            </p>
            <p className="mt-4 text-[0.9375rem] leading-7 text-ink-muted">
              So compare the reviews, look at the gallery, ask about price and licensing. The directory is a starting
              point that saves you time; the judgement stays yours.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-7 md:p-8">
            <ShieldCheck className="h-8 w-8 text-copper-600" />
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-ink">How we make money</h2>
            <p className="mt-4 text-[0.9375rem] leading-7 text-ink-muted">
              Listing a business is free. Owners can pay to feature a profile more prominently on relevant pages, and
              featured placements are always marked as such.
            </p>
            <p className="mt-4 text-[0.9375rem] leading-7 text-ink-muted">
              We do not sell your personal data, we do not take a commission on work you arrange, and paying for a
              placement does not buy a verification badge or a better rating.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/signup" variant="gold" size="sm">List your business</Button>
              <Button href="/listings" variant="ghost" size="sm">Browse providers</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface py-16 md:py-20">
        <div className="shell max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.025em] text-ink md:text-4xl">Something look wrong?</h2>
          <p className="mt-4 text-[0.9375rem] leading-7 text-ink-muted">
            If a listing is inaccurate, out of date or should not be here at all, tell us and we will look into it.
            Reports from users are the fastest way we find problems.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button href="/contact" variant="primary" size="sm">Contact us</Button>
            <Link href="/disclaimer" className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink">
              Read the disclaimer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
