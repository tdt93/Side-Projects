import crypto from "crypto";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type StaffRole = "OWNER" | "KITCHEN" | "CASHIER";

export type SessionData = {
  accountId?: string;
  tenantId?: string;
  email?: string;
  tenantName?: string;
  staffUserId?: string;
  staffRole?: StaffRole;
  /** null = owner viewing all locations; set = scoped to one branch */
  activeLocationId?: string | null;
  /** Platform super-admin (management subdomain) */
  platformAdmin?: boolean;
};

const DEV_FALLBACK = "dev-restaurant-session-secret-key-32";

function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!secret || secret.length < 32) {
    if (isProd) {
      throw new Error("SESSION_SECRET must be set to at least 32 characters in production");
    }
    return DEV_FALLBACK;
  }

  if (isProd && (secret === DEV_FALLBACK || secret.includes("change-me"))) {
    throw new Error("SESSION_SECRET must be a strong random value in production");
  }

  return secret;
}

export const sessionOptions: SessionOptions = {
  password: resolveSessionSecret(),
  cookieName: "resto_hub_session",
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

export function clearStaffSession(session: IronSession<SessionData>) {
  delete session.staffUserId;
  delete session.staffRole;
}

/** Random numeric PIN for new staff accounts (signup). */
export function generateStaffPin(length = 6): string {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, "0");
}
