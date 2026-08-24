"use client";

import { useState } from "react";
import { Panel } from "@/components/AdminPrimitives";
import type { AdminRegion } from "@/lib/data";
import RegionCatchmentMap from "./RegionCatchmentMap";
import RegionForm, { type RegionMapValues } from "./RegionForm";

const defaultValues: RegionMapValues = {
  center_lat: 49.2827,
  center_lon: -123.1207,
  catchment_radius_m: 20_000,
};

export default function RegionMapEditor({
  region,
  returnTo,
  apiKey,
}: {
  region?: AdminRegion;
  returnTo: string;
  apiKey: string;
}) {
  const [values, setValues] = useState<RegionMapValues>({
    center_lat: region?.center_lat ?? defaultValues.center_lat,
    center_lon: region?.center_lon ?? defaultValues.center_lon,
    catchment_radius_m:
      region?.catchment_radius_m ?? defaultValues.catchment_radius_m,
  });

  const center = { lat: values.center_lat, lng: values.center_lon };

  return (
    <>
      <Panel title={region ? "Region settings" : "Choose region location"}>
        <div className="p-4">
          <RegionForm
            region={region}
            returnTo={returnTo}
            mapValues={values}
            onMapValuesChange={setValues}
          />
        </div>
      </Panel>
      <Panel title="Map catchment">
        <div className="space-y-3 p-4">
          <p className="text-sm leading-6 text-stone-500">
            Drag the green dot to move the region center. Drag the red circle
            handle to change the automatic catchment radius. Save the region
            settings when you are finished.
          </p>
          {apiKey ? (
            <RegionCatchmentMap
              apiKey={apiKey}
              center={center}
              radiusMeters={values.catchment_radius_m}
              onCenterChange={(next) =>
                setValues((current) => ({
                  ...current,
                  center_lat: next.lat,
                  center_lon: next.lng,
                }))
              }
              onRadiusChange={(next) =>
                setValues((current) => ({
                  ...current,
                  catchment_radius_m: Math.max(1_000, next),
                }))
              }
            />
          ) : (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in admin/.env.local to load
              the editable map.
            </p>
          )}
        </div>
      </Panel>
    </>
  );
}
