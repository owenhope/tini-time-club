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

const supabase = createClient(
  Deno.env.get("EXPO_PUBLIC_SUPABASE_URL")!,
  Deno.env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")!
);

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();

  // Check the notification type.
  if (payload.record.type === NOTIFICATION_TYPES.FOLLOWERS) {
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

    const followerIds = followersData.map((row: any) => row.follower_id);

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

    // Wait for all notifications to be sent.
    const results = await Promise.all(notifications);
    return new Response(JSON.stringify(results), {
      headers: { "content-type": "application/json" },
    });
  } else if (payload.record.type === NOTIFICATION_TYPES.USER) {
    // For USER notifications, send a push notification to the user specified by user_id.
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .eq("id", payload.record.user_id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { headers: { "content-type": "application/json" } }
      );
    }

    if (!profileData || !profileData.expo_push_token) {
      console.log("No push token for user.");
      return new Response(
        JSON.stringify({ message: "No push token for user." }),
        { headers: { "content-type": "application/json" } }
      );
    }

    const result = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("EXPO_PUBLIC_ACCESS_TOKEN")}`
      },
      body: JSON.stringify({
        to: profileData.expo_push_token,
        title: "Tini Time Club",
        body: payload.record.body,
      }),
    }).then((res) => res.json());

    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  } else {
    return new Response(
      JSON.stringify({ message: "Unhandled notification type." }),
      { headers: { "content-type": "application/json" } }
    );
  }
});
