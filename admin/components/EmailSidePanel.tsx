"use client";

import type { ReactNode } from "react";

export default function EmailSidePanel({
  id,
  title,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={`overflow-hidden rounded-xl border border-stone-200 bg-white transition-[flex-grow,min-width,width] duration-200 motion-reduce:transition-none ${expanded ? "min-w-64 flex-1" : "w-12 min-w-12 flex-none"}`}
    >
      {expanded ? (
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <h2 className="min-w-0 text-sm font-bold text-stone-900">{title}</h2>
          <button
            type="button"
            aria-label={`Collapse ${title}`}
            title={`Collapse ${title}`}
            aria-expanded={true}
            aria-controls={id}
            onClick={onToggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xl text-stone-500 hover:bg-stone-100 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Expand ${title}`}
          title={`Expand ${title}`}
          aria-expanded={false}
          aria-controls={id}
          onClick={onToggle}
          className="flex h-full min-h-48 w-full flex-col items-center gap-4 py-4 text-stone-500 hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
        >
          <span aria-hidden="true" className="text-xl">
            ‹
          </span>
          <span
            aria-hidden="true"
            className="text-xs font-bold"
            style={{ writingMode: "vertical-rl" }}
          >
            {title}
          </span>
        </button>
      )}
      <div id={id} hidden={!expanded} className="p-4">
        {children}
      </div>
    </section>
  );
}
