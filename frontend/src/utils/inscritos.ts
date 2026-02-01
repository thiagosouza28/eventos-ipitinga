export const normalizeNumero = (value: string | number | null | undefined) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\w-]/g, "");

export const normalizeDateString = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return String(value);
};
