"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { RANGE_PRESETS, type DateRange } from "@/lib/range";

const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

/** Preset chips + a custom from/to form, GA style. */
export default function RangePicker({
  path,
  range,
}: {
  path: string;
  range: DateRange;
}) {
  const router = useRouter();

  const submitCustomRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    params.set("from", String(formData.get("from") ?? ""));
    params.set("to", String(formData.get("to") ?? ""));

    router.push(`${path}?${params}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      {RANGE_PRESETS.map((days) => {
        const active = range.query === `days=${days}`;
        return (
          <Link
            key={days}
            href={`${path}?days=${days}`}
            scroll={false}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-emerald-900 text-white"
                : "border border-stone-300 bg-white text-stone-600 hover:bg-stone-100"
            }`}
          >
            {days}d
          </Link>
        );
      })}
      <form onSubmit={submitCustomRange} className="flex items-center gap-1.5">
        <input
          type="date"
          name="from"
          defaultValue={toInputDate(range.since)}
          className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-600"
          required
        />
        <span className="text-stone-400">–</span>
        <input
          type="date"
          name="to"
          defaultValue={toInputDate(range.until)}
          className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-600"
          required
        />
        <button
          type="submit"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
