"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * The one deliberately public server action: a business owner claiming their
 * place from the public website, with no member account. Validation is
 * enforced again inside submit_web_location_claim; this layer maps failures
 * to form feedback and swallows bot submissions via the honeypot field.
 */
export async function submitPublicLocationClaim(formData: FormData) {
  const locationId = String(formData.get("location_id") ?? "").trim();
  const path = `/p/${encodeURIComponent(locationId)}/claim`;

  // Bots fill every field; the form hides this one from humans. Pretend
  // success so automated submissions learn nothing.
  if (String(formData.get("website") ?? "").trim()) {
    redirect(`${path}?submitted=1`);
  }

  const contactName = String(formData.get("contact_name") ?? "").trim();
  const businessRole = String(formData.get("business_role") ?? "").trim();
  const businessEmail = String(formData.get("business_email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const explanation = String(formData.get("explanation") ?? "").trim();

  if (!locationId || !/^\d+$/.test(locationId)) redirect("/");
  if (!contactName || contactName.length > 120) redirect(`${path}?error=name`);
  if (!businessRole || businessRole.length > 80) redirect(`${path}?error=role`);
  if (
    !businessEmail ||
    businessEmail.length > 320 ||
    businessEmail.indexOf("@") < 1
  )
    redirect(`${path}?error=email`);
  if (phone.length > 40) redirect(`${path}?error=phone`);
  if (!explanation || explanation.length > 1000)
    redirect(`${path}?error=explanation`);

  const { error } = await supabaseAdmin().rpc("submit_web_location_claim", {
    p_location_id: Number(locationId),
    p_contact_name: contactName,
    p_business_role: businessRole,
    p_business_email: businessEmail,
    p_phone: phone || null,
    p_explanation: explanation,
  });
  // A duplicate pending claim also returns success from the RPC, so any
  // error here is a real failure worth a retry message.
  if (error) redirect(`${path}?error=submit`);

  redirect(`${path}?submitted=1`);
}
