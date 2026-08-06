import type { Metadata } from "next";
import PublicLegalPage from "@/components/PublicLegalPage";
import { termsSections } from "@/app/legalContent";

export const metadata: Metadata = {
  title: "Terms of Service | Tini Time Club",
  description: "Terms of Service and community guidelines for Tini Time Club.",
};

export default function TermsPage() {
  return (
    <PublicLegalPage
      eyebrow="terms"
      title="Terms of Service"
      effectiveDate="September 10, 2025"
      contactEmail="support@hopemediahouse.com"
      intro="By using Tini Time Club, you agree to these terms and our community guidelines. Please read them carefully."
      sections={termsSections}
    />
  );
}
