"use client";

import { Fragment, useState } from "react";
import {
  ActionLink,
  DataTable,
  EmptyState,
  StatusPill,
} from "@/components/AdminPrimitives";
import type { AdminRegion, GoldenGlassInspectionRow } from "@/lib/placeTypes";

interface GoldenGlassRegionGroup {
  region: AdminRegion;
  recipients: GoldenGlassInspectionRow[];
}

const date = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "—";

export default function GoldenGlassRegionsTable({
  groups,
}: {
  groups: GoldenGlassRegionGroup[];
}) {
  const [openRegionId, setOpenRegionId] = useState<number | null>(null);

  const toggleRegion = (regionId: number) => {
    setOpenRegionId((current) => (current === regionId ? null : regionId));
  };

  return (
    <DataTable
      columns={[
        "Region",
        "Availability",
        "Golden Glass",
        "Center / radius",
        "Actions",
      ]}
      empty={
        groups.length === 0 ? (
          <EmptyState>No regions have been created yet.</EmptyState>
        ) : null
      }
    >
      {groups.map(({ region, recipients }) => {
        const isOpen = openRegionId === region.id;
        const recipientsId = "golden-glass-recipients-" + region.id;

        return (
          <Fragment key={region.id}>
            <tr
              className="cursor-pointer hover:bg-stone-50 focus:bg-stone-50 focus:outline-none"
              tabIndex={0}
              role="button"
              aria-expanded={isOpen}
              aria-controls={recipientsId}
              onClick={() => toggleRegion(region.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleRegion(region.id);
                }
              }}
            >
              <td className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <span
                    className="mt-0.5 w-4 font-mono text-stone-400"
                    aria-hidden="true"
                  >
                    {isOpen ? "⌄" : "›"}
                  </span>
                  <div>
                    <div className="font-bold text-stone-900">
                      {region.name}
                    </div>
                    <div className="font-mono text-xs text-stone-400">
                      {region.slug}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusPill tone={region.enabled ? "green" : "muted"}>
                  {region.enabled ? "Enabled" : "Disabled"}
                </StatusPill>
                <div className="mt-1 text-xs text-stone-500">
                  {region.qualifying_location_count > 0
                    ? "Eligible to enable"
                    : "Needs qualifying reviews"}
                </div>
              </td>
              <td className="px-4 py-3 font-mono tabular-nums text-stone-700">
                {region.golden_glass_count} awarded
                <div className="mt-1 text-xs text-stone-500">
                  {region.qualifying_location_count} qualifying place
                  {region.qualifying_location_count === 1 ? "" : "s"}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs tabular-nums text-stone-500">
                {region.center_lat.toFixed(4)}, {region.center_lon.toFixed(4)}
                <div className="mt-1 text-stone-400">
                  {(region.catchment_radius_m / 1_000).toFixed(1)} km radius
                </div>
              </td>
              <td className="px-4 py-3">
                <div onClick={(event) => event.stopPropagation()}>
                  <ActionLink
                    href={"/admin/places/golden-glass/regions/" + region.id}
                  >
                    Manage
                  </ActionLink>
                </div>
              </td>
            </tr>
            {isOpen ? (
              <tr id={recipientsId} className="bg-stone-50/70">
                <td colSpan={5} className="px-4 py-4">
                  <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                    <div className="border-b border-stone-100 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                        Current recipients
                      </p>
                    </div>
                    <DataTable
                      columns={[
                        "Place",
                        "Rank",
                        "Overall",
                        "Reviewers",
                        "Latest review",
                        "Actions",
                      ]}
                      empty={
                        <EmptyState>
                          No Golden Glass recipients in this region yet.
                        </EmptyState>
                      }
                    >
                      {recipients.map((recipient) => (
                        <tr
                          key={
                            recipient.region_id + "-" + recipient.location_id
                          }
                          className="bg-amber-50/50"
                        >
                          <td className="px-4 py-3 font-bold text-stone-900">
                            {recipient.venue_name ??
                              "Place #" + recipient.location_id}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-stone-700">
                            {recipient.calculated_rank}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-stone-800">
                            {recipient.raw_overall.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-stone-700">
                            {recipient.distinct_reviewers}
                          </td>
                          <td className="px-4 py-3 text-xs text-stone-500">
                            {date(recipient.latest_review_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div onClick={(event) => event.stopPropagation()}>
                              <ActionLink
                                href={"/admin/places/" + recipient.location_id}
                              >
                                View place
                              </ActionLink>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </DataTable>
                  </div>
                </td>
              </tr>
            ) : null}
          </Fragment>
        );
      })}
    </DataTable>
  );
}
