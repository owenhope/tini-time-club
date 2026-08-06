"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, createSessionToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function login(formData: FormData) {
  const password = formData.get("password");
  if (
    typeof password !== "string" ||
    !process.env.ADMIN_PASSWORD ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    // Blunt but effective brute-force damper for a single-operator tool.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    redirect("/admin/login?error=1");
  }

  const { token, expiresAt } = await createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function setVerified(profileId: string, verified: boolean) {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ is_verified: verified })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/users/${profileId}`);
  revalidatePath("/admin/users");
}

/**
 * Send a notification to one member or everyone. Inserting into
 * `notifications` is the whole delivery mechanism: the push edge function
 * fires off each insert, handles Expo batching/receipts, and the row also
 * appears in the member's in-app notification list.
 */
export async function sendNotification(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "");
  const url = String(formData.get("url") ?? "").trim();

  if (!body || body.length > 180) {
    redirect("/admin/notifications?error=body");
  }
  if (url && !url.startsWith("/")) {
    redirect("/admin/notifications?error=url");
  }

  const admin = supabaseAdmin();
  let userIds: string[] = [];
  if (audience === "all") {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("deleted", false);
    if (error) throw new Error(error.message);
    userIds = (data ?? []).map((p) => p.id);
  } else {
    userIds = [audience];
  }
  if (userIds.length === 0) redirect("/admin/notifications?error=audience");

  const broadcastId = crypto.randomUUID();
  const rows = userIds.map((userId) => ({
    user_id: userId,
    body,
    type: 2,
    kind: "admin_message",
    data: { kind: "admin_message", ...(url ? { url } : {}) },
    event_key: `admin:${broadcastId}:${userId}`,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/notifications");
  redirect(`/admin/notifications?sent=${rows.length}`);
}

export async function setDeleted(profileId: string, deleted: boolean) {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({
      deleted,
      deleted_at: deleted ? new Date().toISOString() : null,
    })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/users/${profileId}`);
  revalidatePath("/admin/users");
}

export async function setReviewActive(reviewId: string, active: boolean) {
  if (!/^\d+$/.test(reviewId)) throw new Error("Invalid review id");

  const { data, error } = await supabaseAdmin()
    .from("reviews")
    .update({ state: active ? 1 : 3 })
    .eq("id", reviewId)
    .select("user_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Review not found");

  revalidatePath(`/admin/reviews/${reviewId}`);
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/users/${data.user_id}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/locations");
}

export async function updateLocation(locationId: string, formData: FormData) {
  if (!/^\d+$/.test(locationId)) throw new Error("Invalid location id");

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const placeId = String(formData.get("place_id") ?? "").trim();
  const path = `/admin/locations/${locationId}`;

  if (!name || name.length > 160) redirect(`${path}?error=name`);
  if (address.length > 300) redirect(`${path}?error=address`);
  if (placeId.length > 255) redirect(`${path}?error=placeId`);

  const { error } = await supabaseAdmin()
    .from("locations")
    .update({
      name,
      address: address || null,
      place_id: placeId || null,
    })
    .eq("id", locationId);
  if (error?.code === "23505") redirect(`${path}?error=placeId`);
  if (error) throw new Error(error.message);

  revalidatePath(path);
  revalidatePath("/admin/locations");
  revalidatePath("/admin");
  revalidatePath("/admin/analytics");
  redirect(`${path}?updated=1`);
}
