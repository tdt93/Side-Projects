import { Resend } from "resend";
import nodemailer from "nodemailer";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const fromDefault = () =>
  process.env.EMAIL_FROM ?? "Booking <onboarding@resend.dev>";

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim(),
  );
}

async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.trim();
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: fromDefault(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

/**
 * Sends booking confirmation e-mail.
 * Priority: SMTP (e.g. Gmail) if SMTP_USER + SMTP_PASS are set, otherwise Resend.
 */
export async function sendBookingConfirmation(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (smtpConfigured()) {
    try {
      await sendViaSmtp(opts);
      return { skipped: false as const, via: "smtp" as const };
    } catch (e) {
      console.error("[email] SMTP send failed", e);
      throw e;
    }
  }

  const resend = getResend();
  if (!resend) {
    console.warn(
      "[email] No SMTP (SMTP_USER/SMTP_PASS) or RESEND_API_KEY; skipping send to",
      opts.to,
    );
    return { skipped: true as const };
  }
  await resend.emails.send({
    from: fromDefault(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return { skipped: false as const, via: "resend" as const };
}

export function bookingEmailHtml(params: {
  guestName: string;
  therapistName: string;
  startLocal: string;
  endLocal: string;
  city?: string | null;
  address?: string | null;
  payNote: string;
}) {
  const where = [params.city, params.address].filter(Boolean).join(" — ");
  return `
  <p>Witaj ${escapeHtml(params.guestName)},</p>
  <p>Rezerwacja potwierdzona u <strong>${escapeHtml(params.therapistName)}</strong>.</p>
  <p><strong>Termin:</strong> ${escapeHtml(params.startLocal)} – ${escapeHtml(params.endLocal)}</p>
  ${where ? `<p><strong>Lokalizacja:</strong> ${escapeHtml(where)}</p>` : ""}
  <p>${params.payNote}</p>
  <p>Pozdrawiamy,<br/>Zespół</p>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
