import { notFound } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import ClickableRow from "@/components/ClickableRow";
import {
  ActionLink,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  StatusPill,
} from "@/components/AdminPrimitives";
import UserBadge from "@/components/UserBadge";
import { updateLocation } from "@/lib/actions";
import { fetchAdminLocation } from "@/lib/data";

export const dynamic = "force-dynamic";

const date = (value: string) => new Date(value).toLocaleDateString();

const overall = (taste: number | null, presentation: number | null) =>
  taste == null || presentation == null
    ? "—"
    : (Math.round(((taste + presentation) / 2) * 10) / 10).toFixed(1);

export default async function PlaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const location = await fetchAdminLocation(id);
  if (!location) notFound();

  const saveLocation = updateLocation.bind(null, String(location.id));
  const mapsUrl = location.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location.address
      )}${
        location.place_id
          ? `&query_place_id=${encodeURIComponent(location.place_id)}`
          : ""
      }`
    : null;
  const errorMessage =
    query.error === "name"
      ? "Enter a place name of 160 characters or fewer."
      : query.error === "address"
        ? "Keep the address to 300 characters or fewer."
        : query.error === "placeId"
          ? "That Google Place ID is invalid or already belongs to another place."
          : null;

  return (
    <AdminShell active="locations">
      <PageHeader
        backLink={{ href: "/admin/places", label: "Back to places" }}
        eyebrow="Place management"
        title={location.name ?? `Place #${location.id}`}
        description={location.address ?? "No address on file."}
        stats={[
          {
            label: "Rating",
            value:
              location.rating != null && location.total_ratings > 0
                ? Number(location.rating).toFixed(1)
                : "—",
            tone: "purple",
          },
          {
            label: "Active Reviews",
            value: location.total_ratings,
            tone: "green",
          },
          {
            label: "All Reviews",
            value: location.all_reviews,
            tone: "chartreuse",
          },
          {
            label: "Added",
            value: date(location.inserted_at),
            tone: "muted",
          },
        ]}
        surface="transparent"
        density="compact"
        actions={
          <div className="flex items-center gap-2">
            <ActionLink
              href={`/admin/share-preview?kind=location&location=${encodeURIComponent(
                String(location.id)
              )}`}
            >
              Preview share page
            </ActionLink>
            {mapsUrl ? (
              <ActionLink href={mapsUrl} external>
                Open in Google Maps
              </ActionLink>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5 px-8 py-6">
        <Panel title="Place details" className="col-span-12 xl:col-span-4">
          <form action={saveLocation} className="space-y-4 p-4">
            {query.updated ? (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-950 ring-1 ring-inset ring-emerald-200">
                Place updated.
              </div>
            ) : null}
            {errorMessage ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 ring-1 ring-inset ring-red-100">
                {errorMessage}
              </div>
            ) : null}
            <label className="block text-xs font-black uppercase tracking-[0.14em] text-stone-500">
              Name
              <input
                name="name"
                required
                maxLength={160}
                defaultValue={location.name ?? ""}
                className="mt-1.5 h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-stone-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="block text-xs font-black uppercase tracking-[0.14em] text-stone-500">
              Address
              <textarea
                name="address"
                maxLength={300}
                rows={3}
                defaultValue={location.address ?? ""}
                className="mt-1.5 w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-stone-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="block text-xs font-black uppercase tracking-[0.14em] text-stone-500">
              Google Place ID
              <input
                name="place_id"
                maxLength={255}
                defaultValue={location.place_id ?? ""}
                className="mt-1.5 h-10 w-full rounded-md border border-stone-200 bg-white px-3 font-mono text-xs font-medium normal-case tracking-normal text-stone-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <button
              type="submit"
              className="h-9 rounded-md bg-emerald-900 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Save place
            </button>
          </form>
        </Panel>

        <div className="col-span-12 xl:col-span-8">
          <DataTable
            columns={[
              "Posted",
              "Member",
              "Rating",
              "Caption",
              "State",
              "Actions",
            ]}
            empty={
              location.reviews.length === 0 ? (
                <EmptyState>No reviews at this place.</EmptyState>
              ) : null
            }
          >
            {location.reviews.map((review) => (
              <ClickableRow
                key={review.id}
                href={`/admin/reviews/${review.id}`}
                className="cursor-pointer hover:bg-stone-50 focus:bg-stone-50 focus:outline-none"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-500">
                  {date(review.inserted_at)}
                </td>
                <td className="px-4 py-3">
                  {review.profile ? (
                    <UserBadge profile={review.profile} />
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono font-semibold tabular-nums text-stone-900">
                  {overall(review.taste, review.presentation)}
                </td>
                <td className="max-w-0 px-4 py-3 text-stone-500">
                  <div className="truncate" title={review.comment ?? ""}>
                    {review.comment ?? ""}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {review.state === 1 ? (
                    <StatusPill tone="green">Active</StatusPill>
                  ) : (
                    <StatusPill>Inactive</StatusPill>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <ActionLink href={`/admin/reviews/${review.id}`}>
                    Manage
                  </ActionLink>
                </td>
              </ClickableRow>
            ))}
          </DataTable>
        </div>
      </div>
    </AdminShell>
  );
}
