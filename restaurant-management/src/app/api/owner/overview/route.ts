import { NextResponse } from "next/server";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { getOwnerOverview } from "@/lib/owner-overview";

export async function GET() {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;

  const data = await getOwnerOverview(session.tenantId, {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  });

  return NextResponse.json(data);
}
