import { redirect } from "next/navigation";

export default function LegacyNewRegionRedirect() {
  redirect("/admin/places/golden-glass/regions/new");
}
