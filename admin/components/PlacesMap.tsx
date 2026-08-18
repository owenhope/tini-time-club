"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import type { MapEvent } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import type { MapBounds, MapPlace } from "@/lib/data";
import { formatCityRegion } from "@/lib/format";

// The app's light-theme pin colours (theme/tokens.ts): purple700 bubbles with
// paper050 text. The admin map should read as the same product.
const PIN_PURPLE = "#6B53A8";
const PIN_TEXT = "#FAF9F6";

const format = (value: number | null) =>
  value == null ? "—" : Number(value).toFixed(1);

const Pin = ({
  rating,
  selected,
}: {
  rating: string | null;
  selected: boolean;
}) => (
  <div className="flex flex-col items-center">
    <div
      className={`flex items-center justify-center rounded-full font-mono font-semibold shadow-md transition-transform ${
        selected ? "scale-125" : ""
      }`}
      style={{
        width: 38,
        height: 38,
        backgroundColor: PIN_PURPLE,
        color: PIN_TEXT,
        fontSize: 13,
      }}
    >
      {rating != null ? (
        <span>{rating}</span>
      ) : (
        <span style={{ fontSize: 15 }}>🍸</span>
      )}
    </div>
    <div
      style={{
        width: 0,
        height: 0,
        marginTop: -2,
        borderLeft: "7px solid transparent",
        borderRight: "7px solid transparent",
        borderTop: `11px solid ${PIN_PURPLE}`,
      }}
    />
  </div>
);

const PlaceMarkers = ({
  places,
  selectedId,
  onSelect,
}: {
  places: MapPlace[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) => {
  const map = useMap();
  const [markers, setMarkers] = useState<Record<number, Marker>>({});
  const clustererRef = useRef<MarkerClusterer | null>(null);

  // Fit the initial viewport to the data once the map exists.
  useEffect(() => {
    if (!map || places.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const place of places) {
      bounds.extend({ lat: place.lat, lng: place.lon });
    }
    map.fitBounds(bounds, 64);
  }, [map, places]);

  useEffect(() => {
    if (!map || clustererRef.current) return;
    clustererRef.current = new MarkerClusterer({
      map,
      markers: [],
      renderer: {
        // The app's cluster pin: a solid purple circle sized by count.
        render: ({
          count,
          position,
        }: {
          count: number;
          position: google.maps.LatLng;
        }) => {
          const size = count >= 25 ? 66 : count >= 10 ? 58 : 48;
          const div = document.createElement("div");
          div.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${PIN_PURPLE};color:${PIN_TEXT};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,0.25)`;
          div.textContent = String(count);
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: div,
            zIndex: 5,
          });
        },
      },
    });
    return () => {
      clustererRef.current?.setMap(null);
      clustererRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const clusterer = clustererRef.current;
    if (!clusterer) return;
    clusterer.clearMarkers();
    clusterer.addMarkers(Object.values(markers));
  }, [markers]);

  const setMarkerRef = useCallback((marker: Marker | null, id: number) => {
    setMarkers((current) => {
      if (marker) {
        if (current[id] === marker) return current;
        return { ...current, [id]: marker };
      }
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  return (
    <>
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          selected={place.id === selectedId}
          setMarkerRef={setMarkerRef}
          onSelect={onSelect}
        />
      ))}
    </>
  );
};

// Each marker owns a memoized ref callback. An inline `ref={(m) => ...}`
// changes identity every render, which makes React detach and reattach the
// ref each pass; since attach/detach updates the markers state, that loops
// forever ("maximum update depth exceeded").
const PlaceMarker = ({
  place,
  selected,
  setMarkerRef,
  onSelect,
}: {
  place: MapPlace;
  selected: boolean;
  setMarkerRef: (marker: Marker | null, id: number) => void;
  onSelect: (id: number | null) => void;
}) => {
  const ref = useCallback(
    (marker: Marker | null) => setMarkerRef(marker, place.id),
    [setMarkerRef, place.id]
  );
  const rated = place.total_ratings > 0 && place.rating != null;

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lon }}
      zIndex={selected ? 10 : 1}
      ref={ref}
      onClick={() => onSelect(place.id)}
    >
      <Pin rating={rated ? format(place.rating) : null} selected={selected} />
    </AdvancedMarker>
  );
};

const RatingRow = ({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {label}
    </span>
    <span className="font-mono text-sm font-semibold tabular-nums text-stone-900">
      {format(value)}
    </span>
  </div>
);

/** Pad fetched bounds so small pans stay within already-fetched data. */
const padBounds = (bounds: MapBounds, factor = 0.5): MapBounds => {
  const latPad = (bounds.maxLat - bounds.minLat) * factor;
  const lonPad = (bounds.maxLon - bounds.minLon) * factor;
  return {
    minLat: bounds.minLat - latPad,
    maxLat: bounds.maxLat + latPad,
    minLon: bounds.minLon - lonPad,
    maxLon: bounds.maxLon + lonPad,
  };
};

const containsBounds = (outer: MapBounds, inner: MapBounds) =>
  outer.minLat <= inner.minLat &&
  outer.maxLat >= inner.maxLat &&
  outer.minLon <= inner.minLon &&
  outer.maxLon >= inner.maxLon;

export default function PlacesMap({
  apiKey,
  places: initialPlaces,
}: {
  apiKey: string;
  places: MapPlace[];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [placesById, setPlacesById] = useState<globalThis.Map<number, MapPlace>>(
    () => new globalThis.Map(initialPlaces.map((place) => [place.id, place]))
  );
  const fetchedBoundsRef = useRef<MapBounds | null>(null);
  const fetchRequestRef = useRef(0);

  const places = useMemo(() => [...placesById.values()], [placesById]);
  const selected = useMemo(
    () => placesById.get(selectedId ?? -1) ?? null,
    [placesById, selectedId]
  );

  // Same shape as the app's Explore map: when the viewport settles, fetch a
  // padded superset of it unless the last fetch already covers the view.
  // Results merge by id, so places added since page load appear as you pan.
  const handleIdle = useCallback((event: MapEvent) => {
    const mapBounds = event.map.getBounds();
    if (!mapBounds) return;
    const ne = mapBounds.getNorthEast();
    const sw = mapBounds.getSouthWest();
    const visible: MapBounds = {
      minLat: sw.lat(),
      maxLat: ne.lat(),
      minLon: sw.lng(),
      maxLon: ne.lng(),
    };
    if (
      fetchedBoundsRef.current &&
      containsBounds(fetchedBoundsRef.current, visible)
    ) {
      return;
    }

    const queryBounds = padBounds(visible);
    const requestId = ++fetchRequestRef.current;
    const params = new URLSearchParams({
      minLat: String(queryBounds.minLat),
      maxLat: String(queryBounds.maxLat),
      minLon: String(queryBounds.minLon),
      maxLon: String(queryBounds.maxLon),
    });
    fetch(`/admin/api/places-in-view?${params}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { places?: MapPlace[] } | null) => {
        if (!payload?.places || requestId !== fetchRequestRef.current) return;
        fetchedBoundsRef.current = queryBounds;
        setPlacesById((current) => {
          const next = new globalThis.Map(current);
          for (const place of payload.places ?? []) {
            next.set(place.id, place);
          }
          return next;
        });
      })
      .catch(() => {
        // Network hiccups just mean the next idle retries.
      });
  }, []);

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative h-[calc(100vh-260px)] min-h-[480px] overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
        <Map
          mapId="ttc-admin-places"
          defaultCenter={{ lat: 49.31, lng: -123.08 }}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          onClick={() => setSelectedId(null)}
          onIdle={handleIdle}
        >
          <PlaceMarkers
            places={places}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </Map>

        {/* Solid bg-white, not bg-white/95: the dark theme remaps `.bg-white`
            in globals.css and the alpha variant would dodge that remap. */}
        {selected ? (
          <div className="absolute bottom-4 left-4 w-80 max-w-[calc(100%-2rem)] rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-stone-900">
                  {selected.name ?? "Unnamed place"}
                </h3>
                <p className="truncate text-xs text-stone-500">
                  {formatCityRegion(selected.address) ||
                    selected.address ||
                    "No address"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-full px-2 py-1 text-xs text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Overall
                </div>
                <div className="font-mono text-3xl font-bold tabular-nums text-stone-900">
                  {format(selected.rating)}
                </div>
                <div className="text-xs text-stone-500">
                  {selected.total_ratings === 1
                    ? "1 review"
                    : `${selected.total_ratings} reviews`}
                </div>
              </div>
              <div className="flex w-36 flex-col gap-1.5">
                <RatingRow label="Taste" value={selected.taste_avg} />
                <RatingRow
                  label="Presentation"
                  value={selected.presentation_avg}
                />
              </div>
            </div>

            <Link
              href={`/admin/places/${selected.id}`}
              className="mt-4 block rounded-lg bg-violet-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Manage place
            </Link>
          </div>
        ) : null}
      </div>
    </APIProvider>
  );
}
