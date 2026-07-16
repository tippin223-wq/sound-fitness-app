import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  renderLeadAssessmentEmail,
  type LeadAssessmentPayload,
} from "@/lib/leadAssessmentEmail";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress =
  process.env.LEAD_EMAIL_FROM ?? "Sound Fitness <onboarding@resend.dev>";
// Optional: blind-copy the business so a new lead lands in an inbox too.
const notifyAddress = process.env.LEAD_NOTIFICATION_EMAIL;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const asStringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = asString(body.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 },
    );
  }

  const payload: LeadAssessmentPayload = {
    email,
    fullName: asString(body.fullName) || undefined,
    phone: asString(body.phone) || undefined,
    resultTitle: asString(body.resultTitle) || "Your starting focus",
    resultBody: asString(body.resultBody),
    serviceLine: asString(body.serviceLine),
    servicePills: asStringList(body.servicePills).slice(0, 6),
    setup: Array.isArray(body.setup)
      ? (body.setup as unknown[])
          .slice(0, 6)
          .map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            return {
              label: asString(record.label),
              value: asString(record.value),
            };
          })
          .filter((item) => item.label && item.value)
      : [],
    answers:
      body.answers && typeof body.answers === "object"
        ? (body.answers as Record<string, unknown>)
        : {},
  };

  // 1. Persist first. The lead is the thing we can't afford to lose — if the
  //    mail provider is down, we still want the assessment.
  let leadId: string | null = null;
  let storeError: string | null = null;

  if (supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("lead_assessments")
      .insert({
        email: payload.email,
        full_name: payload.fullName ?? null,
        phone: payload.phone ?? null,
        answers: payload.answers,
        result_title: payload.resultTitle,
        result_focus: payload.serviceLine || null,
        service_pills: payload.servicePills,
      })
      .select("id")
      .single();

    if (error) {
      storeError = error.message;
      console.error("[lead-assessment] store failed:", error.message);
    } else {
      leadId = data?.id ?? null;
    }
  } else {
    storeError = "Supabase service role not configured.";
    console.warn("[lead-assessment] SUPABASE_SERVICE_ROLE_KEY missing.");
  }

  // 2. Then email. A send failure is recorded against the lead rather than
  //    thrown away.
  let emailed = false;
  let emailError: string | null = null;

  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const { html, subject, text } = renderLeadAssessmentEmail(payload);
      const { error } = await resend.emails.send({
        from: fromAddress,
        to: [payload.email],
        ...(notifyAddress ? { bcc: [notifyAddress] } : {}),
        subject,
        html,
        text,
      });

      if (error) {
        emailError = error.message;
      } else {
        emailed = true;
      }
    } catch (error) {
      emailError = error instanceof Error ? error.message : "Unknown send error";
    }
  } else {
    emailError = "RESEND_API_KEY not configured.";
  }

  if (emailError) console.error("[lead-assessment] email failed:", emailError);

  if (leadId && (emailed || emailError)) {
    const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });
    await supabase
      .from("lead_assessments")
      .update({
        emailed_at: emailed ? new Date().toISOString() : null,
        email_error: emailError,
      })
      .eq("id", leadId);
  }

  // The visitor already has their results on screen; don't fail their flow over
  // our plumbing. Report truthfully so the UI can adjust what it claims.
  return NextResponse.json({
    stored: Boolean(leadId),
    emailed,
    ...(storeError ? { storeError } : {}),
    ...(emailError ? { emailError } : {}),
  });
}
