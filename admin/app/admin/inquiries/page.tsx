import AdminShell from "@/components/AdminShell";
import {
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  StatusPill,
} from "@/components/AdminPrimitives";
import { setBusinessInquiryHandled } from "@/lib/actions";
import { toAdminDataError } from "@/lib/dataErrors";
import { formatAdminDate } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

interface BusinessInquiry {
  id: string;
  contact_name: string;
  business_name: string;
  business_email: string;
  phone: string | null;
  message: string;
  status: "new" | "handled";
  submitted_at: string;
  handled_at: string | null;
}

async function fetchBusinessInquiries(
  status?: "new" | "handled",
  search?: string
): Promise<{ inquiries: BusinessInquiry[]; newCount: number }> {
  const db = supabaseAdmin();
  let query = db
    .from("business_inquiries")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  const term = search
    ?.trim()
    .replace(/[,%()]/g, " ")
    .trim();
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      `contact_name.ilike.${pattern},business_name.ilike.${pattern},business_email.ilike.${pattern},message.ilike.${pattern}`
    );
  }
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    query,
    db
      .from("business_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);
  if (error) throw toAdminDataError(error, "load business inquiries");
  if (countError)
    throw toAdminDataError(countError, "count business inquiries");
  return {
    inquiries: (data ?? []) as BusinessInquiry[],
    newCount: count ?? 0,
  };
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const query = await searchParams;
  const status =
    query.status === "new" || query.status === "handled"
      ? query.status
      : undefined;
  const { inquiries, newCount } = await fetchBusinessInquiries(status, query.q);

  return (
    <AdminShell active="inquiries">
      <PageHeader
        eyebrow="Business outreach"
        title="Inquiries"
        description="General business inquiries from the public website. No location attached — read, reply by email, then mark handled."
        stats={[{ label: "New inquiries", value: newCount, tone: "purple" }]}
        statColumns={3}
        surface="transparent"
        density="compact"
      />
      <div className="px-8 py-6">
        <DataTable
          toolbar={
            <FilterBar
              action="/admin/inquiries"
              searchDefault={query.q}
              searchPlaceholder="Search inquiries..."
              variant="attached"
            >
              <FilterSelect
                name="status"
                label="Status"
                defaultValue={query.status}
                options={[
                  { label: "All", value: "" },
                  { label: "New", value: "new" },
                  { label: "Handled", value: "handled" },
                ]}
              />
            </FilterBar>
          }
          columns={[
            "From",
            "Business",
            "Message",
            "Submitted",
            "Status",
            "Actions",
          ]}
          empty={
            inquiries.length === 0 ? (
              <EmptyState>No inquiries match this view.</EmptyState>
            ) : null
          }
        >
          {inquiries.map((inquiry) => (
            <tr key={inquiry.id} className="align-top">
              <td className="px-4 py-3">
                <div className="font-bold text-stone-900">
                  {inquiry.contact_name}
                </div>
                <div className="text-xs text-stone-500">
                  {inquiry.business_email}
                </div>
                {inquiry.phone ? (
                  <div className="text-xs text-stone-500">{inquiry.phone}</div>
                ) : null}
              </td>
              <td className="px-4 py-3 font-semibold text-stone-700">
                {inquiry.business_name}
              </td>
              <td className="max-w-md px-4 py-3 text-sm leading-6 text-stone-700">
                <p className="whitespace-pre-wrap">{inquiry.message}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-500">
                {formatAdminDate(inquiry.submitted_at)}
              </td>
              <td className="px-4 py-3">
                <StatusPill
                  tone={inquiry.status === "new" ? "purple" : "green"}
                >
                  {inquiry.status === "new" ? "New" : "Handled"}
                </StatusPill>
              </td>
              <td className="px-4 py-3">
                <form action={setBusinessInquiryHandled}>
                  <input type="hidden" name="inquiry_id" value={inquiry.id} />
                  <input
                    type="hidden"
                    name="handled"
                    value={inquiry.status === "new" ? "1" : "0"}
                  />
                  <button
                    type="submit"
                    className="text-sm font-bold text-violet-700 hover:text-violet-800"
                  >
                    {inquiry.status === "new" ? "Mark handled" : "Reopen"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </AdminShell>
  );
}
