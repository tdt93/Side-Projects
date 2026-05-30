import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.menuCategory.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = z.object({ name: z.string().min(1), sortOrder: z.number().int().optional() }).parse(await req.json());

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
