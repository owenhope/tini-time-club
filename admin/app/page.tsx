import type { Metadata } from "next";
import Image from "next/image";
import JsonLd from "@/components/JsonLd";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import {
  createBreadcrumbList,
  siteAuthor,
  siteDescription,
} from "@/lib/seo";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://tinitimeclub.com/",
  },
};

const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Tini Time Club",
  url: "https://tinitimeclub.com/",
  description: siteDescription,
  datePublished: "2026-08-11",
  dateModified: "2026-08-11",
  author: siteAuthor,
  publisher: siteAuthor,
  about: {
    "@type": "SoftwareApplication",
    name: "Tini Time Club",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "iOS",
  },
};

const homeBreadcrumbJsonLd = {
  "@context": "https://schema.org",
  ...createBreadcrumbList([
    { name: "Tini Time Club", url: "https://tinitimeclub.com/" },
  ]),
};

const features = [
  {
    title: "Remember the pour",
    body: "Snap the Martini, score taste and presentation, and keep the detail you will want when someone asks where to go.",
    eyebrow: "Reviews",
  },
  {
    title: "Find your regular spots",
    body: "Build a living map of the bars, restaurants, and hotel lobbies that actually know how to make the drink.",
    eyebrow: "Locations",
  },
  {
    title: "Trust the club",
    body: "Follow the Martini people you trust, trade recommendations, and keep the good finds moving around the table.",
    eyebrow: "Friends",
  },
  {
    title: "Earn the repeat visit",
    body: "Regulars status makes the places you keep coming back to feel a little more yours.",
    eyebrow: "Regulars",
  },
];

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-paper text-emerald-950">
      <JsonLd data={homeJsonLd} />
      <JsonLd data={homeBreadcrumbJsonLd} />
      <section className="overflow-hidden bg-[#f8f5ef] text-emerald-950">
        <PublicHeader tone="cream" />
        <div className="mx-auto max-w-[1380px] px-4 pb-6 sm:px-5 lg:px-6">
          <div className="relative min-h-[78svh] overflow-hidden rounded-[8px] bg-emerald-950">
            <Image
              src="/nightlife-martini-table.png"
              alt="Martinis on a night out"
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-72"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,58,46,0.92),rgba(28,58,46,0.48)_54%,rgba(28,58,46,0.16))]" />
            <div className="relative z-10 flex min-h-[78svh] items-center px-5 py-16 sm:px-8 lg:px-14">
              <div className="max-w-2xl text-white">
                <p className="inline-flex rounded-[6px] bg-chartreuse px-3 py-2 font-mono text-xs font-black uppercase text-emerald-950 shadow-sm shadow-emerald-950/15">
                  Sip, score, share, repeat
                </p>
                <h1 className="mt-5 text-5xl font-black leading-[0.95] sm:text-6xl lg:text-7xl">
                  Tini Time Club
                </h1>
                <p className="mt-6 max-w-xl text-xl leading-8 text-white/86">
                  The Martini review app for remembering every pour, every
                  place, and every person worth coming back to.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="https://apps.apple.com/app/tini-time-club/id6741620393"
                    className="inline-flex min-h-12 items-center rounded-md bg-chartreuse px-5 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-950/20 transition hover:bg-chartreuse-dark"
                  >
                    Download for iPhone
                  </a>
                  <a
                    href="#club"
                    className="inline-flex min-h-12 items-center rounded-md border border-white/32 px-5 py-3 text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/10"
                  >
                    See how it works
                  </a>
                </div>
              </div>
            </div>

            <div
              className="absolute right-5 top-24 hidden w-72 rounded-[8px] bg-[#f8f5ef] p-4 text-emerald-950 shadow-2xl shadow-emerald-950/30 lg:block"
              aria-hidden
            >
              <div className="flex items-center gap-3">
                <Image
                  src="/tini-time-logo.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-[8px]"
                />
                <div>
                  <p className="text-sm font-black">The club says</p>
                  <p className="text-xs font-semibold text-emerald-950/58">
                    4:56 PM
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-[8px] bg-emerald-50 p-3 text-sm font-semibold leading-5">
                Someone just found a five-star dry Martini near you.
              </p>
            </div>

            <div
              className="absolute bottom-8 right-8 hidden max-w-sm rounded-[8px] bg-chartreuse p-4 text-emerald-950 shadow-2xl shadow-emerald-950/25 md:block"
              aria-hidden
            >
              <p className="font-mono text-xs font-bold uppercase">
                Tonight&apos;s note
              </p>
              <p className="mt-2 text-2xl font-black leading-7">
                Crisp. Cold. Worth crossing town for.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="club"
        className="bg-paper px-5 py-20 text-emerald-950 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-7 md:grid-cols-[0.9fr_1.1fr] md:items-end">
            <div>
              <p className="font-mono text-xs font-bold uppercase text-violet-700">
                Built for the table
              </p>
              <h2 className="mt-3 text-4xl font-black leading-none sm:text-5xl">
                A tiny ritual for every Martini worth remembering.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-emerald-950/72">
              Tini Time Club is part tasting journal, part city guide, and part
              social club for Martini drinkers. Reviews capture the details
              people actually ask about: the venue, drink style, score, notes,
              and the regulars who keep coming back.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[8px] border border-emerald-950/10 bg-white p-6 shadow-sm shadow-emerald-950/5"
              >
                <p className="font-mono text-xs font-bold uppercase text-pimento">
                  {feature.eyebrow}
                </p>
                <h3 className="mt-4 text-2xl font-black leading-8 sm:text-3xl">
                  {feature.title}
                </h3>
                <p className="mt-4 max-w-xl text-base leading-7 text-emerald-950/70">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-emerald-950 px-5 py-20 text-white sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-2 md:items-center">
          <div className="relative mx-auto w-full max-w-md">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[8px] bg-emerald-900 shadow-2xl shadow-emerald-950/45">
              <Image
                src="/nightlife-martini-booth.png"
                alt="Friends comparing Martinis around a cocktail table"
                fill
                sizes="(min-width: 768px) 448px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-950/80 to-transparent" />
            </div>
            <div className="absolute -bottom-5 left-5 right-5 rounded-[8px] bg-[#f8f5ef] p-4 text-emerald-950 shadow-xl shadow-emerald-950/25 sm:left-auto sm:right-[-24px] sm:w-72">
              <p className="font-mono text-xs font-black uppercase text-pimento">
                Saved for later
              </p>
              <p className="mt-2 text-xl font-black leading-6">
                Crisp. Cold. Worth crossing town for.
              </p>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs font-black uppercase text-chartreuse">
              Private enough for notes, social enough for plans
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-black leading-none sm:text-5xl">
              Feel ready when someone asks where the good Martini is.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/72">
              WhatsApp makes conversations feel close. Tini Time Club brings
              that same immediacy to the recommendations you only trust from
              people who were actually there.
            </p>
            <a
              href="#download"
              className="mt-8 inline-flex min-h-12 items-center rounded-md border border-white/26 px-5 py-3 text-sm font-black text-white transition hover:border-white/56 hover:bg-white/10"
            >
              Download the app
            </a>
          </div>
        </div>
      </section>

      <section
        id="download"
        className="bg-chartreuse px-5 py-20 text-emerald-950 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-mono text-xs font-black uppercase">
              Available on iOS
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-black leading-none sm:text-5xl">
              Where is the best Martini near you?
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-emerald-950/75">
              Quick enough to use at the table, structured enough to remember
              later, and social enough to turn a good pour into a plan.
            </p>
          </div>
          <a
            href="https://apps.apple.com/app/tini-time-club/id6741620393"
            className="inline-flex min-h-16 items-center justify-center rounded-[8px] border border-emerald-950 px-7 text-center text-base font-black text-emerald-950 transition hover:bg-emerald-950 hover:text-white"
          >
            Download on the App Store
          </a>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
