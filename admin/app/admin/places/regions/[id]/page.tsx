import { redirect } from "next/navigation";

export default async function LegacyManageRegionRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect("/admin/places/golden-glass/regions/" + id);
}
