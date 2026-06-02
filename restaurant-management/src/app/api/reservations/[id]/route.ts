import { NextResponse } from "next/server";
import { isAuthError, requireStaffSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireStaffSession();
  if (isAuthError(session)) return session;
  const { id } = await ctx.params;

  const existing = await prisma.tableReservation.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.tableReservation.delete({ where: { id } });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
