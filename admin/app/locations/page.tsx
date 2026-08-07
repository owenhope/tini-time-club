import { redirect } from "next/navigation";

export default function LocationsRedirect() {
  redirect("/admin/places");
}
