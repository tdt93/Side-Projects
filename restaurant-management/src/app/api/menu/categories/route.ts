import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";

export async function GET() {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;

  const categories = await prisma.menuCategory.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;

  const body = z.object({ name: z.string().min(1).max(80), sortOrder: z.number().int().optional() }).parse(await req.json());

  const maxOrder = await prisma.menuCategory.aggregate({
    where: { tenantId: session.tenantId },
    _max: { sortOrder: true },
  });

  const category = await prisma.menuCategory.create({
    data: {
      tenantId: session.tenantId,
      name: body.name,
      sortOrder: body.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json(category);
}
