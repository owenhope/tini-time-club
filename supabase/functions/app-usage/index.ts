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
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
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

const requestKey = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  return forwarded?.trim() || "unknown";
};

const isRateLimited = (request: Request) => {
  const key = requestKey(request);
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestWindows.set(key, { count: 1, startedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
};

const bearerToken = (request: Request) => {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
};

const getAdminClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("App usage analytics is not configured");
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

  try {
    const body = await request.json();
    const installationId = boundedText(body?.installationId, 36);
    const sessionId = boundedText(body?.sessionId, 36);
    if (
      !installationId ||
      !sessionId ||
      !UUID_PATTERN.test(installationId) ||
      !UUID_PATTERN.test(sessionId)
    ) {
      return jsonResponse({ error: "Invalid installation or session" }, 400);
    }

    const admin = getAdminClient();
    const token = bearerToken(request);
    const { data: authData } = token
      ? await admin.auth.getUser(token)
      : { data: { user: null } };
    const userId = authData.user?.id ?? null;
    const audience = userId ? "member" : "visitor";
    const requestedPlatform = boundedText(body?.platform, 16);
    const platform = ["ios", "android", "web"].includes(requestedPlatform ?? "")
      ? requestedPlatform!
      : "unknown";
    const now = new Date().toISOString();
    const usageDate = now.slice(0, 10);
    const shared = {
      installation_id: installationId,
      audience,
      user_id: userId,
      platform,
      app_version: boundedText(body?.appVersion, 32),
      app_environment: boundedText(body?.appEnvironment, 32),
      last_seen_at: now,
    };

    const [presence, daily] = await Promise.all([
      admin
        .from("app_usage_presence")
        .upsert(
          { ...shared, session_id: sessionId },
          { onConflict: "installation_id" }
        ),
      admin
        .from("app_usage_daily")
        .upsert(
          { ...shared, usage_date: usageDate },
          { onConflict: "usage_date,installation_id,audience" }
        ),
    ]);

    if (presence.error) throw presence.error;
    if (daily.error) throw daily.error;
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("App usage heartbeat failed", error);
    return jsonResponse({ error: "Unable to record app usage" }, 500);
  }
});
