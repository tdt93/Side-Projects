import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  PaymentPolicy,
  PrismaClient,
} from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const existingSettings = await prisma.siteSettings.findFirst();
  if (!existingSettings) {
    await prisma.siteSettings.create({
      data: {
        siteName: "Trzymsię.pl",
        footerMarkdown: JSON.stringify({
          footerCompany: {
            legalName: "Trzymsie.pl sp. z o.o.",
            addressLine1: "ul. Marszałkowska 58/15",
            addressLine2: "00-545 Warszawa, Polska",
            email: "recepcja@trzymsie.pl",
            registryText: [
              "NIP: 7011197702",
              "KRS: 0001096909",
              "REGON: 528214933",
              "Kapitał Zakładowy: 5.000 PLN",
              "Sąd Rejonowy dla m. st. Warszawy w Warszawie XII Wydział Gospodarczy KRS",
            ].join("\n"),
          },
          homeStats: [
            { value: "8000+", label: "pacjentów zaufało nam" },
            { value: "2000+", label: "sesji miesięcznie" },
            { value: "14+", label: "lat pomagamy Wam online" },
          ],
          mediaPress: {
            label: "MÓWIĄ O NAS:",
            logos: [],
          },
          whyTrzymsie: {
            title: "Dlaczego trzymsie.pl?",
            benefits: [
              {
                icon: "experience",
                text: "od 14 lat wspieramy w drodze do poprawy samopoczucia - pomogliśmy już tysiącom osób",
              },
              {
                icon: "online",
                text: "sesje CBT online są tak samo skuteczne jak te w gabinecie",
              },
              {
                icon: "cbt",
                text: "terapia poznawczo-behawioralna (CBT) jest najbardziej udokumentowanym pod kątem skuteczności nurtem terapii, opartym na dowodach",
              },
              {
                icon: "therapists",
                text: "współpracujemy z 100+ psychoterapeutami nurtu poznawczo-behawioralnego o szerokim zakresie specjalizacji",
              },
              {
                icon: "privacy",
                text: "realizujemy sesje w sposób bezpieczny i zapewniający prywatność",
              },
              {
                icon: "calendar",
                text: "zapewniamy szeroką dostępność terminów",
              },
            ],
          },
        }),
        defaultSlotStep: 30,
        pendingHoldMinutes: 30,
      },
    });
  }

  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const therapistPass = process.env.SEED_THERAPIST_PASSWORD ?? "Therapist123!";

  const p1 = await prisma.therapistProfile.upsert({
    where: { slug: "anna-kowalska" },
    update: {},
    create: {
      slug: "anna-kowalska",
      displayName: "Anna Kowalska",
      title: "Psychoterapeutka CBT",
      taglineQuote:
        "„Bezpieczna przestrzeń i konkretne cele — to fundament dobrej terapii.”",
      timezone: "Europe/Warsaw",
      avatarUrl: "/placeholder-avatar.svg",
      heroImageUrl: "/placeholder-hero.svg",
      paymentPolicy: PaymentPolicy.PAY_LATER_IN_PERSON,
      officeCity: "Warszawa",
      officeAddressLine: "ul. Marszałkowska 10, lok. 4",
      bioLeadHtml: `<p>Nazywam się Anna Kowalska. Pracuję w nurcie poznawczo-behawioralnym.</p>
        <p><strong>Pierwsza sesja</strong> — omówimy cele i ramy czasowe.</p>`,
      receptionIntroHtml: `<p>Napisz do nas lub wybierz termin w kalendarzu. Odpowiadamy możliwie szybko.</p>`,
      contactChannels: [
        { type: "teams", label: "Teams", href: "#" },
        { type: "email", label: "E-mail", href: "mailto:kontakt@example.com" },
      ],
    },
  });

  const p2 = await prisma.therapistProfile.upsert({
    where: { slug: "jan-nowak" },
    update: {},
    create: {
      slug: "jan-nowak",
      displayName: "Jan Nowak",
      title: "Psycholog, psychoterapeuta",
      taglineQuote: "„Krótkie, mierzalne kroki — widoczna zmiana.”",
      timezone: "Europe/Warsaw",
      paymentPolicy: PaymentPolicy.PAY_BEFORE_BOOKING,
      officeCity: "Kraków",
      officeAddressLine: "ul. Dietla 5",
      bioLeadHtml: `<p>Pomagam przy lęku, depresji i kryzysach. Sesje stacjonarnie w Krakowie.</p>`,
      receptionIntroHtml: `<p>Zapytaj o wolny termin lub wybierz sesję w kalendarzu.</p>`,
      contactChannels: [{ type: "meet", label: "Google Meet", href: "#" }],
      avatarUrl: "/placeholder-avatar.svg",
      heroImageUrl: "/placeholder-hero.svg",
    },
  });

  const tagLabels = ["ADHD", "Lęki", "Depresja", "Terapia par", "Kryzys"];
  for (const label of tagLabels) {
    await prisma.specialtyTag.upsert({
      where: { label },
      update: {},
      create: { label },
    });
  }

  for (const label of ["ADHD", "Lęki", "Depresja"]) {
    const t = await prisma.specialtyTag.findUnique({ where: { label } });
    if (t) {
      await prisma.specialtyOnProfile.upsert({
        where: { profileId_tagId: { profileId: p1.id, tagId: t.id } },
        update: {},
        create: { profileId: p1.id, tagId: t.id },
      });
    }
  }

  await prisma.contentSection.deleteMany({ where: { profileId: p1.id } });
  await prisma.contentSection.createMany({
    data: [
      {
        profileId: p1.id,
        sortOrder: 0,
        heading: "Centrum — podejście",
        bodyHtml:
          "<p>Wspieramy pacjentów w całej Polsce. Skupiamy się na sprawdzonych metodach.</p>",
      },
      {
        profileId: p1.id,
        sortOrder: 1,
        heading: "O mnie",
        bodyHtml:
          "<p>Absolwentka psychologii, certyfikowana psychoterapeutka CBT.</p>",
      },
    ],
  });

  await prisma.testimonial.deleteMany({ where: { profileId: p1.id } });
  await prisma.testimonial.createMany({
    data: [
      {
        profileId: p1.id,
        authorName: "Marta",
        body: "Polecam — profesjonalnie i z empatią.",
        sortOrder: 0,
      },
      {
        profileId: p1.id,
        authorName: "Ania",
        body: "Krótko: duża ulga po kilku spotkaniach.",
        sortOrder: 1,
      },
    ],
  });

  await prisma.certificateAsset.deleteMany({ where: { profileId: p1.id } });
  await prisma.certificateAsset.create({
    data: {
      profileId: p1.id,
      imageUrl: "/placeholder-cert.svg",
      caption: "Certyfikat ukończenia szkolenia",
      sortOrder: 0,
    },
  });

  await prisma.availabilityRule.deleteMany({ where: { profileId: p1.id } });
  await prisma.availabilityRule.createMany({
    data: [1, 2, 3, 4, 5].map((d) => ({
      profileId: p1.id,
      dayOfWeek: d,
      startTime: "09:00",
      endTime: "17:00",
    })),
  });

  await prisma.meetingType.deleteMany({ where: { profileId: p1.id } });
  await prisma.meetingType.create({
    data: {
      profileId: p1.id,
      label: "Indywidualna",
      durationMinutes: 50,
      sortOrder: 0,
    },
  });
  await prisma.meetingType.create({
    data: {
      profileId: p1.id,
      label: "Dla par",
      durationMinutes: 80,
      sortOrder: 1,
    },
  });

  await prisma.availabilityRule.deleteMany({ where: { profileId: p2.id } });
  await prisma.availabilityRule.createMany({
    data: [1, 2, 3, 4, 5].map((d) => ({
      profileId: p2.id,
      dayOfWeek: d,
      startTime: "10:00",
      endTime: "16:00",
    })),
  });
  await prisma.meetingType.deleteMany({ where: { profileId: p2.id } });
  await prisma.meetingType.create({
    data: {
      profileId: p2.id,
      label: "Indywidualna",
      durationMinutes: 50,
      sortOrder: 0,
    },
  });

  const adminHash = await bcrypt.hash(adminPass, 10);
  const thHash = await bcrypt.hash(therapistPass, 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { passwordHash: adminHash },
    create: {
      email: "admin@example.com",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "therapist@example.com" },
    update: {
      passwordHash: thHash,
      therapistProfileId: p1.id,
    },
    create: {
      email: "therapist@example.com",
      passwordHash: thHash,
      role: "THERAPIST",
      therapistProfileId: p1.id,
    },
  });

  console.log("Seed OK. Admin admin@example.com /", adminPass);
  console.log("Therapist therapist@example.com /", therapistPass);
  console.log("Profiles:", p1.slug, p2.slug);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
