import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveLocationScope } from "@/lib/restaurant-data";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; locationId: string }> }) {
  const { slug, locationId } = await ctx.params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const location = await prisma.location.findFirst({
    where: { id: locationId, tenantId: tenant.id, isActive: true },
  });
  if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });

  const { viewAll, locationId: resolvedId } = await resolveLocationScope(tenant.id, {
    activeLocationId: locationId,
  });

  const menuWhere = viewAll || !resolvedId
    ? { tenantId: tenant.id, available: true }
    : {
        tenantId: tenant.id,
        available: true,
        OR: [{ locationId: null }, { locationId: resolvedId }],
      };

  const [settings, menuItems, categories] = await Promise.all([
    prisma.restaurantSettings.findUnique({ where: { tenantId: tenant.id } }),
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
