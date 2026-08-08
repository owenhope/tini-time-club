import Link from "next/link";

export default function PublicShareHeader({ appUrl }: { appUrl: string }) {
  return (
    <>
      <header className="flex items-center justify-between bg-[#f8f5ef] px-[10px] py-2 sm:mb-3">
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
          className="text-sm font-bold text-[#08261f] underline-offset-4 hover:underline"
        >
          Join the Club
        </a>
      </header>

      <p className="bg-[#B6A3E2] px-3 py-1.5 text-center text-xs font-bold text-white sm:mb-3">
        Sip, snap, review, repeat. Welcome to the club.
      </p>
    </>
  );
}
