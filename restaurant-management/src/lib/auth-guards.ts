import { NextResponse } from "next/server";
import type { IronSession } from "iron-session";
import { getSession, type SessionData, type StaffRole } from "@/lib/session";

export type AuthSession = IronSession<SessionData> & {
  tenantId: string;
};

export type OwnerSession = AuthSession & {
  staffRole: "OWNER";
};

export type StaffSession = AuthSession & {
  staffRole: StaffRole;
};

export async function requireTenantSession(): Promise<AuthSession | NextResponse> {
  const session = await getSession();
  if (!session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session as AuthSession;
}

export async function requireStaffSession(): Promise<StaffSession | NextResponse> {
  const session = await requireTenantSession();
  if (session instanceof NextResponse) return session;
  if (!session.staffRole) {
    return NextResponse.json({ error: "Staff login required" }, { status: 403 });
  }
  return session as StaffSession;
}

export async function requireOwnerSession(): Promise<OwnerSession | NextResponse> {
  const session = await requireTenantSession();
  if (session instanceof NextResponse) return session;
  if (session.staffRole !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session as OwnerSession;
}

export function isAuthError(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
