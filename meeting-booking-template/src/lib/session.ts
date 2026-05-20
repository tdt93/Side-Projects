import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: string;
  email?: string;
  role?: "SUPER_ADMIN" | "THERAPIST";
  therapistProfileId?: string;
  /** CSRF for Google Calendar OAuth redirect */
  calendarOauthNonce?: string;
  /** Profile receiving Calendar tokens (super-admin may link for selected therapist) */
  calendarOauthProfileId?: string;
};

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "0123456789abcdef0123456789abcdef",
  cookieName: "meeting_booking_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
