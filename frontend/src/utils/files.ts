export const sanitizeFileName = (value: string, fallback = "arquivo") => {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || fallback;
};
