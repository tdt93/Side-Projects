import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateStaffPin } from "@/lib/session";
import { slugify } from "@/lib/theme";
import { seedTenantDefaults } from "@/lib/seed-tenant";

const schema = z.object({
  restaurantName: z.string().min(2).max(80),
  ownerName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-signup", 5, 60_000);
  if (limited) return limited;

  try {
    const body = schema.parse(await req.json());
    const baseSlug = slugify(body.restaurantName) || "restaurant";
    let slug = baseSlug;
    let i = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const kitchenPin = generateStaffPin(6);
    const cashierPin = generateStaffPin(6);
    const kitchenPinHash = await bcrypt.hash(kitchenPin, 12);
    const cashierPinHash = await bcrypt.hash(cashierPin, 12);

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
              passwordHash: await bcrypt.hash(cryptoRandom(), 12),
              pinHash: kitchenPinHash,
            },
            {
              email: `cashier@${slug}.local`,
              name: "Cashier Staff",
              role: "CASHIER",
              passwordHash: await bcrypt.hash(cryptoRandom(), 12),
              pinHash: cashierPinHash,
            },
          ],
        },
      },
    });

    await seedTenantDefaults(tenant.id);

    return NextResponse.json({
      ok: true,
      slug,
      staffPins: { kitchen: kitchenPin, cashier: cashierPin },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

function cryptoRandom() {
  return crypto.randomBytes(32).toString("hex");
}
