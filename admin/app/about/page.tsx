import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PublicFooter from "@/components/PublicFooter";
import { siteAuthor, siteShareImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Hope Media House | Tini Time Club",
  description:
    "About the organization that publishes Tini Time Club, the Martini review app for iPhone.",
  alternates: {
    canonical: "https://tinitimeclub.com/about",
  },
  openGraph: {
    siteName: "Tini Time Club",
    type: "website",
    url: "https://tinitimeclub.com/about",
    title: "About Hope Media House | Tini Time Club",
    description:
      "About the organization that publishes Tini Time Club, the Martini review app for iPhone.",
    images: [siteShareImage],
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Hope Media House | Tini Time Club",
  url: "https://tinitimeclub.com/about",
  description:
    "About the organization that publishes Tini Time Club, the Martini review app for iPhone.",
  datePublished: "2026-08-11",
  dateModified: "2026-08-11",
  author: siteAuthor,
  publisher: siteAuthor,
  about: siteAuthor,
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f8f5ef] text-emerald-950">
      <JsonLd data={aboutJsonLd} />
      <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="text-sm font-bold uppercase text-emerald-800">
          tini time club<span className="text-violet-600">.</span>
        </p>
        <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
          About Hope Media House
        </h1>
        <p className="mt-5 text-lg leading-8 text-emerald-900/72">
          Hope Media House Inc. publishes Tini Time Club, an iPhone app for
          reviewing Martinis, saving favorite locations, and sharing trusted
          recommendations with friends and followers.
        </p>

        <section className="mt-10 border-t border-emerald-950/12 pt-5">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Editorial responsibility
          </h2>
          <p className="mt-3 leading-7 text-emerald-950/72">
            Hope Media House Inc. is responsible for the content on this
            website, including app support documentation, product descriptions,
            privacy information, and terms for Tini Time Club.
          </p>
        </section>

        <section className="mt-10 border-t border-emerald-950/12 pt-5">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Published work
          </h2>
          <p className="mt-3 leading-7 text-emerald-950/72">
            The organization designs and maintains Tini Time Club and its
            related website, support resources, legal pages, and app store
            materials.
          </p>
        </section>

        <section className="mt-10 border-t border-emerald-950/12 pt-5">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Contact
          </h2>
          <p className="mt-3 leading-7 text-emerald-950/72">
            For corrections, support, account help, or privacy questions, email{" "}
            <a
              className="font-bold underline"
              href="mailto:support@hopemediahouse.com"
            >
              support@hopemediahouse.com
            </a>
            .
          </p>
        </section>
      </section>
      <PublicFooter />
    </main>
  );
}
