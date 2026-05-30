import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.tenantId) {
    return NextResponse.json({ accountId: null });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { displayName: true },
  });

  return NextResponse.json({
    accountId: session.accountId,
    tenantId: session.tenantId,
    email: session.email,
    tenantName: tenant?.displayName ?? session.tenantName,
    staffUserId: session.staffUserId,
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId ?? null,
  });
}
