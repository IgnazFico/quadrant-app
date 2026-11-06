/**
 * Transactional mail through Resend.
 *
 * Configuration (all environment variables, none has a default):
 *   RESEND_API_KEY  the Resend API key
 *   EMAIL_FROM      the sender, e.g. `Quadrant <no-reply@your-verified-domain>`
 *   RESEND_API_URL  optional; points the app at a local stand-in for Resend
 *                   for tests. It is IGNORED on any Vercel deployment
 *                   (the VERCEL variable is set on production and preview
 *                   alike), so it cannot redirect real mail there.
 *
 * With RESEND_API_KEY or EMAIL_FROM missing, nothing is sent and the result is
 * { ok: false, reason: "not_configured" }. Callers must treat that as a
 * failure (fail closed). No code is ever written to a log or a response here.
 */
const DEFAULT_RESEND_URL = "https://api.resend.com/emails";

function resendUrl(): string {
  if (process.env.RESEND_API_URL && !process.env.VERCEL) {
    return process.env.RESEND_API_URL;
  }
  return DEFAULT_RESEND_URL;
}

export type MailResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "rejected" | "network" };

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendMail(msg: {
  to: string;
  subject: string;
  text: string;
}): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, reason: "not_configured" };

  try {
    const res = await fetch(resendUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      // Status only: the response body can echo the recipient or the sender.
      console.error(`Mail provider rejected a message (HTTP ${res.status}).`);
      return { ok: false, reason: "rejected" };
    }
    return { ok: true };
  } catch {
    console.error("Mail provider could not be reached.");
    return { ok: false, reason: "network" };
  }
}
