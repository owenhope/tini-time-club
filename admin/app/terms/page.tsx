import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PublicLegalPage from "@/components/PublicLegalPage";
import { termsSections } from "@/app/legalContent";
import { siteAuthor, siteShareImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Service | Tini Time Club",
  description: "Terms of Service and community guidelines for Tini Time Club.",
  alternates: {
    canonical: "https://tinitimeclub.com/terms",
  },
  openGraph: {
    siteName: "Tini Time Club",
    type: "website",
    url: "https://tinitimeclub.com/terms",
    title: "Terms of Service | Tini Time Club",
    description: "Terms of Service and community guidelines for Tini Time Club.",
    images: [siteShareImage],
  },
};

const termsJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Terms of Service | Tini Time Club",
  url: "https://tinitimeclub.com/terms",
  description: "Terms of Service and community guidelines for Tini Time Club.",
  datePublished: "2025-09-10",
  dateModified: "2026-08-11",
  author: siteAuthor,
  publisher: siteAuthor,
};

export default function TermsPage() {
  return (
    <>
      <JsonLd data={termsJsonLd} />
      <PublicLegalPage
        eyebrow="terms"
        title="Terms of Service"
        effectiveDate="September 10, 2025"
        contactEmail="support@hopemediahouse.com"
        intro="By using Tini Time Club, you agree to these terms and our community guidelines. Please read them carefully."
        sections={termsSections}
      />
    </>
  );
}
