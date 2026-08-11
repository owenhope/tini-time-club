"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

type PublicHeaderTone = "purple" | "cream" | "stone";

interface PublicHeaderProps {
  tone?: PublicHeaderTone;
}

const navLinks = [
  { href: "/#club", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
];

const toneStyles: Record<
  PublicHeaderTone,
  {
    wrapper: string;
    brand: string;
    nav: string;
    cta: string;
  }
> = {
  purple: {
    wrapper: "text-white",
    brand: "text-white",
    nav: "text-white/72 hover:text-white",
    cta: "border-white/25 text-white hover:border-white/50 hover:bg-white/10",
  },
  cream: {
    wrapper: "bg-[#f8f5ef] text-emerald-950",
    brand: "text-emerald-950",
    nav: "text-emerald-950/62 hover:text-emerald-950",
    cta: "border-emerald-950/15 text-emerald-950 hover:border-emerald-950/30 hover:bg-emerald-950/5",
  },
  stone: {
    wrapper: "bg-stone-50 text-emerald-950",
    brand: "text-emerald-950",
    nav: "text-emerald-950/62 hover:text-emerald-950",
    cta: "border-emerald-950/15 text-emerald-950 hover:border-emerald-950/30 hover:bg-emerald-950/5",
  },
};

function handleFeaturesClick(event: MouseEvent<HTMLAnchorElement>) {
  if (window.location.pathname !== "/") return;

  const target = document.getElementById("club");
  if (!target) return;

  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });

  if (window.location.hash !== "#club") {
    window.history.pushState(null, "", "/#club");
  }
}

export default function PublicHeader({ tone = "cream" }: PublicHeaderProps) {
  const styles = toneStyles[tone];

  return (
    <header className={`${styles.wrapper} px-5 py-5 sm:px-6 lg:px-8`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-4">
        <Link
          href="/"
          className={`text-xl font-black tracking-tight ${styles.brand}`}
        >
          tini time club
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-x-4 gap-y-3 text-sm font-bold sm:gap-x-5"
          aria-label="Primary"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={
                link.href === "/#club" ? handleFeaturesClick : undefined
              }
              className={`transition ${styles.nav}`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://apps.apple.com/app/tini-time-club/id6741620393"
            className={`rounded-md border px-3 py-2 transition ${styles.cta}`}
          >
            Get iOS app
          </a>
        </nav>
      </div>
    </header>
  );
}
