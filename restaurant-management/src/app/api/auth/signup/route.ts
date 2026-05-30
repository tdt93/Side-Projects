import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/theme";
import { seedTenantDefaults } from "@/lib/seed-tenant";

const schema = z.object({
  restaurantName: z.string().min(2).max(80),
  ownerName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const baseSlug = slugify(body.restaurantName) || "restaurant";
    let slug = baseSlug;
    let i = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const kitchenPinHash = await bcrypt.hash("1234", 10);
    const cashierPinHash = await bcrypt.hash("5678", 10);

    const tenant = await prisma.tenant.create({
      data: {
        slug,
        displayName: body.restaurantName,
        settings: {
          create: {
            currency: "PLN",
            taxRateBps: 800,
            enabledLanguages: JSON.stringify(["vi", "en", "pl"]),
            defaultLocale: "vi",
          },
        },
        users: {
          create: [
            {
              email: body.email.toLowerCase(),
              name: body.ownerName,
              role: "OWNER",
              passwordHash,
            },
            {
              email: `kitchen@${slug}.local`,
              name: "Kitchen Staff",
              role: "KITCHEN",
              passwordHash: await bcrypt.hash("unused", 10),
              pinHash: kitchenPinHash,
            },
            {
              email: `cashier@${slug}.local`,
              name: "Cashier Staff",
              role: "CASHIER",
              passwordHash: await bcrypt.hash("unused", 10),
              pinHash: cashierPinHash,
            },
          ],
        },
      },
    });

    await seedTenantDefaults(tenant.id);

    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
