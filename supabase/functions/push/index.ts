import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

interface Notification {
  id: string;
  user_id: string;
  body: string;
  type: number; // added field to indicate notification type
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Notification;
  schema: "public";
  old_record: null | Notification;
}

const NOTIFICATION_TYPES = {
  FOLLOWERS: 1,
  USER: 2,
};

// Expo accepts up to 100 messages per push request.
const EXPO_PUSH_BATCH_SIZE = 100;

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected into every edge
// function by Supabase. The service role bypasses RLS, so profiles.expo_push_token
// no longer needs to be readable by anon clients.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// EXPO_ACCESS_TOKEN is a server-only secret (set via `supabase secrets set`).
// Fallback to the legacy name so existing deployments keep working until rotated.
const expoAccessToken =
  Deno.env.get("EXPO_ACCESS_TOKEN") ?? Deno.env.get("EXPO_PUBLIC_ACCESS_TOKEN");

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

async function sendExpoPushes(pushTokens: string[], body: string) {
  const results: unknown[] = [];
  for (let i = 0; i < pushTokens.length; i += EXPO_PUSH_BATCH_SIZE) {
    const batch = pushTokens.slice(i, i + EXPO_PUSH_BATCH_SIZE);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${expoAccessToken}`,
      },
      body: JSON.stringify(
        batch.map((to) => ({ to, title: "Tini Time Club", body }))
      ),
    });
    results.push(await res.json());
  }
  return results;
}

Deno.serve(async (req) => {
  // Reject anything that isn't the configured database webhook. The webhook
  // must send an `x-webhook-secret` header matching PUSH_WEBHOOK_SECRET.
  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!webhookSecret || req.headers.get("x-webhook-secret") !== webhookSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const payload: WebhookPayload = await req.json();

  if (payload.record.type === NOTIFICATION_TYPES.FOLLOWERS) {
    const { data: followersData, error: followersError } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("following_id", payload.record.user_id);

    if (followersError) {
      console.error("Error fetching followers:", followersError);
      return jsonResponse({ error: followersError.message }, 500);
    }

    if (!followersData || followersData.length === 0) {
      console.log("No followers to notify.");
      return jsonResponse({ message: "No followers to notify." });
    }

    const followerIds = followersData.map((row: any) => row.follower_id);

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .in("id", followerIds);

    if (profilesError) {
      console.error("Error fetching follower profiles:", profilesError);
      return jsonResponse({ error: profilesError.message }, 500);
    }

    const pushTokens = (profilesData ?? [])
      .map((profile: any) => profile.expo_push_token)
      .filter(Boolean);

    if (pushTokens.length === 0) {
      console.log("No follower push tokens to notify.");
      return jsonResponse({ message: "No follower push tokens to notify." });
    }

    const results = await sendExpoPushes(pushTokens, payload.record.body);
    console.log(`Sent FOLLOWER push notes to ${pushTokens.length} tokens`);
    return jsonResponse(results);
  } else if (payload.record.type === NOTIFICATION_TYPES.USER) {
    // For USER notifications, send a push notification to the user specified by user_id.
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .eq("id", payload.record.user_id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return jsonResponse({ error: profileError.message }, 500);
    }

    if (!profileData || !profileData.expo_push_token) {
      console.log("No push token for user.");
      return jsonResponse({ message: "No push token for user." });
    }

    const result = await sendExpoPushes(
      [profileData.expo_push_token],
      payload.record.body
    );
    console.log("Sent USER push note");
    return jsonResponse(result);
  } else {
    return jsonResponse({ message: "Unhandled notification type." });
  }
});
