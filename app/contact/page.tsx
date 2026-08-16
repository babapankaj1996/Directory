import type { Metadata } from "next";
import { AlertTriangle, Building2, LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${SITE_NAME} — support for visitors and business owners, listing corrections, report a profile, and privacy or data requests.`,
  alternates: { canonical: "/contact" }
};

const routes = [
  {
    icon: LifeBuoy,
    title: "Help using the site",
    body: "Trouble signing in, verifying your email or finding a listing. Include the email on your account so we can find it quickly."
  },
  {
    icon: Building2,
    title: "Business owners",
    body: "Questions about publishing a profile, why a listing is still pending, featured placements or wallet top-ups."
  },
  {
    icon: AlertTriangle,
    title: "Report a listing",
    body: "A profile that looks fraudulent, out of date or that should not be here. Send the profile link and what looks wrong — reports are the fastest way we find problems."
  },
  {
    icon: ShieldCheck,
    title: "Privacy and data requests",
    body: "Ask for a copy of your data, a correction, or deletion of your account. Email from the address on the account so we can verify it is you."
  }
];

export default function ContactPage() {
  return (
    <main className="shell py-14 md:py-20">
      <div className="max-w-3xl">
        <p className="eyebrow text-copper-700">
          <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
          Contact
        </p>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-ink md:text-5xl">
          Talk to us.
        </h1>
        <p className="mt-6 text-[1.0625rem] leading-8 text-ink-muted">
          One inbox handles everything below. Tell us which of these it is and include any relevant links — it gets you
          a useful answer faster.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 md:p-7">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-copper-700">
            <Mail className="h-5 w-5" />
          </span>
          <p className="mt-4 text-2xs font-bold uppercase tracking-[0.16em] text-ink-muted">Email us</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-2 inline-flex min-h-[44px] items-center font-display text-2xl font-semibold tracking-[-0.02em] text-ink transition-colors hover:text-copper-700 md:text-3xl"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-3 text-sm leading-7 text-ink-muted">
            We aim to reply within two business days. Reports about unsafe or fraudulent listings are looked at first.
          </p>
        </div>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        {routes.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-surface p-6 md:p-7">
            <Icon className="h-5 w-5 text-copper-700" />
            <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-ink-muted">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 max-w-3xl rounded-2xl border border-line bg-paper p-6 md:p-7">
        <h2 className="text-lg font-semibold text-ink">Before you write in</h2>
        <p className="mt-3 text-sm leading-7 text-ink-muted">
          If you want to reach a provider about their service, contact them directly from their profile — we are not
          part of that conversation and cannot answer for them. If a profile is still pending, it is with our review
          team; publishing takes a little time because every listing is checked.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/listings" variant="ghost" size="sm">Browse providers</Button>
          <Button href="/about" variant="ghost" size="sm">How the directory works</Button>
        </div>
      </div>
    </main>
  );
}
