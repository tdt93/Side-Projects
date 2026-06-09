import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
  const { id } = await ctx.params;

  const location = await prisma.location.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tables = await prisma.table.findMany({
    where: { tenantId: session.tenantId, locationId: id },
    orderBy: { number: "asc" },
    select: { id: true, number: true, name: true, seats: true, status: true },
  });
  return NextResponse.json({ tables });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
  const { id } = await ctx.params;

  const body = z.object({
    number: z.number().int().positive().max(9999),
    name: z.string().trim().max(120).optional(),
    seats: z.number().int().positive().max(30).default(4),
  }).parse(await req.json());

  const location = await prisma.location.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const table = await prisma.table.create({
    data: {
      tenantId: session.tenantId,
      locationId: id,
      number: body.number,
      name: body.name || null,
      seats: body.seats,
    },
    select: { id: true, number: true, name: true, seats: true, status: true },
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json(table);
}
