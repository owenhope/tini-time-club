import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import AnalyticsHeader from "@/components/AnalyticsHeader";
import DonutChart from "@/components/DonutChart";
import FeatureSection from "@/components/FeatureSection";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import { fetchContentAnalytics } from "@/lib/analytics/content";
import { formatCityRegion } from "@/lib/format";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";
const pct = (value: number, total: number) => total > 0 ? `${Math.round((value / total) * 100)}%` : "—";

export default async function ContentAnalyticsPage({ searchParams }: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const content = await fetchContentAnalytics(range);
  const typeReviews = content.typePopularity.reduce((sum, row) => sum + row.reviewCount, 0);
  const spiritReviews = content.spiritPopularity.reduce((sum, row) => sum + row.reviewCount, 0);
  return (
    <AdminShell active="analytics">
      <AnalyticsHeader active="content" range={range} title="Content & places" description="What members review, how they use the Martini Index, and where club activity is happening." />
      <main className="space-y-8 px-8 pb-32 pt-6">
        <FeatureSection id="catalog" title="Spirits & types" description="Review volume by the spirit and Martini type enabled in the composer.">
          <div className="grid gap-4 xl:grid-cols-2">
            <DonutChart title="Spirits" total={spiritReviews} rows={content.spiritPopularity.map((row) => ({ key: String(row.id), label: row.name, count: row.reviewCount, share: row.share }))} />
            <DonutChart title="Types" total={typeReviews} rows={content.typePopularity.map((row) => ({ key: String(row.id), label: row.name, count: row.reviewCount, share: row.share }))} />
          </div>
        </FeatureSection>
        <FeatureSection id="index" title="Martini Index" description="How often members browse the Index, use spirit filters, and ask the shaker to choose a Martini.">
          <div className="grid grid-cols-12 gap-4">
            <MetricTile label="Index views" value={content.martiniIndex.views} previous={content.previousMartiniIndex.views} className="col-span-12 md:col-span-4" />
            <MetricTile label="Filter uses" value={content.martiniIndex.filters} previous={content.previousMartiniIndex.filters} className="col-span-12 md:col-span-4" />
            <MetricTile label="Martinis generated" value={content.martiniIndex.generations} previous={content.previousMartiniIndex.generations} className="col-span-12 md:col-span-4" />
          </div>
        </FeatureSection>
        <FeatureSection id="places" title="Places" description="New and reviewed places, plus the venues carrying the most review activity." link={{ href: "/admin/places", label: "All places" }}>
          <div className="grid grid-cols-12 gap-4">
            <MetricTile label="New places" value={content.placesInRange} previous={content.previousPlaces} className="col-span-12 border-violet-300 bg-violet-50 md:col-span-3" />
            <MetricTile label="Reviewed places" value={content.reviewedPlacesInRange} hint={`${pct(content.reviewedPlacesInRange, content.totalPlaces)} of all places`} className="col-span-12 md:col-span-3" />
            <MetricTile label="Reviews per place" value={content.reviewedPlacesInRange > 0 ? (content.reviewsInRange / content.reviewedPlacesInRange).toFixed(1) : "—"} className="col-span-12 md:col-span-3" />
            <MetricTile label="Total places" value={content.totalPlaces} className="col-span-12 md:col-span-3" />
          </div>
          <LineChart title="Places added" data={content.placesByDay} color="#7c3aed" unit="places" />
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="font-semibold">Top places by reviews</h3>
            <ul className="mt-3 divide-y divide-stone-100">
              {content.topPlaces.map((place) => <li key={place.id}><Link href={`/admin/places/${place.id}`} className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-stone-50"><span className="min-w-0"><span className="block truncate text-sm font-bold text-stone-900">{place.name ?? "Unknown place"}</span><span className="block truncate text-xs text-stone-500">{formatCityRegion(place.address) || "No address"}</span></span><span className="shrink-0 text-right text-sm"><span className="block font-semibold text-stone-600">{place.reviewsInRange} reviews</span><span className="text-xs text-stone-400">{place.rating == null ? "No rating" : `${place.rating.toFixed(1)} rating`}</span></span></Link></li>)}
              {content.topPlaces.length === 0 ? <li className="py-2.5 text-sm text-stone-400">No places were reviewed in this range.</li> : null}
            </ul>
          </div>
        </FeatureSection>
      </main>
    </AdminShell>
  );
}
