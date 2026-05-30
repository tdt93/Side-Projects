import { prisma } from "@/lib/db";

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

  void mainTables;
}
