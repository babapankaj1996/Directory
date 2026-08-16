import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { SITE_NAME, termsSections } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that apply when you use ${SITE_NAME}, publish a business profile, post a review or send an enquiry to a provider.`,
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      intro={`The agreement between you and ${SITE_NAME} — what we do, what we expect from visitors and business owners, and where our responsibility ends.`}
      sections={termsSections}
    />
  );
}
