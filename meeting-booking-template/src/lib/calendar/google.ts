import { google } from "googleapis";
import { decryptSecret } from "@/lib/token-crypto";

function redirectUri() {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/google/calendar/callback`;
}

export function createOAuthClient() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");
  }
  return new google.auth.OAuth2(id, secret, redirectUri());
}

export function getGoogleAuthUrl(state: string) {
  const oauth2 = createOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2 = createOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("No refresh token — revoke app access and reconnect with prompt=consent");
  }
  return tokens.refresh_token;
}

async function calendarClient(refreshTokenEnc: string) {
  const oauth2 = createOAuthClient();
  oauth2.setCredentials({
    refresh_token: decryptSecret(refreshTokenEnc),
  });
  return google.calendar({ version: "v3", auth: oauth2 });
}

export async function fetchBusyIntervals(
  refreshTokenEnc: string,
  calendarId: string | null | undefined,
  timeMin: Date,
  timeMax: Date,
): Promise<{ start: Date; end: Date }[]> {
  if (!process.env.GOOGLE_CLIENT_ID) return [];
  try {
    const calendar = await calendarClient(refreshTokenEnc);
    const calId = calendarId?.trim() || "primary";
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calId }],
      },
    });
    const busy = res.data.calendars?.[calId]?.busy ?? [];
    return busy
      .filter((b): b is { start: string; end: string } => !!b.start && !!b.end)
      .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  } catch (e) {
    console.error("[google] freebusy failed", e);
    return [];
  }
}

export async function insertBookingEvent(opts: {
  refreshTokenEnc: string;
  calendarId: string | null | undefined;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  attendeeEmail?: string;
}): Promise<string | null> {
  try {
    const calendar = await calendarClient(opts.refreshTokenEnc);
    const calId = opts.calendarId?.trim() || "primary";
    const event = await calendar.events.insert({
      calendarId: calId,
      requestBody: {
        summary: opts.summary,
        description: opts.description,
        start: { dateTime: opts.start.toISOString() },
        end: { dateTime: opts.end.toISOString() },
        attendees: opts.attendeeEmail
          ? [{ email: opts.attendeeEmail }]
          : undefined,
      },
    });
    return event.data.id ?? null;
  } catch (e) {
    console.error("[google] insert event failed", e);
    return null;
  }
}

export async function deleteBookingEvent(
  refreshTokenEnc: string,
  calendarId: string | null | undefined,
  eventId: string,
) {
  try {
    const calendar = await calendarClient(refreshTokenEnc);
    const calId = calendarId?.trim() || "primary";
    await calendar.events.delete({ calendarId: calId, eventId });
  } catch (e) {
    console.error("[google] delete event failed", e);
  }
}
