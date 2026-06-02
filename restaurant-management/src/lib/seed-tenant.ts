import { prisma } from "@/lib/db";
import { serializeOpeningHours, DEFAULT_OPENING_HOURS } from "@/lib/opening-hours";

const MENU = [
  { name: "Bruschetta al Pomodoro", category: "Starters", priceGrosze: 850, description: "Toasted bread with tomato, basil, garlic" },
  { name: "Soup of the Day", category: "Starters", priceGrosze: 700, description: "Chef's daily soup selection" },
  { name: "Caesar Salad", category: "Starters", priceGrosze: 1100, description: "Romaine, parmesan, croutons" },
  { name: "Grilled Salmon", category: "Mains", priceGrosze: 2800, description: "Atlantic salmon, lemon butter" },
  { name: "Beef Tenderloin", category: "Mains", priceGrosze: 4200, description: "8oz prime cut, truffle jus" },
  { name: "Chicken Parmesan", category: "Mains", priceGrosze: 2400, description: "Breaded chicken, marinara" },
  { name: "Margherita", category: "Pizza", priceGrosze: 1600, description: "San Marzano tomato, mozzarella" },
  { name: "Spaghetti Carbonara", category: "Pasta", priceGrosze: 1800, description: "Guanciale, egg, pecorino" },
  { name: "Tiramisu", category: "Desserts", priceGrosze: 900, description: "Classic mascarpone dessert" },
  { name: "Espresso", category: "Beverages", priceGrosze: 450, description: "Double shot" },
  { name: "Business Lunch", category: "Combos", priceGrosze: 3200, description: "Soup + main + beverage", isCombo: true },
];

const KRAKOW_ONLY = [
  { name: "Pierogi Ruskie", category: "Mains", priceGrosze: 2200, description: "Traditional Polish dumplings" },
  { name: "Żurek", category: "Starters", priceGrosze: 950, description: "Sour rye soup with egg" },
];

const CATEGORIES = ["Starters", "Mains", "Pizza", "Pasta", "Desserts", "Beverages", "Combos"];

const TAX_RATE_BPS = 800;

type MenuRow = { id: string; name: string; priceGrosze: number; category: string };

const YEAR_SAMPLE_MARKER = "__year_sample_v1__";

/** Twenty paid orders spread across the last 365 days (idempotent per tenant). */
export async function seedYearSampleOrders(
  tenantId: string,
  locationId: string,
  menuItems: MenuRow[],
  count = 20,
): Promise<number> {
  const existing = await prisma.order.findFirst({
    where: { tenantId, customerName: YEAR_SAMPLE_MARKER },
  });
  if (existing) return 0;

  const now = new Date();
  const methods = ["card", "cash", "online"] as const;
  const sources = ["DINE_IN", "ONLINE", "QR_MENU"] as const;
  const pick = (i: number) => menuItems[i % menuItems.length]!;

  for (let i = 0; i < count; i++) {
    const dayOffset = Math.min(364, Math.floor((365 * (i + 1)) / (count + 1)) + (i % 11));
    const placedAt = new Date(now);
    placedAt.setDate(placedAt.getDate() - dayOffset);
    placedAt.setHours(11 + (i % 9), (i * 17) % 60, 0, 0);

    const lineCount = 1 + (i % 3);
    const lines: { menuItemId: string; name: string; quantity: number; priceGrosze: number }[] = [];
    let subtotal = 0;
    for (let l = 0; l < lineCount; l++) {
      const item = pick(i + l * 4);
      const qty = 1 + ((i + l) % 2);
      lines.push({ menuItemId: item.id, name: item.name, quantity: qty, priceGrosze: item.priceGrosze });
      subtotal += item.priceGrosze * qty;
    }

    const tax = Math.round((subtotal * TAX_RATE_BPS) / 10000);
    const tip = i % 4 === 0 ? Math.round(subtotal * 0.1) : 0;
    const source = sources[i % sources.length]!;

    await prisma.order.create({
      data: {
        tenantId,
        locationId,
        tableNumber: source === "DINE_IN" ? (i % 12) + 1 : null,
        status: i % 6 === 0 ? "SERVED" : "PAID",
        source,
        placedAt,
        customerName: i === 0 ? YEAR_SAMPLE_MARKER : i % 3 === 0 ? `Guest ${i + 1}` : undefined,
        items: { create: lines },
        payment: {
          create: {
            method: methods[i % methods.length]!,
            tipGrosze: tip,
            totalGrosze: subtotal + tax + tip,
            paidAt: placedAt,
          },
        },
      },
    });
  }

  return count;
}

async function seedHistoricalOrders(tenantId: string, locationId: string, menuItems: MenuRow[]) {
  const pick = (i: number) => menuItems[i % menuItems.length]!;
  const now = new Date();

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const ordersToday = 2 + (dayOffset % 3);
    for (let o = 0; o < ordersToday; o++) {
      const placedAt = new Date(now);
      placedAt.setDate(placedAt.getDate() - dayOffset);
      placedAt.setHours(11 + o * 2 + (dayOffset % 3), 15 + o * 7, 0, 0);
      const item = pick(dayOffset + o);
      const qty = 1 + (o % 2);
      const subtotal = item.priceGrosze * qty;
      const tax = Math.round((subtotal * TAX_RATE_BPS) / 10000);
      await prisma.order.create({
        data: {
          tenantId,
          locationId,
          tableNumber: (o % 10) + 1,
          status: "PAID",
          source: "DINE_IN",
          placedAt,
          items: {
            create: [{ menuItemId: item.id, name: item.name, quantity: qty, priceGrosze: item.priceGrosze }],
          },
          payment: {
            create: { method: o % 2 === 0 ? "card" : "cash", tipGrosze: 0, totalGrosze: subtotal + tax, paidAt: placedAt },
          },
        },
      });
    }
  }

  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    for (let o = 0; o < 5; o++) {
      const placedAt = new Date(now.getFullYear(), now.getMonth() - monthOffset, 3 + o * 5, 12 + o, 30, 0);
      const item = pick(monthOffset + o + 3);
      const qty = 1 + (o % 3);
      const subtotal = item.priceGrosze * qty;
      const tax = Math.round((subtotal * TAX_RATE_BPS) / 10000);
      await prisma.order.create({
        data: {
          tenantId,
          locationId,
          tableNumber: (o % 8) + 1,
          status: "PAID",
          source: "DINE_IN",
          placedAt,
          items: {
            create: [{ menuItemId: item.id, name: item.name, quantity: qty, priceGrosze: item.priceGrosze }],
          },
          payment: {
            create: { method: "card", tipGrosze: 200, totalGrosze: subtotal + tax + 200, paidAt: placedAt },
          },
        },
      });
    }
  }

  for (let yearOffset = 0; yearOffset < 5; yearOffset++) {
    for (let o = 0; o < 12; o++) {
      const placedAt = new Date(now.getFullYear() - yearOffset, o % 12, 10 + (o % 18), 13, 0, 0);
      const item = pick(yearOffset + o);
      const qty = 2;
      const subtotal = item.priceGrosze * qty;
      const tax = Math.round((subtotal * TAX_RATE_BPS) / 10000);
      await prisma.order.create({
        data: {
          tenantId,
          locationId,
          status: "PAID",
          source: o % 3 === 0 ? "ONLINE" : "DINE_IN",
          placedAt,
          items: {
            create: [{ menuItemId: item.id, name: item.name, quantity: qty, priceGrosze: item.priceGrosze }],
          },
          payment: {
            create: { method: "online", tipGrosze: 0, totalGrosze: subtotal + tax, paidAt: placedAt },
          },
        },
      });
    }
  }
}

export async function seedTenantDefaults(tenantId: string) {
  await Promise.all(
    CATEGORIES.map((name, idx) =>
      prisma.menuCategory.create({
        data: { tenantId, name, sortOrder: idx },
      }),
    ),
  );

  const mainLoc = await prisma.location.create({
    data: {
      tenantId,
      name: "Warsaw — Centrum",
      address: "Krakowskie Przedmieście 42, 00-325 Warsaw, Poland",
      phone: "+48 22 000 0000",
      latitude: 52.2394,
      longitude: 21.0122,
      openingHours: serializeOpeningHours(DEFAULT_OPENING_HOURS),
    },
  });

  const krakowLoc = await prisma.location.create({
    data: {
      tenantId,
      name: "Kraków — Old Town",
      address: "Rynek Główny 1, 31-042 Kraków, Poland",
      phone: "+48 12 000 0000",
      latitude: 50.0619,
      longitude: 19.9368,
      openingHours: serializeOpeningHours({
        ...DEFAULT_OPENING_HOURS,
        fri: "09:00-24:00",
        sat: "10:00-24:00",
      }),
    },
  });

  const menuItems = await Promise.all([
    ...MENU.map((item, idx) =>
      prisma.menuItem.create({
        data: {
          tenantId,
          locationId: null,
          name: item.name,
          category: item.category,
          priceGrosze: item.priceGrosze,
          description: item.description,
          isCombo: item.isCombo ?? false,
          sortOrder: idx,
        },
      }),
    ),
    ...KRAKOW_ONLY.map((item, idx) =>
      prisma.menuItem.create({
        data: {
          tenantId,
          locationId: krakowLoc.id,
          name: item.name,
          category: item.category,
          priceGrosze: item.priceGrosze,
          description: item.description,
          sortOrder: 100 + idx,
        },
      }),
    ),
  ]);

  const mainTables = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const number = i + 1;
      const seats = [2, 4, 6, 8][i % 4];
      return prisma.table.create({
        data: {
          tenantId,
          locationId: mainLoc.id,
          number,
          seats,
          status: [1, 2, 5, 9].includes(number) ? "OCCUPIED" : number % 4 === 0 ? "RESERVED" : "AVAILABLE",
        },
      });
    }),
  );

  await Promise.all(
    Array.from({ length: 8 }, (_, i) => {
      const number = i + 1;
      return prisma.table.create({
        data: {
          tenantId,
          locationId: krakowLoc.id,
          number,
          seats: [2, 4, 6][i % 3],
          status: "AVAILABLE",
        },
      });
    }),
  );

  const findMenu = (name: string) => menuItems.find((m) => m.name === name)!;

  const order1 = await prisma.order.create({
    data: {
      tenantId,
      locationId: mainLoc.id,
      tableNumber: 1,
      status: "COOKING",
      source: "DINE_IN",
      placedAt: new Date(Date.now() - 22 * 60 * 1000),
      items: {
        create: [
          { menuItemId: findMenu("Caesar Salad").id, name: "Caesar Salad", quantity: 2, priceGrosze: 1100 },
          { menuItemId: findMenu("Beef Tenderloin").id, name: "Beef Tenderloin", quantity: 2, priceGrosze: 4200 },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      tenantId,
      locationId: mainLoc.id,
      tableNumber: 2,
      status: "READY",
      source: "DINE_IN",
      placedAt: new Date(Date.now() - 35 * 60 * 1000),
      items: {
        create: [
          { menuItemId: findMenu("Margherita").id, name: "Margherita", quantity: 1, priceGrosze: 1600 },
          { menuItemId: findMenu("Espresso").id, name: "Espresso", quantity: 2, priceGrosze: 450 },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      tenantId,
      locationId: mainLoc.id,
      tableNumber: 5,
      status: "PENDING",
      source: "DINE_IN",
      placedAt: new Date(Date.now() - 5 * 60 * 1000),
      items: {
        create: [
          { menuItemId: findMenu("Bruschetta al Pomodoro").id, name: "Bruschetta al Pomodoro", quantity: 2, priceGrosze: 850 },
          { menuItemId: findMenu("Spaghetti Carbonara").id, name: "Spaghetti Carbonara", quantity: 1, priceGrosze: 1800 },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      tenantId,
      locationId: mainLoc.id,
      status: "PENDING",
      source: "ONLINE",
      customerName: "Marco Russo",
      customerPhone: "+48 500 000 001",
      placedAt: new Date(Date.now() - 3 * 60 * 1000),
      items: {
        create: [
          { menuItemId: findMenu("Business Lunch").id, name: "Business Lunch", quantity: 2, priceGrosze: 3200 },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      tenantId,
      locationId: krakowLoc.id,
      tableNumber: 3,
      status: "PENDING",
      source: "DINE_IN",
      placedAt: new Date(Date.now() - 8 * 60 * 1000),
      items: {
        create: [
          { menuItemId: findMenu("Pierogi Ruskie").id, name: "Pierogi Ruskie", quantity: 2, priceGrosze: 2200 },
        ],
      },
    },
  });

  await prisma.table.updateMany({
    where: { tenantId, locationId: mainLoc.id, number: 1 },
    data: { currentOrderId: order1.id },
  });
  await prisma.table.updateMany({
    where: { tenantId, locationId: mainLoc.id, number: 2 },
    data: { currentOrderId: order2.id },
  });
  await prisma.table.updateMany({
    where: { tenantId, locationId: mainLoc.id, number: 5 },
    data: { currentOrderId: order3.id },
  });

  const salmon = findMenu("Grilled Salmon");
  const beef = findMenu("Beef Tenderloin");
  const tomato = await prisma.inventoryItem.create({
    data: { tenantId, name: "Tomatoes", unit: "kg", stockQty: 25, minStockQty: 5, costGrosze: 800 },
  });
  const beefStock = await prisma.inventoryItem.create({
    data: { tenantId, name: "Beef tenderloin", unit: "kg", stockQty: 12, minStockQty: 3, costGrosze: 4500 },
  });
  const salmonStock = await prisma.inventoryItem.create({
    data: { tenantId, name: "Salmon fillet", unit: "kg", stockQty: 8, minStockQty: 2, costGrosze: 5200 },
  });

  await prisma.recipeLine.createMany({
    data: [
      { menuItemId: beef.id, inventoryItemId: beefStock.id, quantity: 0.25 },
      { menuItemId: salmon.id, inventoryItemId: salmonStock.id, quantity: 0.2 },
      { menuItemId: findMenu("Bruschetta al Pomodoro").id, inventoryItemId: tomato.id, quantity: 0.05 },
    ],
  });

  await prisma.customer.create({
    data: {
      tenantId,
      name: "Anna Kowalska",
      email: "anna.kowalska@example.com",
      phone: "+48 600 111 222",
      orderCount: 3,
      totalSpentGrosze: 8450,
    },
  });

  await prisma.customer.create({
    data: {
      tenantId,
      name: "Jan Nowak",
      email: "jan.nowak@example.com",
      phone: "+48 601 333 444",
      orderCount: 1,
      totalSpentGrosze: 3200,
    },
  });

  await seedHistoricalOrders(
    tenantId,
    mainLoc.id,
    menuItems.map((m) => ({ id: m.id, name: m.name, priceGrosze: m.priceGrosze, category: m.category })),
  );

  await seedYearSampleOrders(
    tenantId,
    mainLoc.id,
    menuItems.map((m) => ({ id: m.id, name: m.name, priceGrosze: m.priceGrosze, category: m.category })),
    20,
  );

  const today = new Date();
  const lunchStart = new Date(today);
  lunchStart.setHours(12, 30, 0, 0);
  const lunchEnd = new Date(lunchStart.getTime() + 90 * 60 * 1000);
  const dinnerStart = new Date(today);
  dinnerStart.setHours(19, 0, 0, 0);
  const dinnerEnd = new Date(dinnerStart.getTime() + 120 * 60 * 1000);
  const afternoonStart = new Date(today);
  afternoonStart.setHours(15, 0, 0, 0);
  const afternoonEnd = new Date(afternoonStart.getTime() + 60 * 60 * 1000);

  await prisma.tableReservation.createMany({
    data: [
      {
        tenantId,
        locationId: mainLoc.id,
        tableNumber: 4,
        guestName: "Anna Kowalska",
        guestPhone: "+48 600 111 222",
        startsAt: lunchStart,
        endsAt: lunchEnd,
        notes: "Window seat preferred",
      },
      {
        tenantId,
        locationId: mainLoc.id,
        tableNumber: 4,
        guestName: "Jan Nowak",
        startsAt: dinnerStart,
        endsAt: dinnerEnd,
      },
      {
        tenantId,
        locationId: mainLoc.id,
        tableNumber: 8,
        guestName: "Corporate lunch",
        startsAt: afternoonStart,
        endsAt: afternoonEnd,
        notes: "Party of 6",
      },
    ],
  });

  void mainTables;
}
