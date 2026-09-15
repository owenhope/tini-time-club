export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @param {string} value */
export function escapeEmailHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character
  );
}

/** 'active' members opened the app or reviewed in the last 90 days;
 * 'inactive' members did neither. The segments partition 'all',
 * mirroring admin_email_segment_matches. */
export const EMAIL_AUDIENCES = ["selected", "all", "active", "inactive"];

/** @param {{subject: string, body: string, audience: string, ids: string[]}} input */
export function validateEmailDraft(input) {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || subject.length > 200 || /[\r\n]/.test(subject)) {
    throw new Error("Enter a subject of 1–200 characters on one line.");
  }
  if (!body || body.length > 20000)
    throw new Error("Enter a message of 1–20,000 characters.");
  if (!EMAIL_AUDIENCES.includes(input.audience))
    throw new Error("Choose an audience.");
  const ids = [...new Set(input.ids)];
  if (ids.length > 500 || ids.some((id) => !UUID.test(id)))
    throw new Error("Invalid member selection.");
  if (input.audience === "selected" && !ids.length)
    throw new Error("Select at least one member.");
  return { subject, body, audience: input.audience, ids };
}

export const APP_STORE_URL =
  "https://apps.apple.com/app/tini-time-club/id6741620393";

/** The review-share card's palette, so member emails wear the same brand. */
export const EMAIL_BRAND = {
  ink: "#10241B",
  paper: "#FAF9F6",
  purple: "#B6A3E2",
  chartreuse: "#F2FF71",
  muted: "#78716c",
};

const EMAIL_FONTS = "Figtree,'Avenir Next','Helvetica Neue',Arial,sans-serif";

/** @param {{subject: string, body: string, sender: string, public_url: string}} campaign
 * @param {{id: string, email: string}} recipient */
export function emailPayload(campaign, recipient) {
  const unsubscribe = `${campaign.public_url}/email/unsubscribe?token=${encodeURIComponent(recipient.id)}`;
  return {
    from: `Tini Time Club <${campaign.sender}>`,
    to: [recipient.email],
    subject: campaign.subject,
    text: `${campaign.body}\n\nGet the app: ${APP_STORE_URL}\n\nTini Time Club\nUnsubscribe from member emails: ${unsubscribe}`,
    html: [
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${EMAIL_BRAND.paper};padding:24px 12px"><tr><td align="center">`,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-radius:16px;overflow:hidden;background-color:#ffffff;border:1px solid #e7e5e4">`,
      // Header band: the share card's ink ground with the paper wordmark.
      `<tr><td style="background-color:${EMAIL_BRAND.ink};padding:20px 28px;font-family:${EMAIL_FONTS};font-size:18px;font-weight:bold;color:${EMAIL_BRAND.paper}">tini time club.</td></tr>`,
      // Message body.
      `<tr><td style="padding:28px;font-family:${EMAIL_FONTS};color:#1c1917">`,
      `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${EMAIL_BRAND.ink}">${escapeEmailHtml(campaign.subject)}</h1>`,
      `<div style="white-space:pre-wrap;font-size:15px;line-height:1.7">${escapeEmailHtml(campaign.body)}</div>`,
      // App download call to action: the chartreuse chip from the share card.
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px"><tr>`,
      `<td style="border-radius:999px;background-color:${EMAIL_BRAND.chartreuse}"><a href="${APP_STORE_URL}" style="display:inline-block;padding:12px 24px;font-family:${EMAIL_FONTS};font-size:14px;font-weight:bold;color:${EMAIL_BRAND.ink};text-decoration:none">Download on the App Store</a></td>`,
      `</tr></table></td></tr>`,
      // Footer.
      `<tr><td style="padding:20px 28px;border-top:1px solid #e7e5e4;font-family:${EMAIL_FONTS};font-size:12px;line-height:1.6;color:${EMAIL_BRAND.muted}">`,
      `Tini Time Club · <a href="${APP_STORE_URL}" style="color:${EMAIL_BRAND.muted}">Get the app</a> · <a href="${escapeEmailHtml(unsubscribe)}" style="color:${EMAIL_BRAND.muted}">Unsubscribe from member emails</a>`,
      `</td></tr></table></td></tr></table>`,
    ].join(""),
    headers: {
      "List-Unsubscribe": `<${campaign.public_url}/api/email/unsubscribe?token=${encodeURIComponent(recipient.id)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/** No provider response bodies are exposed: they can contain recipient PII.
 * @param {number} status */
export function resendFailure(status) {
  if (status === 429)
    return "Resend rate or account quota reached. Resume after the limit resets.";
  if (status === 401 || status === 403)
    return "Check the Resend API key permissions and verified sender domain.";
  if (status === 409)
    return "Resend could not resolve this attempt. Resume later using the same campaign.";
  if (status >= 500)
    return "Resend is temporarily unavailable. Resume this campaign later.";
  return "Resend rejected this email. Check the delivery record in Resend.";
}
