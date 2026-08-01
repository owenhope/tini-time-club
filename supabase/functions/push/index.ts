/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from "npm:@supabase/supabase-js@2.47.16";

interface NotificationRecord {
  id: string;
  user_id: string;
  actor_id: string | null;
  body: string;
  type: number;
  kind: string | null;
  data: Record<string, unknown> | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: NotificationRecord;
  schema: string;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoReceipt {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

const NOTIFICATION_TYPES = {
  FOLLOWERS: 1,
  USER: 2,
} as const;

const EXPO_PUSH_BATCH_SIZE = 100;
const TOKEN_QUERY_BATCH_SIZE = 500;
const RECEIPT_AGE_MS = 15 * 60 * 1000;
const RECEIPT_EXPIRY_MS = 24 * 60 * 60 * 1000;
const EXPO_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient(): ReturnType<typeof createClient> {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured");
  }

  supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  return supabaseClient;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function expoRequest(
  url: string,
  body: unknown,
  attempts = 3
): Promise<unknown> {
  if (!expoAccessToken) {
    throw new Error("EXPO_ACCESS_TOKEN is not configured");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
          Authorization: `Bearer ${expoAccessToken}`,
        },
        body: JSON.stringify(body),
      });

      const responseBody = await response.text();
      if (!response.ok) {
        const error = new Error(
          `Expo push API returned ${response.status}: ${responseBody}`
        );
        if (response.status !== 429 && response.status < 500) throw error;
        lastError = error;
      } else {
        return responseBody ? JSON.parse(responseBody) : {};
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === attempts - 1) break;
    }

    await delay(250 * 2 ** attempt);
  }

  throw lastError ?? new Error("Expo push request failed");
}

async function removeDeadToken(token: string, reason: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("push_tokens")
    .delete()
    .eq("expo_push_token", token);

  if (error) {
    console.error("Failed to remove dead push token:", error);
  } else {
    console.log(`Removed push token after ${reason}`);
  }
}

async function processDueReceipts(): Promise<void> {
  const cutoff = new Date(Date.now() - RECEIPT_AGE_MS).toISOString();
  const { data: pendingTickets, error } = await getSupabaseClient()
    .from("push_tickets")
    .select("ticket_id, expo_push_token, created_at")
    .eq("status", "pending")
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (error) throw error;
  if (!pendingTickets?.length) return;

  const response = (await expoRequest(
    "https://exp.host/--/api/v2/push/getReceipts",
    { ids: pendingTickets.map((ticket) => ticket.ticket_id) }
  )) as { data?: Record<string, ExpoReceipt> };

  const receipts = response.data ?? {};

  for (const ticket of pendingTickets) {
    const receipt = receipts[ticket.ticket_id];
    if (!receipt) {
      if (
        Date.now() - new Date(ticket.created_at).getTime() >
        RECEIPT_EXPIRY_MS
      ) {
        await getSupabaseClient()
          .from("push_tickets")
          .update({
            checked_at: new Date().toISOString(),
            status: "expired",
            error: "Receipt unavailable after 24 hours",
          })
          .eq("ticket_id", ticket.ticket_id);
      }
      continue;
    }

    const providerError = receipt.details?.error ?? receipt.message ?? null;
    const { error: updateError } = await getSupabaseClient()
      .from("push_tickets")
      .update({
        checked_at: new Date().toISOString(),
        status: receipt.status,
        error: providerError,
      })
      .eq("ticket_id", ticket.ticket_id);

    if (updateError)
      console.error("Failed to update push receipt:", updateError);

    if (providerError === "DeviceNotRegistered") {
      await removeDeadToken(ticket.expo_push_token, providerError);
    } else if (providerError) {
      await getSupabaseClient()
        .from("push_tokens")
        .update({ last_error: providerError })
        .eq("expo_push_token", ticket.expo_push_token);
    }
  }
}

async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  const tokens = new Set<string>();

  for (let index = 0; index < userIds.length; index += TOKEN_QUERY_BATCH_SIZE) {
    const userBatch = userIds.slice(index, index + TOKEN_QUERY_BATCH_SIZE);
    const { data, error } = await getSupabaseClient()
      .from("push_tokens")
      .select("expo_push_token")
      .in("user_id", userBatch);

    if (error) throw error;
    for (const row of data ?? []) {
      if (EXPO_TOKEN_PATTERN.test(row.expo_push_token)) {
        tokens.add(row.expo_push_token);
      }
    }
  }

  return [...tokens];
}

async function getRecipientTokens(
  notification: NotificationRecord
): Promise<string[]> {
  if (notification.type === NOTIFICATION_TYPES.USER) {
    return getTokensForUsers([notification.user_id]);
  }

  if (notification.type !== NOTIFICATION_TYPES.FOLLOWERS) return [];

  const { data: followers, error: followersError } = await getSupabaseClient()
    .from("followers")
    .select("follower_id")
    .eq("following_id", notification.user_id);

  if (followersError) throw followersError;

  const followerIds = (followers ?? []).map((row) => row.follower_id);
  if (!followerIds.length) return [];

  const { data: blocks, error: blocksError } = await getSupabaseClient()
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(
      `blocker_id.eq.${notification.user_id},blocked_id.eq.${notification.user_id}`
    );

  if (blocksError) throw blocksError;

  const blockedIds = new Set<string>();
  for (const block of blocks ?? []) {
    blockedIds.add(
      block.blocker_id === notification.user_id
        ? block.blocked_id
        : block.blocker_id
    );
  }

  return getTokensForUsers(followerIds.filter((id) => !blockedIds.has(id)));
}

async function sendExpoPushes(
  notification: NotificationRecord,
  pushTokens: string[]
): Promise<{ sent: number; failed: number; skipped: number }> {
  const { data: existingTickets, error: existingError } =
    await getSupabaseClient()
      .from("push_tickets")
      .select("expo_push_token")
      .eq("notification_id", notification.id);

  if (existingError) throw existingError;

  const alreadySent = new Set(
    (existingTickets ?? []).map((ticket) => ticket.expo_push_token)
  );
  const unsentTokens = pushTokens.filter((token) => !alreadySent.has(token));
  let sent = 0;
  let failed = 0;

  for (
    let index = 0;
    index < unsentTokens.length;
    index += EXPO_PUSH_BATCH_SIZE
  ) {
    const batch = unsentTokens.slice(index, index + EXPO_PUSH_BATCH_SIZE);
    const response = (await expoRequest(
      "https://exp.host/--/api/v2/push/send",
      batch.map((to) => ({
        to,
        title: "Tini Time Club",
        body: notification.body,
        // notificationId lets the app attribute the tap when logging opens.
        data: { ...(notification.data ?? {}), notificationId: notification.id },
        sound: "default",
        channelId: "default",
      }))
    )) as { data?: ExpoTicket[] };

    const tickets = Array.isArray(response.data) ? response.data : [];
    if (tickets.length !== batch.length) {
      throw new Error("Expo returned an unexpected number of push tickets");
    }

    const ticketRows: Array<{
      ticket_id: string;
      notification_id: string;
      expo_push_token: string;
    }> = [];

    for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex += 1) {
      const ticket = tickets[ticketIndex];
      const token = batch[ticketIndex];

      if (ticket.status === "ok" && ticket.id) {
        sent += 1;
        ticketRows.push({
          ticket_id: ticket.id,
          notification_id: notification.id,
          expo_push_token: token,
        });
        continue;
      }

      failed += 1;
      const ticketError = ticket.details?.error ?? ticket.message ?? "Unknown";
      console.error(`Expo rejected push ticket: ${ticketError}`);
      if (ticketError === "DeviceNotRegistered") {
        await removeDeadToken(token, ticketError);
      } else {
        await getSupabaseClient()
          .from("push_tokens")
          .update({ last_error: ticketError })
          .eq("expo_push_token", token);
      }
    }

    if (ticketRows.length) {
      const { error: ticketInsertError } = await getSupabaseClient()
        .from("push_tickets")
        .upsert(ticketRows, {
          onConflict: "notification_id,expo_push_token",
          ignoreDuplicates: true,
        });
      if (ticketInsertError) throw ticketInsertError;
    }

    if (index + EXPO_PUSH_BATCH_SIZE < unsentTokens.length) {
      // Expo limits projects to 600 notifications/second.
      await delay(200);
    }
  }

  return { sent, failed, skipped: alreadySent.size };
}

function isValidPayload(payload: WebhookPayload): boolean {
  return Boolean(
    payload?.type === "INSERT" &&
    payload.schema === "public" &&
    payload.table === "notifications" &&
    payload.record?.id &&
    payload.record?.user_id &&
    typeof payload.record.body === "string" &&
    [NOTIFICATION_TYPES.FOLLOWERS, NOTIFICATION_TYPES.USER].includes(
      payload.record.type as 1 | 2
    )
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!webhookSecret || req.headers.get("x-webhook-secret") !== webhookSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!expoAccessToken) {
    return jsonResponse({ error: "Push service is not configured" }, 500);
  }

  try {
    const payload = (await req.json()) as WebhookPayload;
    if (!isValidPayload(payload)) {
      return jsonResponse(
        { error: "Invalid notification webhook payload" },
        400
      );
    }

    // Receipt failures should not prevent the current event from sending.
    try {
      await processDueReceipts();
    } catch (error) {
      console.error("Push receipt processing failed:", error);
    }

    const tokens = await getRecipientTokens(payload.record);
    if (!tokens.length) {
      return jsonResponse({ message: "No registered recipient devices" });
    }

    const result = await sendExpoPushes(payload.record, tokens);
    console.log("Push delivery queued:", {
      notificationId: payload.record.id,
      recipients: tokens.length,
      ...result,
    });
    return jsonResponse(result);
  } catch (error) {
    console.error("Push webhook failed:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Push delivery failed",
      },
      502
    );
  }
});
