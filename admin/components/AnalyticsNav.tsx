"use client";

import { useEffect, useState } from "react";

export interface AnalyticsSection {
  id: string;
  label: string;
}

/**
 * Sticky sub-nav for the Analytics page. Plain anchors handle jumping; a
 * scroll listener highlights the latest heading below the sticky toolbar.
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

    let frame = 0;
    const updateActive = () => {
      const headingLine = Math.min(240, window.innerHeight * 0.3);
      let current = elements[0].id;

      for (const element of elements) {
        if (element.getBoundingClientRect().top <= headingLine) {
          current = element.id;
        }
      }

      setActive(current);
    };
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateActive);
    };

    updateActive();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
    };
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
              onClick={() => setActive(section.id)}
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
