export const getNoticeStorageKey = (slug) => `notice_seen_${slug}`;
export const buildNoticeFingerprint = (notice) => {
    const normalized = {
        title: (notice.title ?? "").trim(),
        bullets: (notice.bullets ?? []).map((item) => item.trim()).filter(Boolean),
        footerText: (notice.footerText ?? "").trim(),
        showOnce: notice.showOnce ?? true,
        enabled: Boolean(notice.enabled)
    };
    return JSON.stringify(normalized);
};
export const hasSeenNotice = (slug, fingerprint) => {
    if (!slug || typeof window === "undefined") {
        return false;
    }
    try {
        const stored = localStorage.getItem(getNoticeStorageKey(slug));
        if (!stored)
            return false;
        if (!fingerprint)
            return stored === "true";
        return stored === fingerprint;
    }
    catch {
        return false;
    }
};
export const setSeenNotice = (slug, fingerprint) => {
    if (!slug || typeof window === "undefined") {
        return;
    }
    try {
        localStorage.setItem(getNoticeStorageKey(slug), fingerprint ?? "true");
    }
    catch {
        // Ignore storage errors.
    }
};
//# sourceMappingURL=eventNotice.js.map