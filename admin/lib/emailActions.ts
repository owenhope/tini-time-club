"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UUID, validateEmailDraft } from "@/lib/emailModel.mjs";
import {
  emailAudience,
  allEmailMembers,
  emailCampaign,
  emailConfiguration,
  processEmailCampaign,
} from "@/lib/emailService";

async function requireEmailAdmin() {
  if (!(await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)))
    throw new Error("Sign in to the admin again.");
}

export async function searchEmailMembers(query: string) {
  await requireEmailAdmin();
  if (typeof query !== "string") throw new Error("Invalid search.");
  return emailAudience(query);
}

export async function listAllEmailMembers(segment: string = "all") {
  await requireEmailAdmin();
  if (!["all", "active", "inactive"].includes(segment))
    throw new Error("Invalid audience.");
  return allEmailMembers(segment as "all" | "active" | "inactive");
}

export async function prepareEmailDraft(input: {
  id: string;
  subject: string;
  body: string;
  audience: string;
  ids: string[];
  excludedIds?: string[];
}) {
  await requireEmailAdmin();
  try {
    if (
      !input ||
      typeof input.id !== "string" ||
      !UUID.test(input.id) ||
      typeof input.subject !== "string" ||
      typeof input.body !== "string" ||
      !Array.isArray(input.ids)
    )
      throw new Error("Invalid draft.");
    const draft = validateEmailDraft(input);
    const excludedIds = input.excludedIds ?? [];
    if (
      !Array.isArray(excludedIds) ||
      excludedIds.some((id) => typeof id !== "string" || !UUID.test(id))
    ) {
      throw new Error("Invalid recipient exclusions.");
    }
    const config = emailConfiguration();
    if (!config.sender) throw new Error("Configure the sender address first.");
    const { error } = await supabaseAdmin().rpc(
      "create_admin_email_campaign_excluding",
      {
        p_id: input.id,
        p_subject: draft.subject,
        p_body: draft.body,
        p_sender: config.sender,
        p_public_url: config.publicUrl,
        p_audience: draft.audience,
        p_ids: draft.ids,
        p_excluded_ids:
          draft.audience === "selected" ? [] : [...new Set(excludedIds)],
      }
    );
    if (error)
      throw new Error(
        "Unable to save the draft. Check the email migration and select at least one eligible member."
      );
    revalidatePath("/admin/emails");
    return { detail: await emailCampaign(input.id) };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to prepare this email.",
    };
  }
}

export async function sendEmailChunk(id: string) {
  await requireEmailAdmin();
  try {
    if (typeof id !== "string" || !UUID.test(id))
      throw new Error("Invalid campaign.");
    const config = emailConfiguration();
    if (!config.ready)
      throw new Error(
        "Configure Resend and the public unsubscribe URL before sending."
      );
    const draft = await emailCampaign(id);
    if (
      draft.campaign.public_url !== config.publicUrl ||
      draft.campaign.sender !== config.sender
    )
      throw new Error(
        "Sender settings changed. Create a new draft before sending."
      );
    const { error } = await supabaseAdmin()
      .from("admin_email_campaigns")
      .update({ started_at: new Date().toISOString() })
      .eq("id", id)
      .is("started_at", null);
    if (error) throw new Error("Unable to start this campaign.");
    const result = await processEmailCampaign(id);
    revalidatePath("/admin/emails");
    return result;
  } catch (error) {
    return {
      detail:
        typeof id === "string" && UUID.test(id)
          ? await emailCampaign(id).catch(() => undefined)
          : undefined,
      error:
        error instanceof Error
          ? error.message
          : "Unable to send. Resume this campaign later.",
    };
  }
}
