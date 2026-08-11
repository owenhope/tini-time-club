import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PublicLegalPage from "@/components/PublicLegalPage";
import { privacySections } from "@/app/legalContent";
import { createBreadcrumbList, siteAuthor, siteShareImage } from "@/lib/seo";

const description =
  "Privacy Policy for Tini Time Club explaining account data, location, photos, analytics, notifications, and support requests.";

export const metadata: Metadata = {
  title: "Privacy Policy | Tini Time Club",
  description,
  alternates: {
    canonical: "https://tinitimeclub.com/privacy",
  },
  openGraph: {
    siteName: "Tini Time Club",
    type: "website",
    url: "https://tinitimeclub.com/privacy",
    title: "Privacy Policy | Tini Time Club",
    description,
    images: [siteShareImage],
  },
};

const privacyJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Privacy Policy | Tini Time Club",
  url: "https://tinitimeclub.com/privacy",
  description,
  datePublished: "2025-09-10",
  dateModified: "2026-08-11",
  author: siteAuthor,
  publisher: siteAuthor,
  breadcrumb: createBreadcrumbList([
    { name: "Tini Time Club", url: "https://tinitimeclub.com/" },
    { name: "Privacy Policy", url: "https://tinitimeclub.com/privacy" },
  ]),
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={privacyJsonLd} />
      <PublicLegalPage
        eyebrow="privacy"
        title="Privacy Policy"
        effectiveDate="September 10, 2025"
        contactEmail="support@hopemediahouse.com"
        intro="This Privacy Policy explains how Hope Media House Inc. collects, uses, shares, and protects information when you use Tini Time Club and related websites."
        sections={privacySections}
      />
    </>
  );
}
