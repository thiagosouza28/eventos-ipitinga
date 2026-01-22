export const getNoticeStorageKey = (slug: string) => `notice_seen_${slug}`;

export const buildNoticeFingerprint = (notice: {
  title?: string | null;
  bullets?: string[] | null;
  footerText?: string | null;
  showOnce?: boolean | null;
  enabled?: boolean | null;
}) => {
  const normalized = {
    title: (notice.title ?? "").trim(),
    bullets: (notice.bullets ?? []).map((item) => item.trim()).filter(Boolean),
    footerText: (notice.footerText ?? "").trim(),
    showOnce: notice.showOnce ?? true,
    enabled: Boolean(notice.enabled)
  };
  return JSON.stringify(normalized);
};

export const hasSeenNotice = (slug: string, fingerprint?: string): boolean => {
  if (!slug || typeof window === "undefined") {
    return false;
  }
  try {
    const stored = localStorage.getItem(getNoticeStorageKey(slug));
    if (!stored) return false;
    if (!fingerprint) return stored === "true";
    return stored === fingerprint;
  } catch {
    return false;
  }
};

export const setSeenNotice = (slug: string, fingerprint?: string): void => {
  if (!slug || typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(getNoticeStorageKey(slug), fingerprint ?? "true");
  } catch {
    // Ignore storage errors.
  }
};
