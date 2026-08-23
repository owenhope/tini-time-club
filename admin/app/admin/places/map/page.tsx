import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { PageHeader } from "@/components/AdminPrimitives";
import PlacesMap from "@/components/PlacesMap";
import { fetchMapPlaces } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PlacesMapPage() {
  const places = await fetchMapPlaces();
  const rated = places.filter((place) => place.total_ratings > 0);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <AdminShell active="locations">
      <PageHeader
        eyebrow="Core workspace"
        title="Places map"
        description="Every place with coordinates, pinned like the app's Explore map. Click a pin for its ratings."
        stats={[
          {
            label: "Places on map",
            value: places.length.toLocaleString(),
            tone: "purple",
          },
          {
            label: "Rated Places",
            value: rated.length.toLocaleString(),
            tone: "green",
          },
        ]}
        statColumns={3}
        surface="transparent"
        density="compact"
        actions={
          <Link
            href="/admin/places"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            List view
          </Link>
        }
      />

      <div className="px-8 py-6">
        {apiKey ? (
          <PlacesMap apiKey={apiKey} places={places} />
        ) : (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in admin/.env.local to load the
            map.
          </p>
        )}
      </div>
    </AdminShell>
  );
}
