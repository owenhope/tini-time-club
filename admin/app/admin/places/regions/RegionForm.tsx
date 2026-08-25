"use client";

import { useState } from "react";
import { upsertRegion } from "@/lib/actions";
import type { AdminRegion } from "@/lib/placeTypes";
import { kilometersToMeters, metersToKilometers } from "@/lib/regionRadius.mjs";

const field =
  "mt-1.5 h-9 w-full rounded-md border border-stone-200 bg-white px-2 text-sm text-stone-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100";
const numberField = field + " font-mono";

export interface RegionMapValues {
  center_lat: number;
  center_lon: number;
  catchment_radius_m: number;
}

const valuesFromRegion = (region?: AdminRegion): RegionMapValues => ({
  center_lat: region?.center_lat ?? 0,
  center_lon: region?.center_lon ?? 0,
  catchment_radius_m: region?.catchment_radius_m ?? 1_000,
});

export default function RegionForm({
  region,
  returnTo,
  mapValues,
  onMapValuesChange,
}: {
  region?: AdminRegion;
  returnTo: string;
  mapValues?: RegionMapValues;
  onMapValuesChange?: (values: RegionMapValues) => void;
}) {
  const [localValues, setLocalValues] = useState(() =>
    valuesFromRegion(region)
  );
  const values = mapValues ?? localValues;

  const updateMapValue = (key: keyof RegionMapValues, value: string) => {
    const next = { ...values, [key]: Number(value) };
    if (onMapValuesChange) onMapValuesChange(next);
    else setLocalValues(next);
  };

  return (
    <form
      action={upsertRegion}
      className="space-y-5 rounded-lg border border-stone-200 bg-stone-50 p-4"
    >
      <input type="hidden" name="return_to" value={returnTo} />
      {region ? <input type="hidden" name="id" value={region.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
          Name
          <input
            name="name"
            required
            defaultValue={region?.name ?? ""}
            className={field}
          />
        </label>
        <label className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
          Slug
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            defaultValue={region?.slug ?? ""}
            className={field}
          />
        </label>
        <label className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
          Display order
          <input
            name="display_order"
            type="number"
            required
            defaultValue={region?.display_order ?? 100}
            className={numberField}
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm font-bold text-stone-700">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={region?.enabled ?? false}
          />{" "}
          Enabled in Explore
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
          Map center
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-stone-500">
            Latitude
            <input
              name="center_lat"
              type="number"
              step="any"
              required
              value={values.center_lat}
              onChange={(event) =>
                updateMapValue("center_lat", event.target.value)
              }
              className={numberField}
            />
          </label>
          <label className="text-xs text-stone-500">
            Longitude
            <input
              name="center_lon"
              type="number"
              step="any"
              required
              value={values.center_lon}
              onChange={(event) =>
                updateMapValue("center_lon", event.target.value)
              }
              className={numberField}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-stone-500">
          Catchment radius (km)
          <input
            type="hidden"
            name="catchment_radius_m"
            value={values.catchment_radius_m}
            readOnly
          />
          <input
            name="catchment_radius_km"
            type="number"
            min="1"
            max="500"
            step="0.1"
            required
            value={metersToKilometers(values.catchment_radius_m)}
            onChange={(event) =>
              updateMapValue(
                "catchment_radius_m",
                String(kilometersToMeters(event.target.value))
              )
            }
            className={numberField}
          />
        </label>
        <p className="self-end text-xs leading-5 text-stone-500">
          Places within this radius are automatically assigned to the region.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
        >
          {region ? "Save region" : "Create region"}
        </button>
        <span className="text-xs text-stone-500">
          Changes affect region availability, catchment matching, and Explore.
        </span>
      </div>
    </form>
  );
}
