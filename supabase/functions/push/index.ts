import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

interface Notification {
  id: string; 
  user_id: string; 
  body: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Notification;
  schema: "public";
  old_record: null | Notification;
}

const supabase = createClient(
  Deno.env.get("EXPO_PUBLIC_SUPABASE_URL"),
  Deno.env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
);

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();

  // 1. Fetch followers of the user (where the user being followed is payload.record.user_id)
  const { data: followersData, error: followersError } = await supabase
    .from("followers")
    .select("follower_id")
    .eq("following_id", payload.record.user_id);

  if (followersError) {
    console.error("Error fetching followers:", followersError);
    return new Response(
      JSON.stringify({ error: followersError.message }),
      { headers: { "content-type": "application/json" } }
    );
  }

  if (!followersData || followersData.length === 0) {
    console.log("No followers to notify.");
    return new Response(
      JSON.stringify({ message: "No followers to notify." }),
      { headers: { "content-type": "application/json" } }
    );
  }

  // 2. Extract follower IDs from the result.
  const followerIds = followersData.map((row: any) => row.follower_id);

  // 3. Retrieve the expo_push_token for each follower in a single query.
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .in("id", followerIds);

  if (profilesError) {
    console.error("Error fetching follower profiles:", profilesError);
    return new Response(
      JSON.stringify({ error: profilesError.message }),
      { headers: { "content-type": "application/json" } }
    );
  }

  // 4. Loop through each follower's push token and send a push notification.
  const notifications = profilesData.map(async (profile: any) => {
    const pushToken = profile.expo_push_token;
    if (!pushToken) return null;
    return await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("EXPO_PUBLIC_ACCESS_TOKEN")}`
      },
      body: JSON.stringify({
        to: pushToken,
        title: "Tini Time Club",
        body: payload.record.body,
      }),
    }).then((res) => res.json());
  });

  // Wait for all notifications to be sent
  const results = await Promise.all(notifications);

  return new Response(JSON.stringify(results), {
    headers: { "content-type": "application/json" },
  });
});
