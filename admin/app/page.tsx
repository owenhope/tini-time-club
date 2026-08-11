import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import PublicFooter from "@/components/PublicFooter";
import { siteAuthor } from "@/lib/seo";

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
  description: "Martini reviews from Tini Time Club.",
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

const features = [
  {
    title: "Reviews",
    body: "Snap the Martini, score taste and presentation, add the note you will want later, and keep every pour in one place.",
    accent: "bg-chartreuse",
  },
  {
    title: "Locations",
    body: "Turn nights out into a map of the bars, restaurants, and hotel lobbies that actually know how to make the drink.",
    accent: "bg-violet-500",
  },
  {
    title: "Friends & Followers",
    body: "Follow the Martini people you trust, trade recommendations, and keep the club close when someone finds a good pour.",
    accent: "bg-[#8FB8A8]",
  },
  {
    title: "Regulars",
    body: "See who keeps coming back to the same spots, and build your own short list of places that feel like yours.",
    accent: "bg-pimento",
  },
  {
    title: "Rankings",
    body: "Every review builds your standing, from first sips to top-shelf regulars. The club remembers the streak.",
    accent: "bg-white",
  },
];

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-emerald-950">
      <JsonLd data={homeJsonLd} />
      <section className="min-h-svh overflow-hidden bg-violet-600 text-white">
        <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-5 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-base font-black tracking-tight text-white sm:text-lg">
                tini time club
              </span>
            </Link>
            <Link
              href="/support"
              className="rounded-md border border-white/25 px-3 py-2 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/10"
            >
              Support
            </Link>
          </header>

          <div className="flex flex-1 items-center py-14">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-[6px] bg-chartreuse px-3 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-950 shadow-sm shadow-emerald-950/15">
                Sip, score, share, repeat
              </p>
              <h1 className="mt-5 text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                Tini Time Club
              </h1>
              <p className="mt-5 max-w-2xl text-xl leading-8 text-white/78">
                The Martini review app for remembering every pour, every place,
                and every person worth coming back to.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                Log the bar, photo, notes, and ratings in seconds. Build a
                personal shortlist, follow friends, and find the next round with
                a little more confidence.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://apps.apple.com/app/tini-time-club/id6741620393"
                  className="rounded-md bg-white px-5 py-3 text-sm font-black text-violet-600 shadow-lg shadow-emerald-950/20 transition hover:bg-chartreuse"
                >
                  Download for iPhone
                </a>
                <a
                  href="#club"
                  className="rounded-md border border-white/25 px-5 py-3 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/10"
                >
                  See how it works
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="club"
        className="flex min-h-svh items-center bg-emerald-950 px-5 py-24 text-white sm:px-6 sm:py-28 lg:px-8"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-6 md:grid-cols-[0.75fr_1.25fr] md:items-end">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-chartreuse">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Everything a Martini person keeps track of.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-white/72">
              Tini Time Club is part tasting journal, part city guide, and part
              social club for Martini drinkers. Reviews capture the details
              people actually ask about: the venue, drink style, score, notes,
              and the regulars who keep coming back.
            </p>
          </div>

          <div className="mt-14 grid gap-3 md:grid-cols-6">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="bg-white/[0.06] p-6 md:col-span-2 [&:nth-child(4)]:md:col-span-3 [&:nth-child(5)]:md:col-span-3"
              >
                <span
                  className={`block h-2 w-16 ${feature.accent}`}
                  aria-hidden
                />
                <h3 className="mt-6 text-2xl font-black leading-8 sm:text-3xl">
                  {feature.title}
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/68">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-svh items-center bg-chartreuse px-5 py-20 text-emerald-950 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.18em]">
              Available on iOS
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
              Start your Martini list before the next round.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-emerald-950/75">
              The iPhone app is designed for nights out: quick enough to use at
              the table, structured enough to remember later, and social enough
              to turn a good pour into a recommendation the club can find.
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
