import type { WhyBenefitItem } from "@/lib/site-public-content";
import { WhyBenefitIconDisplay } from "@/components/WhyBenefitIcon";

export function WhyTrzymsieSection({
  title,
  benefits,
}: {
  title: string;
  benefits: WhyBenefitItem[];
}) {
  if (benefits.length === 0) return null;

  return (
    <section className="w-full bg-[#E4F4F8] py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-10 text-center text-2xl font-bold text-[#003C79] md:text-3xl">
          {title}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {benefits.map((item, i) => (
            <li
              key={`${item.icon}-${i}`}
              className="flex gap-4 rounded-xl border border-white/80 bg-white p-5 shadow-sm md:gap-5 md:p-6"
            >
              <WhyBenefitIconDisplay icon={item.icon} />
              <p className="text-sm leading-relaxed text-slate-700 md:text-base">
                {item.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
