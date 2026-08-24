/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_EVENTS = new Set([
  "login",
  "create_account",
  "shared_app",
  "share_review",
  "share_location",
  "new_review",
  "edit_review",
  "like_review",
  "like_comment",
  "view_location",
  "comment_on_review",
  "follow_user",
  "view_profile",
  "change_avatar",
  "report",
  "delete_review",
  "logout",
  "activity_open",
  "activity_notification_open",
  "activity_follow_back",
  "activity_page_load",
  "activity_load_error",
  "visitor_preview_started",
  "membership_gate_opened",
  "membership_gate_dismissed",
  "membership_auth_started",
  "onboarding_completed",
  "auth_unexpected_sign_out",
  "auth_session_missing_at_launch",
  "mention_suggestions_opened",
  "mention_selected",
  "mention_submitted",
]);
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;
const requestWindows = new Map<string, { count: number; startedAt: number }>();

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });

const boundedText = (value: unknown, maxLength: number) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;

const bearerToken = (request: Request) => {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
};

const isRateLimited = (request: Request) => {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestWindows.set(key, { count: 1, startedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
};

const getAdminClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Product analytics is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (isRateLimited(request)) {
    return jsonResponse({ error: "Too many requests" }, 429);
  }

  const token = bearerToken(request);
  if (!token) return jsonResponse({ error: "Missing project credential" }, 401);

  try {
    const body = await request.json();
    const id = boundedText(body?.id, 36);
    const installationId = boundedText(body?.installationId, 36);
    const sessionId = boundedText(body?.sessionId, 36);
    const eventName = boundedText(body?.event, 64);
    if (
      !id ||
      !installationId ||
      !sessionId ||
      !eventName ||
      !UUID_PATTERN.test(id) ||
      !UUID_PATTERN.test(installationId) ||
      !UUID_PATTERN.test(sessionId) ||
      !ALLOWED_EVENTS.has(eventName)
    ) {
      return jsonResponse({ error: "Invalid analytics event" }, 400);
    }

    const admin = getAdminClient();
    const { data: authData } = await admin.auth.getUser(token);
    const requestedPlatform = boundedText(body?.platform, 16);
    const platform = ["ios", "android", "web"].includes(requestedPlatform ?? "")
      ? requestedPlatform!
      : "unknown";
    const { error } = await admin.from("app_analytics_events").insert({
      id,
      installation_id: installationId,
      session_id: sessionId,
      user_id: authData.user?.id ?? null,
      event_name: eventName,
      platform,
      app_version: boundedText(body?.appVersion, 32),
      app_environment: boundedText(body?.appEnvironment, 32),
    });

    if (error && error.code !== "23505") throw error;
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Product analytics event failed", error);
    return jsonResponse({ error: "Unable to record analytics event" }, 500);
  }
});
