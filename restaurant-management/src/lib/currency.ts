const LOCALE_MAP: Record<string, string> = {
  PLN: "pl-PL",
  EUR: "de-DE",
  USD: "en-US",
  VND: "vi-VN",
  GBP: "en-GB",
};

export function formatMoney(grosze: number, currency = "PLN", locale?: string) {
  const resolvedLocale = locale ?? LOCALE_MAP[currency] ?? "pl-PL";
  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(grosze / 100);
}

export function groszeToDecimal(grosze: number) {
  return grosze / 100;
}

export function decimalToGrosze(amount: number) {
  return Math.round(amount * 100);
}

export function taxFromSubtotal(subtotalGrosze: number, taxRateBps: number) {
  return Math.round((subtotalGrosze * taxRateBps) / 10000);
}
