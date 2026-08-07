import { redirect } from "next/navigation";

export default async function LocationRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/places/${id}`);
}
