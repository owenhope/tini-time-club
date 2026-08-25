"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toAdminDataError } from "@/lib/dataErrors";
import { SESSION_COOKIE, createSessionToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildAdminNotificationRows,
  chunkNotificationRows,
  NOTIFICATION_BATCH_SIZE,
} from "@/lib/notificationBroadcast";

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
  if (error) throw toAdminDataError(error, "update profile verification");
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
  const broadcastId = crypto.randomUUID();
  let sent = 0;

  const insertRows = async (userIds: string[]) => {
    const rows = buildAdminNotificationRows(userIds, {
      body,
      ...(url ? { url } : {}),
      broadcastId,
    });
    for (const batch of chunkNotificationRows(rows)) {
      const { error } = await admin
        .from("notifications")
        .upsert(batch, { onConflict: "event_key", ignoreDuplicates: true });
      if (error) throw toAdminDataError(error, "send notification");
      sent += batch.length;
    }
  };

  if (audience === "all") {
    for (let offset = 0; ; offset += NOTIFICATION_BATCH_SIZE) {
      const { data, error } = await admin
        .from("profiles")
        .select("id")
        .eq("deleted", false)
        .order("id", { ascending: true })
        .range(offset, offset + NOTIFICATION_BATCH_SIZE - 1);
      if (error) throw toAdminDataError(error, "load notification audience");
      const userIds = (data ?? []).map((profile) => profile.id);
      if (userIds.length === 0) break;
      await insertRows(userIds);
      if (userIds.length < NOTIFICATION_BATCH_SIZE) break;
    }
  } else {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        audience
      )
    ) {
      redirect("/admin/notifications?error=audience");
    }
    const { data: member, error } = await admin
      .from("profiles")
      .select("id")
      .eq("id", audience)
      .eq("deleted", false)
      .maybeSingle();
    if (error) throw toAdminDataError(error, "load notification audience");
    if (!member) redirect("/admin/notifications?error=audience");
    await insertRows([member.id]);
  }

  if (sent === 0) redirect("/admin/notifications?error=audience");

  revalidatePath("/admin/notifications");
  redirect(`/admin/notifications?sent=${sent}`);
}

export async function setDeleted(profileId: string, deleted: boolean) {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({
      deleted,
      deleted_at: deleted ? new Date().toISOString() : null,
    })
    .eq("id", profileId);
  if (error) throw toAdminDataError(error, "update profile deletion");
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
  if (error) throw toAdminDataError(error, "update review status");
  if (!data) throw new Error("Review not found");

  revalidatePath(`/admin/reviews/${reviewId}`);
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/users/${data.user_id}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/places");
}

const REPORT_STATUSES = ["reviewed", "dismissed"] as const;

export async function setReportStatus(
  reportId: string,
  status: (typeof REPORT_STATUSES)[number]
) {
  if (!REPORT_STATUSES.includes(status))
    throw new Error("Invalid report status");

  const { error } = await supabaseAdmin()
    .from("reports")
    .update({ status })
    .eq("id", reportId);
  if (error) throw toAdminDataError(error, "update report status");

  revalidatePath("/admin/reports");
}

export async function deleteReportedContentAndResolve(reportId: string) {
  const admin = supabaseAdmin();
  const { data: report, error: reportError } = await admin
    .from("reports")
    .select("content_type,review_id,comment_id")
    .eq("id", reportId)
    .maybeSingle();
  if (reportError) throw toAdminDataError(reportError, "load report content");
  if (!report) throw new Error("Report not found");

  const contentType =
    report.content_type ?? (report.comment_id ? "comment" : "review");
  if (contentType === "comment" && report.comment_id) {
    const { error: resolveRelatedError } = await admin
      .from("reports")
      .update({ status: "resolved" })
      .eq("comment_id", report.comment_id);
    if (resolveRelatedError)
      throw toAdminDataError(
        resolveRelatedError,
        "resolve related comment reports"
      );

    const { error } = await admin
      .from("comments")
      .delete()
      .eq("id", report.comment_id);
    if (error) throw toAdminDataError(error, "delete reported comment");
  } else if (contentType === "review" && report.review_id) {
    const { error: resolveRelatedError } = await admin
      .from("reports")
      .update({ status: "resolved" })
      .eq("review_id", report.review_id);
    if (resolveRelatedError)
      throw toAdminDataError(
        resolveRelatedError,
        "resolve related review reports"
      );

    const { error } = await admin
      .from("reviews")
      .update({ state: 3 })
      .eq("id", report.review_id);
    if (error) throw toAdminDataError(error, "deactivate reported review");
  }

  const { error: resolveError } = await admin
    .from("reports")
    .update({ status: "resolved" })
    .eq("id", reportId);
  if (resolveError) throw toAdminDataError(resolveError, "resolve report");

  revalidatePath("/admin/reports");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/users");
  revalidatePath("/admin/places");
  revalidatePath("/admin/analytics");
  revalidatePath("/admin");
}

export async function updateLocation(locationId: string, formData: FormData) {
  if (!/^\d+$/.test(locationId)) throw new Error("Invalid location id");

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const placeId = String(formData.get("place_id") ?? "").trim();
  const neighborhood = String(formData.get("neighborhood") ?? "").trim();
  const eligible = String(formData.get("golden_glass_eligible") ?? "") === "on";
  const ineligibilityReason = String(
    formData.get("golden_glass_ineligibility_reason") ?? ""
  ).trim();
  const path = `/admin/places/${locationId}`;

  if (!name || name.length > 160) redirect(`${path}?error=name`);
  if (address.length > 300) redirect(`${path}?error=address`);
  if (placeId.length > 255) redirect(`${path}?error=placeId`);
  if (neighborhood.length > 120) redirect(`${path}?error=neighborhood`);
  if (!eligible && !ineligibilityReason) redirect(`${path}?error=eligibility`);
  if (ineligibilityReason.length > 500) redirect(`${path}?error=eligibility`);

  const { error } = await supabaseAdmin()
    .from("locations")
    .update({
      name,
      address: address || null,
      place_id: placeId || null,
      neighborhood: neighborhood || null,
      golden_glass_eligible: eligible,
      golden_glass_ineligibility_reason: eligible ? null : ineligibilityReason,
    })
    .eq("id", locationId);
  if (error?.code === "23505") redirect(`${path}?error=placeId`);
  if (error) throw toAdminDataError(error, "update location");

  revalidatePath(path);
  revalidatePath("/admin/places");
  revalidatePath("/admin");
  revalidatePath("/admin/analytics");
  redirect(`${path}?updated=1`);
}

export async function upsertRegion(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const returnTo = getRegionReturnPath(formData);
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "on";
  const displayOrder = Number(formData.get("display_order"));
  const numbers = ["center_lat", "center_lon", "catchment_radius_m"].map(
    (key) => Number(formData.get(key))
  );

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    redirect(`${returnTo}?error=slug`);
  }
  if (!name || name.length > 100 || !Number.isInteger(displayOrder)) {
    redirect(`${returnTo}?error=fields`);
  }
  if (
    numbers.some((value) => !Number.isFinite(value)) ||
    Math.abs(numbers[0]) > 90 ||
    Math.abs(numbers[1]) > 180 ||
    numbers[2] <= 0 ||
    numbers[2] > 500_000
  ) {
    redirect(`${returnTo}?error=coordinates`);
  }

  const values = {
    slug,
    name,
    enabled,
    display_order: displayOrder,
    center_lat: numbers[0],
    center_lon: numbers[1],
    catchment_radius_m: numbers[2],
    updated_at: new Date().toISOString(),
  };
  const query = supabaseAdmin().from("regions");
  let savedId = id && /^\d+$/.test(id) ? id : "";
  const result = savedId
    ? await query.update(values).eq("id", savedId)
    : await query.insert(values).select("id").single();
  if (result.error) {
    if (result.error.code === "23505") redirect(`${returnTo}?error=slug`);
    throw toAdminDataError(result.error, "save region");
  }
  if (!savedId && result.data && "id" in result.data) {
    savedId = String(result.data.id);
  }

  let refreshFailed = false;
  const { error: refreshError } = await supabaseAdmin().rpc(
    "refresh_golden_glass_v1"
  );
  if (refreshError) {
    refreshFailed = true;
    console.error("[admin] Golden Glass refresh after region save failed", {
      message: refreshError.message,
    });
  }

  let eligibilityBlocked = false;
  if (!refreshFailed && enabled && savedId) {
    const { data: inspection, error: inspectionError } =
      await supabaseAdmin().rpc("get_golden_glass_inspection_v1", {
        p_region_id: Number(savedId),
      });
    if (inspectionError) {
      refreshFailed = true;
      console.error(
        "[admin] Golden Glass readiness check after region save failed",
        { message: inspectionError.message }
      );
    } else if ((inspection ?? []).length === 0) {
      const disableResult = await supabaseAdmin()
        .from("regions")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("id", savedId);
      if (disableResult.error)
        throw toAdminDataError(disableResult.error, "disable region");
      eligibilityBlocked = true;

      const { error: disabledRefreshError } = await supabaseAdmin().rpc(
        "refresh_golden_glass_v1"
      );
      if (disabledRefreshError) {
        refreshFailed = true;
        console.error(
          "[admin] Golden Glass refresh after readiness block failed",
          { message: disabledRefreshError.message }
        );
      }
    }
  }

  revalidatePath("/admin/places/regions");
  if (savedId) {
    revalidatePath(`/admin/places/golden-glass/regions/${savedId}`);
  }
  revalidatePath("/admin/places/golden-glass");
  const destination = savedId
    ? `/admin/places/golden-glass/regions/${savedId}`
    : returnTo;
  redirect(
    `${destination}?updated=1${refreshFailed ? "&refresh=failed" : ""}${
      eligibilityBlocked ? "&eligibility=blocked" : ""
    }`
  );
}

const getRegionReturnPath = (formData: FormData) => {
  const value = String(formData.get("return_to") ?? "").trim();
  return /^\/admin\/places\/regions(?:\/(?:new|\d+))?$/.test(value)
    ? value
    : "/admin/places/regions";
};

export async function saveRegionGoogleMapping(
  regionId: string,
  formData: FormData
) {
  if (!/^\d+$/.test(regionId)) throw new Error("Invalid region id");
  const returnTo = getRegionReturnPath(formData);
  const googlePlaceId = String(formData.get("google_place_id") ?? "").trim();
  const submittedLabel = String(formData.get("google_label") ?? "").trim();
  if (
    !googlePlaceId ||
    googlePlaceId.length > 255 ||
    !submittedLabel ||
    submittedLabel.length > 200
  ) {
    redirect(`${returnTo}?error=mapping`);
  }
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) redirect(`${returnTo}?error=google-config`);
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(googlePlaceId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,types",
      },
      cache: "no-store",
    }
  );
  const place = await response.json();
  const cityTypes = new Set([
    "locality",
    "postal_town",
    "administrative_area_level_2",
  ]);
  if (
    !response.ok ||
    place.id !== googlePlaceId ||
    !Array.isArray(place.types) ||
    !place.types.some((type: unknown) => cityTypes.has(String(type)))
  ) {
    redirect(`${returnTo}?error=mapping`);
  }
  const googleLabel = String(place.displayName?.text ?? submittedLabel).trim();
  const { error } = await supabaseAdmin()
    .from("region_google_places")
    .upsert(
      {
        region_id: Number(regionId),
        google_place_id: googlePlaceId,
        google_label: googleLabel,
      },
      { onConflict: "google_place_id" }
    );
  if (error) throw toAdminDataError(error, "save region Google mapping");
  revalidatePath("/admin/places/regions");
  revalidatePath(`/admin/places/regions/${regionId}`);
  redirect(`${returnTo}?updated=1`);
}

export async function refreshGoldenGlass() {
  const { error } = await supabaseAdmin().rpc("refresh_golden_glass_v1");
  if (error) throw toAdminDataError(error, "refresh Golden Glass");
  revalidatePath("/admin/places/golden-glass");
  revalidatePath("/admin/places");
  redirect("/admin/places/golden-glass?refreshed=1");
}
