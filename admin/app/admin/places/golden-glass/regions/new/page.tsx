import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { PageHeader } from "@/components/AdminPrimitives";
import RegionMapEditor from "../../../regions/RegionMapEditor";

export default async function NewRegionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;

  return (
    <AdminShell active="golden-glass">
      <PageHeader
        backLink={{
          href: "/admin/places/golden-glass",
          label: "Back to Golden Glass",
        }}
        eyebrow="Explore authority"
        title="Create region"
        description="Add a canonical region only when Golden Glass and Explore need a new supported destination."
        surface="transparent"
        density="compact"
        actions={
          <Link
            href="/admin/places/golden-glass"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Golden Glass index
          </Link>
        }
      />
      <div className="space-y-5 px-8 py-6">
        {query.error ? (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 ring-1 ring-inset ring-red-100">
            Check the region fields and try again.
          </div>
        ) : null}
        <RegionMapEditor
          returnTo="/admin/places/golden-glass/regions/new"
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
        />
      </div>
    </AdminShell>
  );
}
