import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import {
  platformsByUser,
  summarizePlatformMix,
  type PresenceRow,
  type UserPlatform,
} from "@/lib/platformMix.mjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type { UserPlatform } from "@/lib/platformMix.mjs";

const db = supabaseAdmin;

const PRESENCE_COLUMNS =
  "installation_id,audience,user_id,platform,app_version,last_seen_at";
const PAGE_SIZE = 1000;

/** Presence rows seen since `since`, paged past PostgREST's row cap. */
const fetchPresenceSince = async (since: Date): Promise<PresenceRow[]> => {
  const rows: PresenceRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db()
      .from("app_usage_presence")
      .select(PRESENCE_COLUMNS)
      .gte("last_seen_at", since.toISOString())
      .order("installation_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw toAdminDataError(error, "load app platforms");
    rows.push(...((data ?? []) as PresenceRow[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
};

export type PlatformMix = ReturnType<typeof summarizePlatformMix>;

/** Members and anonymous installations per platform, seen within `windowMs`. */
export const fetchPlatformMix = async (
  windowMs: number
): Promise<PlatformMix> => {
  const since = new Date(Date.now() - windowMs);
  return summarizePlatformMix(await fetchPresenceSince(since), since);
};

/** Platforms each of these members has opened the app on. */
export const fetchUserPlatforms = async (
  userIds: string[]
): Promise<Map<string, UserPlatform[]>> => {
  if (userIds.length === 0) return new Map();
  const { data, error } = await db()
    .from("app_usage_presence")
    .select(PRESENCE_COLUMNS)
    .eq("audience", "member")
    .in("user_id", userIds);
  if (error) throw toAdminDataError(error, "load member platforms");
  return platformsByUser((data ?? []) as PresenceRow[]);
};
