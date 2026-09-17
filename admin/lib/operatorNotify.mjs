/**
 * Best-effort operator notification for public-website submissions (claims,
 * inquiries). The queue rows in the admin app are the source of truth; this
 * email only makes sure the operator hears about them without watching the
 * queues. Failures are swallowed — a notification must never fail the
 * visitor's submission.
 *
 * Recipient: OPERATOR_NOTIFY_EMAIL, falling back to RESEND_FROM_EMAIL.
 * The body is plain text, so visitor-supplied values cannot inject markup.
 *
 * @param {string} subject
 * @param {string[]} lines
 * @param {{apiKey?: string, from?: string, to?: string, request?: typeof fetch}} [options]
 * @returns {Promise<boolean>} whether Resend accepted the email
 */
export async function notifyOperator(subject, lines, options = {}) {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY?.trim();
  const from = options.from ?? process.env.RESEND_FROM_EMAIL?.trim();
  const to = options.to ?? (process.env.OPERATOR_NOTIFY_EMAIL?.trim() || from);
  const request = options.request ?? fetch;
  if (!apiKey || !from || !to) return false;
  try {
    const response = await request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Tini Time Club <${from}>`,
        to: [to],
        subject,
        text: lines.join("\n"),
      }),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
