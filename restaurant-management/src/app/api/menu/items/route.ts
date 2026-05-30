import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { compressDishImage, type ImageAspect } from "@/lib/image-process";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { getSession } from "@/lib/session";
import { uploadMenuImage } from "@/lib/supabase";

async function parseMenuBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const image = form.get("image");
    return {
      name: String(form.get("name") ?? ""),
      category: String(form.get("category") ?? "Mains"),
      priceGrosze: Number(form.get("priceGrosze") ?? 0),
      description: String(form.get("description") ?? ""),
      isCombo: form.get("isCombo") === "true",
      imageAspectRatio: (String(form.get("imageAspectRatio") ?? "1:1") as ImageAspect) || "1:1",
      locationId: form.get("locationId") ? String(form.get("locationId")) : null,
      imageFile: image instanceof File && image.size > 0 ? image : null,
    };
  }

  const body = z
    .object({
      name: z.string(),
      category: z.string(),
      priceGrosze: z.number().int().positive(),
      description: z.string().optional(),
      isCombo: z.boolean().optional(),
      imageAspectRatio: z.enum(["1:1", "3:4"]).optional(),
      locationId: z.string().nullable().optional(),
    })
    .parse(await req.json());

  return { ...body, description: body.description ?? "", locationId: body.locationId ?? null, imageFile: null as File | null };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseMenuBody(req);
  const item = await prisma.menuItem.create({
    data: {
      tenantId: session.tenantId,
      locationId: parsed.locationId,
      name: parsed.name,
      category: parsed.category,
      priceGrosze: parsed.priceGrosze,
      description: parsed.description,
      isCombo: parsed.isCombo ?? false,
      imageAspectRatio: parsed.imageAspectRatio ?? "1:1",
    },
  });

  if (parsed.imageFile) {
    const buffer = Buffer.from(await parsed.imageFile.arrayBuffer());
    const { buffer: compressed, mime } = await compressDishImage(buffer, parsed.imageAspectRatio ?? "1:1");
    const imageUrl = await uploadMenuImage(session.tenantId, item.id, compressed, mime);
    await prisma.menuItem.update({ where: { id: item.id }, data: { imageUrl } });
  }

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ id: item.id });
}
