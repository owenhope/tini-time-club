"use client";

import { useEffect, useMemo, useState } from "react";
import { saveRegionGoogleMapping } from "@/lib/actions";

interface CityPrediction {
  placeId: string;
  label: string;
}

interface GooglePlacePrediction {
  placeId?: string;
  text?: { text?: string };
}

interface GoogleAutocompleteResponse {
  suggestions?: { placePrediction?: GooglePlacePrediction }[];
}

const field =
  "mt-1.5 h-9 w-full rounded-md border border-stone-200 bg-white px-2 text-sm text-stone-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function GoogleCityMappingForm({
  regionId,
  returnTo,
}: {
  regionId: number;
  returnTo: string;
}) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<CityPrediction[]>([]);
  const [selected, setSelected] = useState<CityPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sessionToken = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    const input = query.trim();
    if (!apiKey || input.length < 2 || selected?.label === input) return;

    const controller = new AbortController();
    let active = true;
    void fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ["(cities)"],
        sessionToken,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("City search failed");
        const payload = (await response.json()) as GoogleAutocompleteResponse;
        const next = (payload.suggestions ?? [])
          .map((suggestion) => suggestion.placePrediction)
          .filter(
            (
              prediction
            ): prediction is GooglePlacePrediction & {
              placeId: string;
              text: { text: string };
            } => Boolean(prediction?.placeId && prediction.text?.text)
          )
          .map((prediction) => ({
            placeId: prediction.placeId,
            label: prediction.text.text,
          }))
          .filter((prediction: CityPrediction) => prediction.label);
        if (active) setPredictions(next);
      })
      .catch((reason: unknown) => {
        if (active && (reason as { name?: string })?.name !== "AbortError") {
          setPredictions([]);
          setError(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [query, selected?.label, sessionToken]);

  return (
    <form
      action={saveRegionGoogleMapping.bind(null, String(regionId))}
      className="grid gap-3 sm:grid-cols-[1fr_auto]"
    >
      <input type="hidden" name="return_to" value={returnTo} />
      <div className="relative">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
          Search verified city
          <input
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setSelected(null);
              setPredictions([]);
              setError(false);
              setLoading(Boolean(apiKey) && nextQuery.trim().length >= 2);
            }}
            placeholder="Start typing a city"
            className={field}
            autoComplete="off"
          />
        </label>
        {predictions.length > 0 ? (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg">
            {predictions.map((prediction) => (
              <button
                key={prediction.placeId}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-50"
                onClick={() => {
                  setSelected(prediction);
                  setQuery(prediction.label);
                  setPredictions([]);
                  setLoading(false);
                }}
              >
                {prediction.label}
              </button>
            ))}
          </div>
        ) : null}
        <input
          type="hidden"
          name="google_label"
          value={selected?.label ?? ""}
          readOnly
        />
        <input
          type="hidden"
          name="google_place_id"
          value={selected?.placeId ?? ""}
          readOnly
        />
        {loading ? (
          <p className="mt-1 text-xs text-stone-500">Searching…</p>
        ) : null}
        {error ? (
          <p className="mt-1 text-xs text-red-700">
            City search is unavailable. Check the Admin Google Maps key.
          </p>
        ) : null}
        {!apiKey ? (
          <p className="mt-1 text-xs text-red-700">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable city search.
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={!selected}
        className="self-end rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add mapping
      </button>
    </form>
  );
}
