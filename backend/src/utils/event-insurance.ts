const INSURANCE_TIME_ZONE = "America/Sao_Paulo";

const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: INSURANCE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const toCalendarDayNumber = (value: Date) => {
  const parts = datePartsFormatter.formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  if (![year, month, day].every(Number.isFinite)) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
};

export const calculateEventInsuranceDays = (startDate: Date, endDate: Date) => {
  const start = toCalendarDayNumber(startDate);
  const end = toCalendarDayNumber(endDate);
  if (start === null || end === null || end < start) return 1;
  return Math.max(1, end - start + 1);
};

export const resolveInsuranceAmountCents = (dailyCents: number, days: number) =>
  Math.max(0, Math.trunc(dailyCents)) * Math.max(1, Math.trunc(days));
