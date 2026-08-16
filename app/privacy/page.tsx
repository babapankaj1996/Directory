import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { privacySections, SITE_NAME } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, stores and shares your information, including account data, uploaded media and identity verification documents.`,
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro={`What ${SITE_NAME} collects, why we collect it, who we share it with and what you can ask us to do about it — in plain language.`}
      sections={privacySections}
    />
  );
}
