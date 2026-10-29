import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ADMIN_ACTION_EVENTS,
  ADMIN_PAGE_EVENTS,
  usageEnvironment,
} from "@/lib/featureUsageCatalog.mjs";

/** Store a one-way session digest, never credentials, content, URLs or form data. */
export async function recordAdminUsage(
  event: string,
  id = randomUUID()
): Promise<boolean> {
  try {
    if (![...ADMIN_PAGE_EVENTS, ...ADMIN_ACTION_EVENTS].includes(event))
      return false;
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token || !(await verifySessionToken(token))) return false;
    const { error } = await supabaseAdmin()
      .from("admin_usage_events")
      .insert({
        id,
        event_name: event,
        session_hash: createHash("sha256").update(token).digest("hex"),
        app_environment: usageEnvironment(
          process.env.ADMIN_ANALYTICS_ENVIRONMENT ?? process.env.VERCEL_ENV
        ),
      })
      .abortSignal(AbortSignal.timeout(3000));
    return !error || error.code === "23505";
  } catch {
    // Usage delivery must never fail the operator's actual task.
    return false;
  }
}
