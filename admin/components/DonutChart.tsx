"use client";

import { useState } from "react";

const COLORS = [
  "#6b53a8",
  "#059669",
  "#d97706",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#7c3aed",
];

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 72;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface DonutRow {
  key: string;
  label: string;
  count: number;
  share: number;
}

export default function DonutChart({
  title,
  rows,
  total,
}: {
  title: string;
  rows: DonutRow[];
  total: number;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const hovered = rows.find((row) => row.key === hoveredKey) ?? null;
  let offset = 0;

  return (
    <div className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto">
        {hovered ? (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-3 py-2 text-center text-white shadow-lg"
            role="status"
          >
            <span className="block text-sm font-bold">{hovered.label}</span>
            <span className="block text-xs text-stone-300">
              {hovered.count.toLocaleString()} reviews · {Math.round(hovered.share * 100)}%
            </span>
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-52 w-52"
          role="img"
          aria-label={`${title}: ${total.toLocaleString()} reviews`}
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--admin-chart-grid, #e7e5e4)"
            strokeWidth={STROKE}
          />
          {total > 0
            ? rows.map((row, index) => {
                if (row.count <= 0) return null;
                const length = row.share * CIRCUMFERENCE;
                const segment = (
                  <circle
                    key={row.key}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={STROKE}
                    strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                    transform={`rotate(-90 ${CENTER} ${CENTER})`}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onMouseEnter={() => setHoveredKey(row.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    aria-label={`${row.label}: ${row.count} reviews, ${Math.round(
                      row.share * 100
                    )}%`}
                  />
                );
                offset += length;
                return segment;
              })
            : null}
          <text
            x={CENTER}
            y={CENTER - 3}
            textAnchor="middle"
            className="fill-stone-900 text-[24px] font-black"
          >
            {total.toLocaleString()}
          </text>
          <text
            x={CENTER}
            y={CENTER + 19}
            textAnchor="middle"
            className="fill-stone-500 text-[11px] font-bold uppercase tracking-[0.14em]"
          >
            reviews
          </text>
        </svg>
      </div>

      <div>
        <h3 className="font-semibold">{title}</h3>
        <ul className="mt-3 divide-y divide-stone-100">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="truncate font-medium">{row.label}</span>
              </span>
              <span className="shrink-0 text-right tabular-nums text-stone-500">
                {row.count.toLocaleString()} · {Math.round(row.share * 100)}%
              </span>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="py-2.5 text-sm text-stone-400">
              No enabled review types are available.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
