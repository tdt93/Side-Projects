import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const loc = await prisma.location.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!loc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}/${routing.defaultLocale}/menu/${tenant?.slug}/${loc.id}`;
  const png = await QRCode.toDataURL(url, { width: 400, margin: 2 });

  return NextResponse.json({ url, png });
}
