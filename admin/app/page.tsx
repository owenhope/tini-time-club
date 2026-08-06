import Image from "next/image";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-[#f8f5ef] text-emerald-950">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
            tini time club<span className="text-violet-500">.</span>
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            Find the best Martini in the room.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-emerald-900/70">
            Tini Time Club is where Martini people review the pours, find the
            regulars, and share the spots worth dressing up for.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://apps.apple.com"
              className="rounded-lg bg-emerald-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Get the app
            </a>
            <Link
              href="/support"
              className="rounded-lg border border-emerald-950/20 px-5 py-3 text-sm font-bold text-emerald-950 transition hover:border-emerald-950/40 hover:bg-white/60"
            >
              Support
            </Link>
          </div>
        </section>

        <div className="relative min-h-[420px] overflow-hidden rounded-[8px] border border-emerald-950/10 shadow-2xl shadow-emerald-950/10">
          <Image
            src="/nightlife-martini-table.png"
            alt="Martinis on a low-lit table"
            fill
            priority
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
