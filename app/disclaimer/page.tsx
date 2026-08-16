import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { disclaimerSections, SITE_NAME } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `${SITE_NAME} lists third-party service providers. What that means for the accuracy of listings, reviews and your dealings with providers.`,
  alternates: { canonical: "/disclaimer" }
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      eyebrow="Disclaimer"
      title="Disclaimer"
      intro={`${SITE_NAME} is a directory of independent businesses. This page sets out what that means for the information you read here.`}
      sections={disclaimerSections}
    />
  );
}
