export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type OpeningHours = Record<(typeof WEEKDAYS)[number], string>;

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  mon: "09:00-22:00",
  tue: "09:00-22:00",
  wed: "09:00-22:00",
  thu: "09:00-22:00",
  fri: "09:00-23:00",
  sat: "10:00-23:00",
  sun: "10:00-21:00",
};

export function parseOpeningHours(raw: string | undefined | null): OpeningHours {
  if (!raw) return { ...DEFAULT_OPENING_HOURS };
  try {
    const parsed = JSON.parse(raw) as Partial<OpeningHours>;
    return { ...DEFAULT_OPENING_HOURS, ...parsed };
  } catch {
    return { ...DEFAULT_OPENING_HOURS };
  }
}

export function serializeOpeningHours(hours: OpeningHours): string {
  return JSON.stringify(hours);
}
