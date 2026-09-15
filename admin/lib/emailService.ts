import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { deliverMemberEmail } from "@/lib/emailDelivery.mjs";
import type {
  EmailAudienceCounts,
  EmailCampaign,
  EmailCampaignDetail,
  EmailMember,
  EmailRecipient,
  EmailSegment,
} from "@/lib/emailTypes";

export function emailConfiguration() {
  const sender = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
  const publicUrl = (process.env.EMAIL_PUBLIC_URL ?? "").replace(/\/$/, "");
  let validUrl = false;
  try {
    const url = new URL(publicUrl);
    validUrl =
      url.protocol === "https:" &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password;
  } catch {
    /* Missing configuration is displayed in the composer. */
  }
  const setupIssues: string[] = [];
  if (!process.env.RESEND_API_KEY?.trim()) {
    setupIssues.push("Add the Resend API key.");
  }
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(sender)) {
    setupIssues.push("Set a valid sender email address.");
  }
  if (!validUrl) {
    setupIssues.push(
      "Set the public unsubscribe website address (EMAIL_PUBLIC_URL) after deploying the unsubscribe pages to this environment."
    );
  }
  return {
    sender,
    publicUrl,
    setupIssues,
    ready: setupIssues.length === 0,
  };
}

export async function emailAudience(
  search = ""
): Promise<{ total: number; members: EmailMember[] }> {
  const { data, error } = await supabaseAdmin().rpc("admin_email_audience", {
    p_search: search.trim().slice(0, 100),
  });
  if (error)
    throw new Error(
      "Email audience is unavailable. Check that the email migration is applied to this backend."
    );
  return data;
}

export async function emailCampaigns(): Promise<EmailCampaign[]> {
  const { data, error } = await supabaseAdmin()
    .from("admin_email_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error("Email history is unavailable.");
  return data ?? [];
}

export async function allEmailMembers(
  segment: EmailSegment = "all"
): Promise<EmailMember[]> {
  const { data, error } = await supabaseAdmin().rpc("admin_email_all_members", {
    p_segment: segment,
  });
  if (error)
    throw new Error("Unable to load eligible members. Please try again.");
  return data ?? [];
}

export async function emailAudienceCounts(): Promise<EmailAudienceCounts> {
  const { data, error } = await supabaseAdmin().rpc(
    "admin_email_audience_counts"
  );
  if (error)
    throw new Error(
      "Audience counts are unavailable. Check that the email segments migration is applied to this backend."
    );
  return data;
}

export async function emailCampaign(id: string): Promise<EmailCampaignDetail> {
  const { data, error } = await supabaseAdmin().rpc(
    "get_admin_email_campaign",
    { p_id: id }
  );
  if (error || !data) throw new Error("Email draft could not be loaded.");
  return data;
}

export async function processEmailCampaign(id: string) {
  const db = supabaseAdmin();
  const detail = await emailCampaign(id);
  const { data, error } = await db.rpc("claim_admin_email_recipients", {
    p_campaign_id: id,
  });
  if (error)
    throw new Error(
      "Unable to claim recipients. No new emails were sent by this request."
    );
  const recipients = (data ?? []) as EmailRecipient[];
  for (const recipient of recipients) {
    const { data: eligible, error: eligibilityError } = await db.rpc(
      "can_send_admin_email_recipient",
      { p_id: recipient.id }
    );
    if (eligibilityError)
      throw new Error(
        "Unable to check recipient preferences. Resume this campaign later."
      );
    if (!eligible) {
      const { error: skipError } = await db
        .from("admin_email_recipients")
        .update({ status: "skipped", error_code: "no_longer_eligible" })
        .eq("id", recipient.id);
      if (skipError)
        throw new Error(
          "Unable to save recipient preferences. Resume this campaign later."
        );
      continue;
    }
    // Resend's default API rate limit is two requests/second; keep a margin.
    await new Promise((resolve) => setTimeout(resolve, 650));
    const result = await deliverMemberEmail(
      detail.campaign,
      recipient,
      process.env.RESEND_API_KEY ?? ""
    );
    if (!result.ok) {
      // Ambiguous/transient failures retain their lease and original key.
      if (result.permanent) {
        const { error: saveError } = await db
          .from("admin_email_recipients")
          .update({ status: "failed", error_code: result.code })
          .eq("id", recipient.id);
        if (saveError)
          throw new Error(
            "Unable to save delivery status. Resume this campaign later."
          );
      }
      throw new Error(result.message);
    }
    const { error: saveError } = await db
      .from("admin_email_recipients")
      .update({
        status: "sent",
        provider_id: result.providerId,
        error_code: null,
      })
      .eq("id", recipient.id);
    if (saveError)
      throw new Error(
        "Email accepted, but its receipt could not be saved. Resume this campaign later."
      );
  }
  return { detail: await emailCampaign(id), processed: recipients.length };
}

export async function optOutEmail(token: string) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("admin_email_recipients")
    .select("email")
    .eq("id", token)
    .maybeSingle();
  if (error || !data) throw new Error("This unsubscribe link is unavailable.");
  const { error: saveError } = await db
    .from("admin_email_optouts")
    .upsert(
      { email: data.email },
      { onConflict: "email", ignoreDuplicates: true }
    );
  if (saveError)
    throw new Error("Unable to save your preference. Please try again.");
}
