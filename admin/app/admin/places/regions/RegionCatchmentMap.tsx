"use client";

import { useEffect, useRef } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Circle,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";

interface RegionCatchmentMapProps {
  apiKey: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  onRadiusChange?: (radiusMeters: number) => void;
}

const FitToCatchment = ({
  center,
  radiusMeters,
}: {
  center: RegionCatchmentMapProps["center"];
  radiusMeters: number;
}) => {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!map || fitted.current) return;
    const latitudeRadius = radiusMeters / 111_320;
    const longitudeRadius =
      radiusMeters /
      (111_320 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
    map.fitBounds(
      {
        north: center.lat + latitudeRadius,
        east: center.lng + longitudeRadius,
        south: center.lat - latitudeRadius,
        west: center.lng - longitudeRadius,
      },
      56
    );
    fitted.current = true;
  }, [center.lat, center.lng, map, radiusMeters]);

  return null;
};

export default function RegionCatchmentMap({
  apiKey,
  center,
  radiusMeters,
  onCenterChange,
  onRadiusChange,
}: RegionCatchmentMapProps) {
  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative h-[360px] overflow-hidden rounded-xl border border-stone-200">
        <Map
          mapId="ttc-admin-region-catchment"
          defaultCenter={center}
          defaultZoom={11}
          gestureHandling="greedy"
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
        >
          <FitToCatchment center={center} radiusMeters={radiusMeters} />
          <Circle
            center={center}
            radius={radiusMeters}
            fillColor="#DC2626"
            fillOpacity={0.1}
            strokeColor="#DC2626"
            strokeOpacity={0.8}
            strokeWeight={3}
            onRadiusChanged={onRadiusChange}
          />
          <AdvancedMarker
            position={center}
            title="Drag to move region center"
            draggable={Boolean(onCenterChange)}
            onDragEnd={(event) => {
              const position = event.latLng?.toJSON();
              if (position && onCenterChange) onCenterChange(position);
            }}
          >
            <div className="h-3 w-3 cursor-move rounded-full border-2 border-white bg-emerald-900 shadow-md" />
          </AdvancedMarker>
        </Map>
        <div className="absolute bottom-3 left-3 rounded-lg border border-stone-200 bg-white/95 px-3 py-2 text-xs shadow-md">
          <div className="flex items-center gap-2 text-stone-700">
            <span className="h-3 w-3 rounded-full border-2 border-red-600 bg-red-100" />
            Automatic catchment
          </div>
          <div className="mt-1 flex items-center gap-2 text-stone-700">
            <span className="h-3 w-3 rounded-full bg-emerald-900" />
            Region center
          </div>
          {onCenterChange || onRadiusChange ? (
            <div className="mt-2 border-t border-stone-200 pt-2 text-[11px] leading-4 text-stone-500">
              Drag the green dot or red circle handle to edit.
            </div>
          ) : null}
        </div>
      </div>
    </APIProvider>
  );
}
