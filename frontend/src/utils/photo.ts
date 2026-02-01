import { API_BASE_URL } from "../config/api";
import { DEFAULT_PHOTO_DATA_URL } from "../config/defaultPhoto";

const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
const normalizedApiOrigin = apiOrigin.replace(/\/$/, "");
const uploadsBaseUrl = `${normalizedApiOrigin}/uploads`;

export const resolvePhotoUrl = (photoUrl?: string | null) => {
  if (!photoUrl || !photoUrl.trim()) return DEFAULT_PHOTO_DATA_URL;
  const trimmed = photoUrl.trim();

  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;

  if (/^https?:/i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        return `${normalizedApiOrigin}${parsed.pathname}`;
      }
    } catch {}
    return trimmed;
  }

  const sanitized = trimmed.replace(/^\/+/, "");
  if (!sanitized) return DEFAULT_PHOTO_DATA_URL;
  if (sanitized.startsWith("uploads/")) {
    return `${normalizedApiOrigin}/${sanitized}`;
  }
  return `${uploadsBaseUrl}/${sanitized}`;
};
