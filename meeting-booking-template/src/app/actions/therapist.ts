"use server";

import { revalidatePath } from "next/cache";
import { PaymentPolicy } from "@/generated/prisma";
import {
  parseMediaLogosLines,
  parseWhyBenefitsLines,
  serializeSiteSettingsStorage,
} from "@/lib/site-public-content";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { therapistRevalidatePaths } from "@/lib/therapist-path";

function revalidateTherapistPublicPages(profile: {
  officeCity: string | null;
  slug: string;
}) {
  for (const path of therapistRevalidatePaths(profile)) {
    revalidatePath(path);
  }
}

async function assertSuper() {
  const s = await getSession();
  if (s.role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

function parseLines(input: FormDataEntryValue | null): string[] {
  return String(input ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parsePipeList(
  input: FormDataEntryValue | null,
): Array<{ a: string; b: string | null }> {
  return parseLines(input).map((line) => {
    const [left, ...rest] = line.split("|");
    const right = rest.join("|").trim();
    return {
      a: (left ?? "").trim(),
      b: right ? right : null,
    };
  });
}

function parseSections(
  input: FormDataEntryValue | null,
): Array<{ heading: string; bodyHtml: string }> {
  const raw = String(input ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/\n-{3,}\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [heading, ...body] = block.split(/\r?\n/);
      return {
        heading: (heading ?? "").trim(),
        bodyHtml: body.join("\n").trim(),
      };
    })
    .filter((x) => x.heading && x.bodyHtml);
}

export async function updateTherapistProfileAction(
  profileId: string,
  form: FormData,
) {
  await assertSuper();

  const paymentPolicy = form.get("paymentPolicy") as PaymentPolicy;
  const slug = String(form.get("slug") ?? "").trim();
  const displayName = String(form.get("displayName") ?? "").trim();
  if (!slug || !displayName) throw new Error("slug i nazwa wymagane");

  const tags = parseLines(form.get("tags")).flatMap((line) =>
    line.split(",").map((x) => x.trim()).filter(Boolean),
  );
  const uniqTags = Array.from(new Set(tags));
  const testimonials = parsePipeList(form.get("testimonials")).filter(
    (x) => x.a && x.b,
  );
  const certificates = parsePipeList(form.get("certificates")).filter(
    (x) => x.a,
  );
  const sections = parseSections(form.get("sections"));

  await prisma.$transaction(async (tx) => {
    await tx.therapistProfile.update({
      where: { id: profileId },
      data: {
        slug,
        displayName,
        title: String(form.get("title") ?? "") || null,
        taglineQuote: String(form.get("taglineQuote") ?? "") || null,
        timezone: String(form.get("timezone") ?? "Europe/Warsaw"),
        avatarUrl: String(form.get("avatarUrl") ?? "") || null,
        heroImageUrl: String(form.get("heroImageUrl") ?? "") || null,
        officeCity: String(form.get("officeCity") ?? "") || null,
        officeAddressLine: String(form.get("officeAddressLine") ?? "") || null,
        bioLeadHtml: String(form.get("bioLeadHtml") ?? "") || null,
        receptionIntroHtml: String(form.get("receptionIntroHtml") ?? "") || null,
        sessionPricePlnGrosze: (() => {
          const raw = String(form.get("sessionPricePlnGrosze") ?? "").trim().replace(",", ".");
          const pln = parseFloat(raw);
          if (!raw || Number.isNaN(pln) || pln <= 0) return null;
          return Math.round(pln * 100);
        })(),
        paymentPolicy:
          paymentPolicy === PaymentPolicy.PAY_BEFORE_BOOKING
            ? PaymentPolicy.PAY_BEFORE_BOOKING
            : PaymentPolicy.PAY_LATER_IN_PERSON,
      },
    });

    await tx.specialtyOnProfile.deleteMany({ where: { profileId } });
    for (const label of uniqTags) {
      const tag = await tx.specialtyTag.upsert({
        where: { label },
        update: {},
        create: { label },
      });
      await tx.specialtyOnProfile.create({
        data: { profileId, tagId: tag.id },
      });
    }

    await tx.testimonial.deleteMany({ where: { profileId } });
    if (testimonials.length > 0) {
      await tx.testimonial.createMany({
        data: testimonials.map((t, i) => ({
          profileId,
          authorName: t.a,
          body: t.b ?? "",
          sortOrder: i,
        })),
      });
    }

    await tx.certificateAsset.deleteMany({ where: { profileId } });
    if (certificates.length > 0) {
      await tx.certificateAsset.createMany({
        data: certificates.map((c, i) => ({
          profileId,
          imageUrl: c.a,
          caption: c.b,
          sortOrder: i,
        })),
      });
    }

    await tx.contentSection.deleteMany({ where: { profileId } });
    if (sections.length > 0) {
      await tx.contentSection.createMany({
        data: sections.map((s, i) => ({
          profileId,
          heading: s.heading,
          bodyHtml: s.bodyHtml,
          sortOrder: i,
        })),
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/admin/therapists");
  revalidateTherapistPublicPages({
    slug,
    officeCity: String(form.get("officeCity") ?? "") || null,
  });
}

function positiveIntFromForm(value: FormDataEntryValue | null, fallback: number) {
  const n = parseInt(String(value ?? fallback), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function updateSiteSettingsAction(form: FormData) {
  await assertSuper();
  const settings = await prisma.siteSettings.findFirst();
  const siteName =
    String(form.get("siteName") ?? "").trim() ||
    settings?.siteName ||
    "Trzymsię.pl";

  const homeStats = [1, 2, 3].map((i) => ({
    value: String(form.get(`stat${i}Value`) ?? "").trim(),
    label: String(form.get(`stat${i}Label`) ?? "").trim(),
  }));

  const footerMarkdown = serializeSiteSettingsStorage(settings?.footerMarkdown ?? null, {
    footerCompany: {
      companyLegalName: String(form.get("companyLegalName") ?? ""),
      companyAddressLine1: String(form.get("companyAddressLine1") ?? ""),
      companyAddressLine2: String(form.get("companyAddressLine2") ?? ""),
      companyEmail: String(form.get("companyEmail") ?? ""),
      companyRegistryText: String(form.get("companyRegistryText") ?? ""),
    },
    homeStats,
    mediaPress: {
      label: String(form.get("mediaPressLabel") ?? ""),
      logos: parseMediaLogosLines(String(form.get("mediaLogos") ?? "")),
    },
    whyTrzymsie: {
      title: String(form.get("whyTrzymsieTitle") ?? ""),
      benefits: parseWhyBenefitsLines(String(form.get("whyTrzymsieBenefits") ?? "")),
    },
    faviconUrl: String(form.get("faviconUrl") ?? ""),
  });

  const data = {
    siteName,
    footerMarkdown,
    defaultSlotStep: positiveIntFromForm(form.get("defaultSlotStep"), 30),
    pendingHoldMinutes: positiveIntFromForm(form.get("pendingHoldMinutes"), 30),
  };

  if (!settings) {
    await prisma.siteSettings.create({ data });
  } else {
    await prisma.siteSettings.update({
      where: { id: settings.id },
      data,
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/site");
  revalidatePath("/book");

  const therapists = await prisma.therapistProfile.findMany({
    select: { slug: true, officeCity: true },
  });
  for (const profile of therapists) {
    revalidateTherapistPublicPages(profile);
  }
}

export async function createTherapistAction(form: FormData) {
  await assertSuper();
  const displayName = String(form.get("displayName") ?? "").trim();
  const slugInput = String(form.get("slug") ?? "").trim();
  if (!displayName) throw new Error("Podaj nazwę terapeuty");
  const slug =
    slugInput ||
    displayName
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
  if (!slug) throw new Error("Podaj poprawny slug");

  const officeCity = String(form.get("officeCity") ?? "").trim();
  if (!officeCity) throw new Error("Wybierz miasto gabinetu");

  const created = await prisma.therapistProfile.create({
    data: {
      slug,
      displayName,
      title: String(form.get("title") ?? "") || null,
      timezone: "Europe/Warsaw",
      officeCity,
      bioLeadHtml: "<p>Uzupełnij opis terapeuty.</p>",
      receptionIntroHtml: "<p>Uzupełnij treść recepcji.</p>",
    },
  });

  await prisma.meetingType.create({
    data: {
      profileId: created.id,
      label: "Indywidualna",
      durationMinutes: 50,
      sortOrder: 0,
    },
  });

  await prisma.availabilityRule.createMany({
    data: [1, 2, 3, 4, 5].map((d) => ({
      profileId: created.id,
      dayOfWeek: d,
      startTime: "09:00",
      endTime: "17:00",
    })),
  });

  revalidatePath("/");
  revalidatePath("/admin/therapists");
  revalidateTherapistPublicPages({ slug, officeCity });
}

export async function deleteTherapistAction(profileId: string) {
  await assertSuper();
  const profile = await prisma.therapistProfile.findUnique({
    where: { id: profileId },
    select: { slug: true, officeCity: true },
  });
  if (!profile) return;

  await prisma.therapistProfile.delete({ where: { id: profileId } });
  revalidatePath("/");
  revalidatePath("/admin/therapists");
  revalidateTherapistPublicPages(profile);
}
