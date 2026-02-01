import { API_BASE_URL } from "../config/api";
import { DEFAULT_PHOTO_DATA_URL } from "../config/defaultPhoto";

const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
const normalizedApiOrigin = apiOrigin.replace(/\/$/, "");
const uploadsBaseUrl = `${normalizedApiOrigin}/uploads`;

const resolvePhotoSources = (photoUrl?: string | null) => {
  if (!photoUrl || !photoUrl.trim()) {
    return { primary: DEFAULT_PHOTO_DATA_URL } as const;
  }

  const trimmed = photoUrl.trim();

  if (/^(data:|blob:)/i.test(trimmed)) {
    return { primary: trimmed } as const;
  }

  if (/^https?:/i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        return { primary: `${normalizedApiOrigin}${parsed.pathname}` } as const;
      }
    } catch {}
    return { primary: trimmed } as const;
  }

  const sanitized = trimmed.replace(/^\/+/, "");
  if (!sanitized) return { primary: DEFAULT_PHOTO_DATA_URL } as const;
  if (sanitized.startsWith("uploads/")) {
    return { primary: `${normalizedApiOrigin}/${sanitized}` } as const;
  }
  return { primary: `${uploadsBaseUrl}/${sanitized}` } as const;
};

export const resolvePhotoUrl = (photoUrl?: string | null) => resolvePhotoSources(photoUrl).primary;

export const resolvePhotoFallbackUrl = (_photoUrl?: string | null) => "";
