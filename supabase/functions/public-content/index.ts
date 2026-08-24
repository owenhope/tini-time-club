/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const MAX_PAGE_SIZE = 50;
const SIGNED_IMAGE_SECONDS = 60 * 60;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;
const requestWindows = new Map<string, { count: number; startedAt: number }>();

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });

const clampLimit = (value: unknown, fallback = 20) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(Math.floor(numeric), MAX_PAGE_SIZE));
};

const clampOffset = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(Math.floor(numeric), 10_000));
};

const parseCursor = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const raw = value as { insertedAt?: unknown; id?: unknown };
  if (typeof raw.insertedAt !== "string") return null;
  const timestamp = Date.parse(raw.insertedAt);
  const id = Number(raw.id);
  if (!Number.isFinite(timestamp) || !Number.isSafeInteger(id) || id < 1) {
    return null;
  }
  return { insertedAt: new Date(timestamp).toISOString(), id };
};

const isRateLimited = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const key = forwarded?.trim() || "unknown";
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestWindows.set(key, { count: 1, startedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
};

const getClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Public content is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const renderSignedUrl = (signedUrl: string) =>
  signedUrl.includes("/object/sign/")
    ? `${signedUrl.replace("/object/sign/", "/render/image/sign/")}&width=1080&quality=70`
    : signedUrl;

async function signReviewImages(
  client: ReturnType<typeof createClient>,
  rows: any[]
) {
  const paths = [
    ...new Set(
      rows
        .map((row) => row.image_url)
        .filter((path): path is string => Boolean(path))
    ),
  ];
  if (!paths.length) return rows;

  const { data } = await client.storage
    .from("review_images")
    .createSignedUrls(paths, SIGNED_IMAGE_SECONDS);
  const urls = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) {
      urls.set(item.path, renderSignedUrl(item.signedUrl));
    }
  }
  return rows.map((row) => ({
    ...row,
    image_url: row.image_url ? (urls.get(row.image_url) ?? "") : "",
  }));
}

const publicReviewSelect = `
  id,
  comment,
  image_url,
  inserted_at,
  taste,
  presentation,
  user_id,
  location:locations!reviews_location_fkey(id,name,address),
  spirit:spirits(name),
  type:types(name),
  profile:profiles!reviews_user_id_fkey1!inner(id,username,avatar_url,is_verified,review_count,is_public,deleted)
`;

async function getCommentLikeCounts(
  client: ReturnType<typeof createClient>,
  commentIds: Array<string | number>
) {
  const counts = new Map<string, number>();
  if (!commentIds.length) return counts;
  const { data, error } = await client
    .from("comment_likes")
    .select("comment_id")
    .in("comment_id", commentIds);
  if (error) throw error;
  for (const like of data ?? []) {
    const key = String(like.comment_id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

const sanitizePublicComment = (comment: any, likesCount: number) => {
  const {
    is_public: _isPublic,
    deleted: _deleted,
    ...profile
  } = comment.profile;
  return {
    ...comment,
    profile,
    likes_count: likesCount,
    has_liked: false,
  };
};

async function hydrateReviews(
  client: ReturnType<typeof createClient>,
  rows: any[]
) {
  if (!rows.length) return [];
  const reviewIds = rows.map((row) => row.id);
  const locationIds = [
    ...new Set(rows.map((row) => row.location?.id).filter(Boolean)),
  ];
  const [{ data: likes }, { data: comments }, { data: ratings }] =
    await Promise.all([
      client.from("likes").select("review_id").in("review_id", reviewIds),
      client
        .from("comments")
        .select(
          "id,review_id,user_id,body,inserted_at,profile:profiles!comments_user_id_fkey!inner(id,username,avatar_url,is_verified,review_count,is_public,deleted)"
        )
        .in("review_id", reviewIds)
        .eq("profile.is_public", true)
        .eq("profile.deleted", false)
        .order("inserted_at", { ascending: false }),
      locationIds.length
        ? client
            .from("location_ratings")
            .select("id,rating,total_ratings,is_golden_glass")
            .in("id", locationIds)
        : Promise.resolve({ data: [] }),
    ]);
  const commentLikes = await getCommentLikeCounts(
    client,
    (comments ?? []).map((comment) => comment.id)
  );

  const likesByReview = new Map<string, number>();
  for (const like of likes ?? []) {
    const key = String(like.review_id);
    likesByReview.set(key, (likesByReview.get(key) ?? 0) + 1);
  }
  const commentsByReview = new Map<string, any[]>();
  for (const comment of comments ?? []) {
    const key = String(comment.review_id);
    const list = commentsByReview.get(key) ?? [];
    list.push(
      sanitizePublicComment(comment, commentLikes.get(String(comment.id)) ?? 0)
    );
    commentsByReview.set(key, list);
  }
  const ratingsByLocation = new Map(
    (ratings ?? []).map((rating) => [String(rating.id), rating])
  );

  const hydrated = rows.map((row) => {
    const reviewComments = commentsByReview.get(String(row.id)) ?? [];
    const rating = ratingsByLocation.get(String(row.location?.id));
    const { is_public: _isPublic, deleted: _deleted, ...profile } = row.profile;
    return {
      ...row,
      id: String(row.id),
      profile,
      location: row.location
        ? {
            ...row.location,
            rating: rating?.rating ?? null,
            total_ratings: rating?.total_ratings ?? 0,
            is_golden_glass: Boolean(rating?.is_golden_glass),
          }
        : null,
      likes_count: likesByReview.get(String(row.id)) ?? 0,
      comments_count: reviewComments.length,
      has_liked: false,
      recent_comments: reviewComments.slice(0, 2).reverse(),
    };
  });
  return signReviewImages(client, hydrated);
}

async function getFeed(client: ReturnType<typeof createClient>, body: any) {
  let query = client
    .from("reviews")
    .select(publicReviewSelect)
    .eq("state", 1)
    .eq("profile.is_public", true)
    .eq("profile.deleted", false)
    .order("inserted_at", { ascending: false })
    .range(
      clampOffset(body.offset),
      clampOffset(body.offset) + clampLimit(body.limit) - 1
    );
  if (body.userId) query = query.eq("user_id", String(body.userId));
  if (body.locationId) query = query.eq("location", Number(body.locationId));
  const { data, error } = await query;
  if (error) throw error;
  return hydrateReviews(client, data ?? []);
}

async function getFeedPage(client: ReturnType<typeof createClient>, body: any) {
  const limit = clampLimit(body.limit);
  let query = client
    .from("reviews")
    .select(publicReviewSelect)
    .eq("state", 1)
    .eq("profile.is_public", true)
    .eq("profile.deleted", false)
    .order("inserted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (body.userId) query = query.eq("user_id", String(body.userId));
  if (body.locationId) query = query.eq("location", Number(body.locationId));

  const cursor = parseCursor(body.cursor);
  if (cursor) {
    query = query.or(
      `inserted_at.lt.${cursor.insertedAt},and(inserted_at.eq.${cursor.insertedAt},id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const visible = rows.slice(0, limit);
  const reviews = await hydrateReviews(client, visible);
  const last = visible.at(-1);
  return {
    reviews,
    nextCursor:
      hasMore && last
        ? { insertedAt: last.inserted_at, id: String(last.id) }
        : null,
    hasMore,
  };
}

async function getReview(client: ReturnType<typeof createClient>, body: any) {
  const { data, error } = await client
    .from("reviews")
    .select(publicReviewSelect)
    .eq("id", Number(body.reviewId))
    .eq("state", 1)
    .eq("profile.is_public", true)
    .eq("profile.deleted", false)
    .single();
  if (error) throw error;
  return (await hydrateReviews(client, [data]))[0];
}

async function getComments(client: ReturnType<typeof createClient>, body: any) {
  const { data: review } = await client
    .from("reviews")
    .select(
      "id,profile:profiles!reviews_user_id_fkey1!inner(is_public,deleted)"
    )
    .eq("id", Number(body.reviewId))
    .eq("state", 1)
    .eq("profile.is_public", true)
    .eq("profile.deleted", false)
    .maybeSingle();
  if (!review) return [];

  const { data, error } = await client
    .from("comments")
    .select(
      "id,user_id,review_id,body,inserted_at,profile:profiles!comments_user_id_fkey!inner(id,username,avatar_url,is_verified,review_count,is_public,deleted)"
    )
    .eq("review_id", Number(body.reviewId))
    .eq("profile.is_public", true)
    .eq("profile.deleted", false)
    .order("inserted_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  const likes = await getCommentLikeCounts(
    client,
    (data ?? []).map((comment) => comment.id)
  );
  return (data ?? []).map((comment) =>
    sanitizePublicComment(comment, likes.get(String(comment.id)) ?? 0)
  );
}

async function getCommentPage(
  client: ReturnType<typeof createClient>,
  body: any
) {
  const reviewId = Number(body.reviewId);
  const { data: review } = await client
    .from("reviews")
    .select(
      "id,profile:profiles!reviews_user_id_fkey1!inner(is_public,deleted)"
    )
    .eq("id", reviewId)
    .eq("state", 1)
    .eq("profile.is_public", true)
    .eq("profile.deleted", false)
    .maybeSingle();
  if (!review) {
    return { comments: [], nextCursor: null, hasMore: false, totalCount: 0 };
  }

  const limit = clampLimit(body.limit);
  let query = client
    .from("comments")
    .select(
      "id,user_id,review_id,body,inserted_at,profile:profiles!comments_user_id_fkey!inner(id,username,avatar_url,is_verified,review_count,is_public,deleted)"
    )
    .eq("review_id", reviewId)
    .eq("profile.is_public", true)
    .eq("profile.deleted", false)
    .order("inserted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  const cursor = parseCursor(body.cursor);
  if (cursor) {
    query = query.or(
      `inserted_at.lt.${cursor.insertedAt},and(inserted_at.eq.${cursor.insertedAt},id.lt.${cursor.id})`
    );
  }

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    query,
    client
      .from("comments")
      .select(
        "id,profile:profiles!comments_user_id_fkey!inner(is_public,deleted)",
        { count: "exact", head: true }
      )
      .eq("review_id", reviewId)
      .eq("profile.is_public", true)
      .eq("profile.deleted", false),
  ]);
  if (error) throw error;
  if (countError) throw countError;
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const visible = rows.slice(0, limit);
  const likes = await getCommentLikeCounts(
    client,
    visible.map((comment) => comment.id)
  );
  const comments = visible
    .map((comment) =>
      sanitizePublicComment(comment, likes.get(String(comment.id)) ?? 0)
    )
    .reverse();
  const oldest = visible.at(-1);
  return {
    comments,
    nextCursor:
      hasMore && oldest
        ? { insertedAt: oldest.inserted_at, id: String(oldest.id) }
        : null,
    hasMore,
    totalCount: count ?? 0,
  };
}

async function getProfile(client: ReturnType<typeof createClient>, body: any) {
  const { data: profile, error } = await client
    .from("profiles")
    .select(
      "id,username,name,bio,avatar_url,is_verified,favorite_spirits,favorite_types,favorite_location_id,review_count,is_public"
    )
    .eq("username", String(body.username ?? ""))
    .eq("is_public", true)
    .eq("deleted", false)
    .single();
  if (error) throw error;
  const [{ count: followersCount }, { count: followingCount }] =
    await Promise.all([
      client
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),
      client
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);
  return {
    profile,
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

async function getProfiles(client: ReturnType<typeof createClient>, body: any) {
  let query = client
    .from("profiles")
    .select("id,username,avatar_url,is_verified,review_count")
    .eq("is_public", true)
    .eq("deleted", false)
    .not("username", "is", null)
    .order("review_count", { ascending: false })
    .range(
      Number(body.offset) || 0,
      (Number(body.offset) || 0) + clampLimit(body.limit, 50) - 1
    )
    .limit(clampLimit(body.limit, 50));
  const search = String(body.search ?? "")
    .replace(/[^\p{L}\p{N}\s'&.-]/gu, "")
    .trim();
  if (search) query = query.ilike("username", `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function getLocations(
  client: ReturnType<typeof createClient>,
  body: any
) {
  let query = client
    .from("location_ratings")
    .select(
      "id,name,address,lat,lon,rating,taste_avg,presentation_avg,total_ratings,is_golden_glass"
    )
    .gte("total_ratings", 2)
    .order("rating", { ascending: false, nullsFirst: false })
    .order("total_ratings", { ascending: false })
    .range(
      Number(body.offset) || 0,
      (Number(body.offset) || 0) + clampLimit(body.limit, 50) - 1
    )
    .limit(clampLimit(body.limit, 50));
  const search = String(body.search ?? "")
    .replace(/[^\p{L}\p{N}\s'&.-]/gu, "")
    .trim();
  if (search)
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function getLocation(client: ReturnType<typeof createClient>, body: any) {
  const { data, error } = await client
    .from("location_ratings")
    .select(
      "id,name,address,lat,lon,rating,taste_avg,presentation_avg,total_ratings,is_golden_glass"
    )
    .eq("id", Number(body.locationId))
    .single();
  if (error) throw error;
  return data;
}

async function getLocationsInView(
  client: ReturnType<typeof createClient>,
  body: any
) {
  const bounds = [body.minLat, body.minLong, body.maxLat, body.maxLong].map(
    Number
  );
  if (!bounds.every(Number.isFinite)) throw new Error("Invalid map bounds");
  const regionId = Number(body.regionId);
  const { data, error } = await client.rpc(
    Number.isSafeInteger(regionId) && regionId > 0
      ? "public_locations_in_region_view"
      : "locations_in_view",
    {
      ...(Number.isSafeInteger(regionId) && regionId > 0
        ? {
            p_min_lat: bounds[0],
            p_min_long: bounds[1],
            p_max_lat: bounds[2],
            p_max_long: bounds[3],
          }
        : {
            min_lat: bounds[0],
            min_long: bounds[1],
            max_lat: bounds[2],
            max_long: bounds[3],
          }),
      ...(Number.isSafeInteger(regionId) && regionId > 0
        ? { p_region_id: regionId }
        : {}),
    }
  );
  if (error) throw error;
  const rows = data ?? [];
  const locationIds = rows
    .filter((row: any) => row.is_golden_glass == null)
    .map((row: any) => row.id)
    .filter(Boolean);
  if (!locationIds.length) return rows;

  const { data: awards } = await client
    .from("location_ratings")
    .select("id,is_golden_glass")
    .in("id", locationIds);
  const awardsByLocation = new Map(
    (awards ?? []).map((row: any) => [
      String(row.id),
      Boolean(row.is_golden_glass),
    ])
  );
  return rows.map((row: any) => ({
    ...row,
    is_golden_glass:
      row.is_golden_glass ?? awardsByLocation.get(String(row.id)) ?? false,
  }));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);
  if (isRateLimited(request))
    return jsonResponse({ error: "Too many requests" }, 429);

  try {
    const body = await request.json();
    const client = getClient();
    let data: unknown;
    switch (body.operation) {
      case "feed":
        data = await getFeed(client, body);
        break;
      case "feed-page-v1":
        data = await getFeedPage(client, body);
        break;
      case "review":
        data = await getReview(client, body);
        break;
      case "comments":
        data = await getComments(client, body);
        break;
      case "comment-page-v1":
        data = await getCommentPage(client, body);
        break;
      case "profile":
        data = await getProfile(client, body);
        break;
      case "profiles":
        data = await getProfiles(client, body);
        break;
      case "locations":
        data = await getLocations(client, body);
        break;
      case "location":
        data = await getLocation(client, body);
        break;
      case "locations-in-view":
        data = await getLocationsInView(client, body);
        break;
      default:
        return jsonResponse({ error: "Unknown public-content operation" }, 400);
    }
    return jsonResponse({ data });
  } catch (error) {
    console.error("Public content request failed", error);
    return jsonResponse({ error: "Public content is unavailable" }, 500);
  }
});
