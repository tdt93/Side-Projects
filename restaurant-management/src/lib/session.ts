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
};

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ?? "dev-restaurant-session-secret-key-32",
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
