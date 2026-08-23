import { createClient } from "@supabase/supabase-js";

const DEVELOPMENT_PROJECT_REF = "htjnmybbxtmhiyhxiqaz";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error("Development Supabase environment variables are required.");
}
if (new URL(url).hostname.split(".")[0] !== DEVELOPMENT_PROJECT_REF) {
  throw new Error("Refusing to run outside the development Supabase project.");
}

const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const member = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const visitor = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `cursor-test-${runId}@example.test`;
const password = `Cursor-test-${runId}!`;
const username = `cursor_${runId.replace(/[^a-z0-9]/gi, "").slice(-14)}`;
const placeId = `cursor-place-${runId}`;
const locationName = `Cursor Test Bar ${runId}`;
let userId = null;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const rpc = async (name, parameters) => {
  const { data, error } = await member.rpc(name, parameters);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
};

try {
  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    throw new Error(createError?.message ?? "Temporary user was not created.");
  }
  userId = created.user.id;

  const { error: signInError } = await member.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  const { error: profileError } = await member
    .from("profiles")
    .update({ username, is_public: true })
    .eq("id", userId);
  if (profileError) throw profileError;

  const published = [];
  for (let index = 1; index <= 10; index += 1) {
    const result = await rpc("publish_review_v1", {
      p_comment: `Cursor integration review ${index}`,
      p_image_url: `${userId}/cursor-${index}.jpg`,
      p_latitude: 49.2827,
      p_location_address: "100 Development Test Street",
      p_location_id: null,
      p_location_name: locationName,
      p_longitude: -123.1207,
      p_place_id: placeId,
      p_presentation: 4,
      p_spirit_id: null,
      p_taste: 4.5,
      p_type_id: null,
    });
    published.push(result);
  }

  assert(published[0].reviewCount === 1, "First publish count was not one.");
  assert(
    published[0].becameRegular === true,
    "First publish did not report the Regular transition."
  );
  assert(
    published[9].reviewCount === 10 && published[9].rankUp === "call",
    "Tenth publish did not report the Call rank transition."
  );

  const firstPage = await rpc("get_feed_page_v1", {
    p_cursor_id: null,
    p_cursor_inserted_at: null,
    p_exclude_blocked: true,
    p_followed_only: false,
    p_limit: 4,
    p_location_id: null,
    p_user_id: userId,
    p_viewer: userId,
  });
  assert(firstPage.reviews.length === 4, "First feed page was not bounded.");
  assert(firstPage.hasMore === true, "First feed page lost its next cursor.");

  const insertedBetweenPages = await rpc("publish_review_v1", {
    p_comment: "Inserted between cursor pages",
    p_image_url: `${userId}/cursor-between-pages.jpg`,
    p_latitude: 49.2827,
    p_location_address: "100 Development Test Street",
    p_location_id: null,
    p_location_name: locationName,
    p_longitude: -123.1207,
    p_place_id: placeId,
    p_presentation: 4,
    p_spirit_id: null,
    p_taste: 4.5,
    p_type_id: null,
  });
  const secondPage = await rpc("get_feed_page_v1", {
    p_cursor_id: firstPage.nextCursor.id,
    p_cursor_inserted_at: firstPage.nextCursor.insertedAt,
    p_exclude_blocked: true,
    p_followed_only: false,
    p_limit: 4,
    p_location_id: null,
    p_user_id: userId,
    p_viewer: userId,
  });
  const firstIds = new Set(
    firstPage.reviews.map((review) => String(review.id))
  );
  const secondIds = secondPage.reviews.map((review) => String(review.id));
  assert(
    secondIds.every((id) => !firstIds.has(id)),
    "Cursor pages contained a duplicate review."
  );
  assert(
    !secondIds.includes(String(insertedBetweenPages.reviewId)),
    "A newer mid-pagination review leaked into the older page."
  );

  const commentReviewId = published[0].reviewId;
  for (let index = 1; index <= 18; index += 1) {
    const { error } = await member.from("comments").insert({
      review_id: commentReviewId,
      user_id: userId,
      body: `Cursor integration comment ${index}`,
    });
    if (error) throw error;
  }

  const firstCommentPage = await rpc("get_comment_page_v1", {
    p_cursor_id: null,
    p_cursor_inserted_at: null,
    p_limit: 7,
    p_review_id: commentReviewId,
    p_viewer: userId,
  });
  assert(
    firstCommentPage.comments.length === 7,
    "First comment page was not bounded."
  );
  assert(
    firstCommentPage.totalCount === 18 && firstCommentPage.hasMore === true,
    "Comment page did not return its authoritative count and cursor."
  );

  const { data: insertedComment, error: insertedCommentError } = await member
    .from("comments")
    .insert({
      review_id: commentReviewId,
      user_id: userId,
      body: "Inserted between comment cursor pages",
    })
    .select("id")
    .single();
  if (insertedCommentError) throw insertedCommentError;

  const secondCommentPage = await rpc("get_comment_page_v1", {
    p_cursor_id: firstCommentPage.nextCursor.id,
    p_cursor_inserted_at: firstCommentPage.nextCursor.insertedAt,
    p_limit: 7,
    p_review_id: commentReviewId,
    p_viewer: userId,
  });
  const firstCommentIds = new Set(
    firstCommentPage.comments.map((comment) => String(comment.id))
  );
  const secondCommentIds = secondCommentPage.comments.map((comment) =>
    String(comment.id)
  );
  assert(
    secondCommentIds.every((id) => !firstCommentIds.has(id)),
    "Cursor pages contained a duplicate comment."
  );
  assert(
    !secondCommentIds.includes(String(insertedComment.id)),
    "A newer mid-pagination comment leaked into the older page."
  );

  const { data: publicFeedResponse, error: publicFeedError } =
    await visitor.functions.invoke("public-content", {
      body: {
        operation: "feed-page-v1",
        userId,
        limit: 4,
      },
    });
  if (publicFeedError) throw publicFeedError;
  assert(
    publicFeedResponse?.data?.reviews?.length === 4 &&
      publicFeedResponse.data.hasMore === true,
    "Public review cursor page was unavailable."
  );

  const { data: publicCommentResponse, error: publicCommentError } =
    await visitor.functions.invoke("public-content", {
      body: {
        operation: "comment-page-v1",
        reviewId: commentReviewId,
        limit: 5,
      },
    });
  if (publicCommentError) throw publicCommentError;
  assert(
    publicCommentResponse?.data?.comments?.length === 5 &&
      publicCommentResponse.data.totalCount === 19,
    "Public comment cursor page was unavailable."
  );

  const { error: privateError } = await member
    .from("profiles")
    .update({ is_public: false })
    .eq("id", userId);
  if (privateError) throw privateError;
  const { data: privateFeedResponse, error: privateFeedError } =
    await visitor.functions.invoke("public-content", {
      body: { operation: "feed-page-v1", userId, limit: 4 },
    });
  if (privateFeedError) throw privateFeedError;
  assert(
    privateFeedResponse?.data?.reviews?.length === 0,
    "Public review cursor exposed a private profile."
  );

  const profilePage = await rpc("get_discover_profiles_page_v1", {
    p_cursor: null,
    p_limit: 5,
    p_search: username,
  });
  assert(
    profilePage.items.some((profile) => profile.id === userId),
    "Cursor profile discovery did not return the temporary member."
  );

  const locationPage = await rpc("get_discover_locations_page_v1", {
    p_cursor: null,
    p_latitude: 49.2827,
    p_limit: 5,
    p_longitude: -123.1207,
    p_query: locationName,
    p_radius_km: 50,
  });
  const discoveredLocation = locationPage.items.find(
    (location) => location.name === locationName
  );
  assert(discoveredLocation, "Cursor location discovery missed the test bar.");
  assert(
    discoveredLocation.regulars.some(
      (regular) => regular.profile_id === userId
    ),
    "Location discovery did not embed its Regulars."
  );

  console.log(
    "Development integration passed: atomic publish, stable authenticated/public review and comment cursors, privacy, and cursor discovery."
  );
} finally {
  await member.auth.signOut().catch(() => undefined);
  if (userId) {
    await service.auth.admin.deleteUser(userId).catch(() => undefined);
  }
  await service.from("locations").delete().eq("place_id", placeId);
}
