"use client";

import { useEffect, useState } from "react";

export interface AnalyticsSection {
  id: string;
  label: string;
}

/**
 * Sticky sub-nav for the Analytics page. Plain anchors, so jumping works
 * without JS; an IntersectionObserver highlights whichever section is in
 * view so a long scroll never loses its place.
 */
export default function AnalyticsNav({
  sections,
}: {
  sections: AnalyticsSection[];
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element != null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Topmost intersecting section wins, so scrolling up and down both
        // settle on the heading the reader is actually looking at.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -70% 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Analytics sections"
      className="hidden lg:block lg:sticky lg:top-6 lg:self-start"
    >
      <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-400">
        Sections
      </p>
      <ul className="flex flex-col gap-0.5">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "true" : undefined}
              className={`block rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active === section.id
                  ? "bg-emerald-900 text-white"
                  : "text-stone-600 hover:bg-stone-200"
              }`}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
