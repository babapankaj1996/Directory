import type { Metadata } from "next";
import { OwnerVerification } from "@/components/owner-verification";

export const metadata: Metadata = {
  title: "Verification",
  description: "Submit identity documents for age-restricted listings.",
  robots: { index: false, follow: false }
};

export default function OwnerVerificationPage() {
  return (
    <main className="shell py-10 md:py-14">
      <div className="max-w-3xl">
        <p className="eyebrow text-copper-700">
          <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
          Verification
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.025em] text-ink md:text-4xl">
          Identity and age verification
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-7 text-ink-muted">
          Kept separate from your profile so your public content and your private documents never sit in the same form.
        </p>
      </div>
      <div className="mt-8">
        <OwnerVerification />
      </div>
    </main>
  );
}
