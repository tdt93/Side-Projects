import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
  const { id } = await ctx.params;

  const loc = await prisma.location.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!loc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}/${routing.defaultLocale}/menu/${tenant?.slug}/${loc.id}`;
  const png = await QRCode.toDataURL(url, { width: 400, margin: 2 });

  return NextResponse.json({ url, png });
}
