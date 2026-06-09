import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId");
  const tableId = url.searchParams.get("tableId");

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const location =
    (locationId
      ? await prisma.location.findFirst({
          where: { id: locationId, tenantId: tenant.id, isActive: true },
        })
      : await prisma.location.findFirst({
          where: { tenantId: tenant.id, isActive: true },
          orderBy: { createdAt: "asc" },
        }));
  if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });

  const table = tableId
    ? await prisma.table.findFirst({
        where: { id: tableId, tenantId: tenant.id, locationId: location.id },
        select: { id: true, number: true, name: true },
      })
    : null;

  const settings = await prisma.restaurantSettings.findUnique({ where: { tenantId: tenant.id } });
  const menuMode = settings?.menuMode ?? "mixed";
  const menuWhere =
    menuMode === "per_location"
      ? { tenantId: tenant.id, available: true, locationId: location.id }
      : menuMode === "shared"
        ? { tenantId: tenant.id, available: true, locationId: null }
        : {
            tenantId: tenant.id,
            available: true,
            OR: [{ locationId: null }, { locationId: location.id }],
          };

  const [menuItems, categories] = await Promise.all([
    prisma.menuItem.findMany({
      where: menuWhere,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.menuCategory.findMany({
      where: { tenantId: tenant.id },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return NextResponse.json({
    tenant: {
      displayName: tenant.displayName,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      accentColor: tenant.accentColor,
    },
    location: {
      id: location.id,
      name: location.name,
      address: location.address,
    },
    table: table
      ? { id: table.id, number: table.number, name: table.name ?? undefined }
      : null,
    currency: settings?.currency ?? "PLN",
    taxRateBps: settings?.taxRateBps ?? 800,
    categories: categories.map((c) => c.name),
    menuItems: menuItems.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      priceGrosze: m.priceGrosze,
      description: m.description,
      imageUrl: m.imageUrl,
      imageAspectRatio: m.imageAspectRatio,
    })),
  });
}
