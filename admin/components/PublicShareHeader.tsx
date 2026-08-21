import Link from "next/link";

export default function PublicShareHeader({ appUrl }: { appUrl: string }) {
  return (
    <>
      <header className="flex items-center justify-between bg-[#FAF9F6] px-[10px] py-2 sm:mb-3">
        <Link href="/" aria-label="Tini Time Club">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tini-time-logo.png"
            alt="Tini Time Club"
            width={60}
            height={60}
            className="h-[60px] w-[60px] object-cover"
          />
        </Link>
        <a
          href={appUrl}
          className="rounded-full bg-[#6B53A8] px-3 py-1.5 text-sm font-black text-[#FAF9F6] shadow-[0_1px_0_rgba(28,58,46,0.12)] transition hover:bg-[#54408A]"
        >
          Join the Club
        </a>
      </header>

      <p className="bg-[#B6A3E2] px-3 py-1.5 text-center text-xs font-bold text-[#1C3A2E] sm:mb-3">
        Sip, snap, review, repeat.
      </p>
    </>
  );
}
