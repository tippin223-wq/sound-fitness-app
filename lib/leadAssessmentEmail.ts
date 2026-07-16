/**
 * The results email. Every value that lands in the HTML is escaped here — the
 * questionnaire is public and unauthenticated, so nothing a caller sends may
 * ever reach the markup as raw HTML.
 */

export type LeadAssessmentPayload = {
  email: string;
  fullName?: string;
  phone?: string;
  resultTitle: string;
  resultBody: string;
  serviceLine: string;
  servicePills: string[];
  setup: { label: string; value: string }[];
  answers: Record<string, unknown>;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Keep any single field from blowing out the email. */
const clamp = (value: unknown, max: number) =>
  String(value ?? "").slice(0, max);

export function renderLeadAssessmentEmail(payload: LeadAssessmentPayload) {
  const title = escapeHtml(clamp(payload.resultTitle, 120));
  const body = escapeHtml(clamp(payload.resultBody, 1200));
  const serviceLine = escapeHtml(clamp(payload.serviceLine, 400));
  const greetingName = payload.fullName?.trim()
    ? escapeHtml(clamp(payload.fullName.trim().split(" ")[0], 60))
    : null;

  const pills = payload.servicePills
    .slice(0, 6)
    .map(
      (pill) =>
        `<td style="padding:0 6px 6px 0;"><span style="display:inline-block;background:#0e7490;color:#ecfeff;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:7px 12px;border-radius:6px;">${escapeHtml(
          clamp(pill, 60),
        )}</span></td>`,
    )
    .join("");

  const setupRows = payload.setup
    .slice(0, 6)
    .map(
      (item) =>
        `<tr>
           <td style="padding:6px 14px 6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;white-space:nowrap;">${escapeHtml(
             clamp(item.label, 40),
           )}</td>
           <td style="padding:6px 0;color:#e2e8f0;font-size:14px;font-weight:600;">${escapeHtml(
             clamp(item.value, 120),
           )}</td>
         </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px 12px;background:#020713;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,#0f172a,#020713);border:1px solid rgba(34,211,238,.25);border-radius:14px;">
      <tr><td style="padding:26px 26px 0;">
        <div style="font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#22d3ee;">Sound Fitness</div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-top:4px;">In-home training and assisted stretch</div>
      </td></tr>

      <tr><td style="padding:22px 26px 0;">
        ${greetingName ? `<p style="margin:0 0 12px;color:#e2e8f0;font-size:15px;">Hi ${greetingName},</p>` : ""}
        <div style="font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#34d399;">Your starting focus</div>
        <h1 style="margin:8px 0 0;color:#ffffff;font-size:26px;line-height:1.15;font-weight:800;text-transform:uppercase;">${title}</h1>
        <p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.65;">${body}</p>
      </td></tr>

      <tr><td style="padding:22px 26px 0;">
        <div style="font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#67e8f9;">Recommended</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;"><tr>${pills}</tr></table>
        <p style="margin:12px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">${serviceLine}</p>
      </td></tr>

      <tr><td style="padding:22px 26px 0;">
        <div style="font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#94a3b8;">Your setup</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">${setupRows}</table>
      </td></tr>

      <tr><td style="padding:26px;">
        <a href="https://thesoundfitness.com/free-assessment" style="display:inline-block;background:#22d3ee;color:#020713;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:13px 22px;border-radius:8px;text-decoration:none;">Book your free assessment</a>
        <p style="margin:18px 0 0;color:#475569;font-size:12px;line-height:1.6;">
          You're getting this because you completed the setup at thesoundfitness.com.
          Reply to this email if anything looks off — a real person reads it.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    greetingName ? `Hi ${payload.fullName?.trim().split(" ")[0]},` : "",
    "",
    "YOUR STARTING FOCUS",
    clamp(payload.resultTitle, 120),
    "",
    clamp(payload.resultBody, 1200),
    "",
    "RECOMMENDED",
    payload.servicePills.map((p) => `- ${clamp(p, 60)}`).join("\n"),
    clamp(payload.serviceLine, 400),
    "",
    "YOUR SETUP",
    payload.setup
      .map((s) => `${clamp(s.label, 40)}: ${clamp(s.value, 120)}`)
      .join("\n"),
    "",
    "Book your free assessment: https://thesoundfitness.com/free-assessment",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, subject: `Your starting focus: ${clamp(payload.resultTitle, 80)}`, text };
}
