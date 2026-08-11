import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { createBreadcrumbList, siteAuthor, siteShareImage } from "@/lib/seo";

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
  breadcrumb: createBreadcrumbList([
    { name: "Tini Time Club", url: "https://tinitimeclub.com/" },
    { name: "About", url: "https://tinitimeclub.com/about" },
  ]),
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f8f5ef] text-emerald-950">
      <JsonLd data={aboutJsonLd} />
      <section className="bg-violet-600 text-white">
        <PublicHeader tone="purple" />
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <p className="inline-flex rounded-[6px] bg-chartreuse px-3 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-950 shadow-sm shadow-emerald-950/15">
            Publisher
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight text-white sm:text-6xl">
            About Hope Media House
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/76">
            Hope Media House Inc. publishes Tini Time Club, an iPhone app for
            reviewing Martinis, saving favorite locations, and sharing trusted
            recommendations with friends and followers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-18 lg:px-8">
        <section className="grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Editorial responsibility
          </h2>
          <p className="leading-7 text-emerald-950/72">
            Hope Media House Inc. is responsible for the content on this
            website, including app support documentation, product descriptions,
            privacy information, and terms for Tini Time Club.
          </p>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Published work
          </h2>
          <p className="leading-7 text-emerald-950/72">
            The organization designs and maintains Tini Time Club and its
            related website, support resources, legal pages, and app store
            materials.
          </p>
        </section>

        <section className="mt-10 grid gap-4 border-t border-emerald-950/12 pt-6 md:grid-cols-[0.45fr_1fr]">
          <h2 className="text-sm font-bold uppercase text-violet-700">
            Contact
          </h2>
          <p className="leading-7 text-emerald-950/72">
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
