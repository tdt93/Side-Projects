import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city")?.trim();

  const list = await prisma.therapistProfile.findMany({
    where: city ? { officeCity: city } : undefined,
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      slug: true,
      displayName: true,
      title: true,
      officeCity: true,
      avatarUrl: true,
      taglineQuote: true,
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json({
    therapists: list.map((t) => ({
      ...t,
      tags: t.tags.map((x) => x.tag.label),
    })),
  });
}
