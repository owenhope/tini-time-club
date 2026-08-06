"use client";

import { useRef, useState } from "react";
import type { DayCount } from "@/lib/bucket";

const W = 600;
const H = 160;
const PAD = { top: 10, right: 8, bottom: 4, left: 30 };

/**
 * Analytics-style daily line chart: gridlines, y-axis ticks, a line over a
 * gradient area, and a cursor-following tooltip with the exact day count.
 */
export default function LineChart({
  title,
  data,
  color = "#7c5ce0",
  unit = "events",
}: {
  title: string;
  data: DayCount[];
  color?: string;
  /** Noun for the tooltip, e.g. "reviews", "signups". */
  unit?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...data.map((d) => d.count));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom - 14;

  const x = (i: number) =>
    PAD.left +
    (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (count: number) => PAD.top + innerH - (count / max) * innerH;

  const linePath = data
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`
    )
    .join(" ");
  const areaPath = `${linePath} L${x(data.length - 1).toFixed(1)},${
    PAD.top + innerH
  } L${x(0).toFixed(1)},${PAD.top + innerH} Z`;

  const ticks = max <= 4 ? max : 4;
  const gradientId = `lc-${title.replace(/[^a-z0-9]/gi, "")}`;

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || data.length === 0) return;
    const viewX = ((event.clientX - rect.left) / rect.width) * W;
    const fraction = Math.min(
      1,
      Math.max(0, (viewX - PAD.left) / Math.max(1, innerW))
    );
    setHover(Math.round(fraction * (data.length - 1)));
  };

  const hovered = hover != null ? data[hover] : null;
  const prettyDay = (day: string) =>
    new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-stone-500">
          {total} {unit}
        </span>
      </div>

      <div className="relative mt-3">
        {hovered && hover != null ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-stone-900 px-3.5 py-2 text-sm text-white shadow-lg"
            style={{
              left: `${Math.min(88, Math.max(12, (x(hover) / W) * 100))}%`,
              top: `${(y(hovered.count) / H) * 100}%`,
            }}
          >
            <span className="block font-semibold">
              {hovered.count} {unit}
            </span>
            <span className="block text-stone-300">
              {prettyDay(hovered.day)}
            </span>
          </div>
        ) : null}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`${title}: ${total} ${unit} across ${data.length} days`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {Array.from({ length: ticks + 1 }, (_, i) => {
            const value = Math.round((max / ticks) * i);
            const gy = y((max / ticks) * i);
            return (
              <g key={i}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={gy}
                  y2={gy}
                  stroke="#e7e5e4"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 6}
                  y={gy + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#a8a29e"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {data.length > 0 && (
            <>
              <path d={areaPath} fill={`url(#${gradientId})`} />
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {hovered && hover != null && (
                <>
                  <line
                    x1={x(hover)}
                    x2={x(hover)}
                    y1={PAD.top}
                    y2={PAD.top + innerH}
                    stroke="#a8a29e"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={x(hover)}
                    cy={y(hovered.count)}
                    r="4.5"
                    fill="#ffffff"
                    stroke={color}
                    strokeWidth="2.5"
                  />
                </>
              )}
            </>
          )}
        </svg>
      </div>

      <div className="mt-1 flex justify-between text-xs text-stone-400">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}
