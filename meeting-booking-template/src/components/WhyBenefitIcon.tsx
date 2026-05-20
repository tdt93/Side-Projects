const ICON_CLASS = "h-12 w-12 shrink-0 text-[#37B3D6] md:h-14 md:w-14";

export const WHY_BENEFIT_ICON_KEYS = [
  "experience",
  "online",
  "cbt",
  "therapists",
  "privacy",
  "calendar",
] as const;

export type WhyBenefitIconKey = (typeof WHY_BENEFIT_ICON_KEYS)[number];

export function isWhyBenefitIconKey(key: string): key is WhyBenefitIconKey {
  return (WHY_BENEFIT_ICON_KEYS as readonly string[]).includes(key);
}

export function isWhyBenefitIconUrl(icon: string): boolean {
  const t = icon.trim();
  return (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("/")
  );
}

const IMAGE_ICON_CLASS =
  "h-12 w-12 shrink-0 object-contain object-left md:h-14 md:w-14";

export function WhyBenefitIconDisplay({ icon }: { icon: string }) {
  if (isWhyBenefitIconUrl(icon)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={icon.trim()} alt="" className={IMAGE_ICON_CLASS} />
    );
  }
  const key = isWhyBenefitIconKey(icon) ? icon : "experience";
  return <WhyBenefitIcon icon={key} />;
}

export function WhyBenefitIcon({ icon }: { icon: WhyBenefitIconKey }) {
  switch (icon) {
    case "experience":
      return (
        <svg className={ICON_CLASS} viewBox="0 0 48 48" fill="none" aria-hidden>
          <path
            d="M12 28c0-6 4-10 12-10s12 4 12 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M24 34v6M18 40h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="24" cy="14" r="6" stroke="currentColor" strokeWidth="2" />
          <path
            d="M30 20l4-4 4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "online":
      return (
        <svg className={ICON_CLASS} viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect x="6" y="10" width="36" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M6 32l10-8 8 6 8-8 10 10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M30 16h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="33" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "cbt":
      return (
        <svg className={ICON_CLASS} viewBox="0 0 48 48" fill="none" aria-hidden>
          <path
            d="M10 34c2-8 8-14 14-14s12 6 14 14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M16 28c2-4 5-6 8-6s6 2 8 6"
            stroke="currentColor"
            strokeWidth="2"
          />
          <ellipse cx="24" cy="16" rx="10" ry="8" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "therapists":
      return (
        <svg className={ICON_CLASS} viewBox="0 0 48 48" fill="none" aria-hidden>
          <circle cx="20" cy="18" r="8" stroke="currentColor" strokeWidth="2" />
          <path d="M8 38c0-8 5-12 12-12s12 4 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="34" cy="20" r="5" stroke="currentColor" strokeWidth="2" />
          <path d="M28 36c1-5 4-8 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 12l6-2 2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "privacy":
      return (
        <svg className={ICON_CLASS} viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect x="14" y="20" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <path
            d="M18 20v-4a6 6 0 0112 0v4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="24" cy="29" r="2" fill="currentColor" />
          <path d="M24 31v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={ICON_CLASS} viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect x="8" y="10" width="32" height="30" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M8 18h32M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 26h4v4h-4v-4zm8 0h4v4h-4v-4zm8 0h4v4h-4v-4z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    default:
      return (
        <svg className={ICON_CLASS} viewBox="0 0 48 48" fill="none" aria-hidden>
          <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
}
