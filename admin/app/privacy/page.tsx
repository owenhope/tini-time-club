import type { Metadata } from "next";
import PublicLegalPage from "@/components/PublicLegalPage";
import { privacySections } from "@/app/legalContent";

export const metadata: Metadata = {
  title: "Privacy Policy | Tini Time Club",
  description: "Privacy Policy for Tini Time Club.",
};

export default function PrivacyPage() {
  return (
    <PublicLegalPage
      eyebrow="privacy"
      title="Privacy Policy"
      effectiveDate="September 10, 2025"
      contactEmail="support@hopemediahouse.com"
      intro="This Privacy Policy explains how Hope Media House Inc. collects, uses, shares, and protects information when you use Tini Time Club and related websites."
      sections={privacySections}
    />
  );
}
