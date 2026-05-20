/** Parses display values like "8000+", "14+" into animatable number + affixes. */
export function parseStatValue(value: string): {
  target: number;
  prefix: string;
  suffix: string;
} {
  const trimmed = value.trim();
  const match = trimmed.match(/^([^\d]*)([\d][\d.,\s]*)(.*)$/);
  if (!match) {
    return { target: 0, prefix: "", suffix: trimmed };
  }
  const numeric = match[2].replace(/[\s.,]/g, "");
  const target = parseInt(numeric, 10);
  return {
    prefix: match[1],
    suffix: match[3],
    target: Number.isFinite(target) ? target : 0,
  };
}
