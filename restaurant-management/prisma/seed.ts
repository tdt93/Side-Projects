import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { seedTenantDefaults, seedYearSampleOrders } from "../src/lib/seed-tenant";

async function backfillYearOrdersForTenant(tenantId: string) {
  const location = await prisma.location.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!location) return 0;

  const menuItems = await prisma.menuItem.findMany({
    where: {
      tenantId,
      OR: [{ locationId: null }, { locationId: location.id }],
    },
    orderBy: { sortOrder: "asc" },
  });
  if (menuItems.length === 0) return 0;

  return seedYearSampleOrders(
    tenantId,
    location.id,
    menuItems.map((m) => ({ id: m.id, name: m.name, priceGrosze: m.priceGrosze, category: m.category })),
    20,
  );
}

async function main() {
  const email = "owner@demo.pl";
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    const added = await backfillYearOrdersForTenant(existing.tenantId);
    if (added > 0) {
      console.log(`Added ${added} year sample orders to existing demo tenant`);
    } else {
      console.log("Demo tenant already seeded:", email, "(year sample orders present)");
    }
    return;
  }

  const passwordHash = await bcrypt.hash("admin", 10);
  const kitchenPinHash = await bcrypt.hash("1234", 10);
  const cashierPinHash = await bcrypt.hash("5678", 10);

  const tenant = await prisma.tenant.create({
    data: {
      slug: "la-bella-demo",
      displayName: "La Bella Cucina Demo",
      settings: { create: { currency: "PLN", taxRateBps: 800 } },
      users: {
        create: [
          { email, name: "Demo Owner", role: "OWNER", passwordHash },
          { email: "kitchen@demo.local", name: "Kitchen", role: "KITCHEN", passwordHash: await bcrypt.hash("x", 10), pinHash: kitchenPinHash },
          { email: "cashier@demo.local", name: "Cashier", role: "CASHIER", passwordHash: await bcrypt.hash("x", 10), pinHash: cashierPinHash },
        ],
      },
    },
  });

  await seedTenantDefaults(tenant.id);
  console.log("Seeded demo restaurant");
  console.log("  Login: owner@demo.pl / admin");
  console.log("  Kitchen PIN: 1234 | Cashier PIN: 5678 | Owner password: admin");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
