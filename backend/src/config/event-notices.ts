export type EventNotice = {
  enabled: boolean;
  title?: string;
  bullets?: string[];
  footerText?: string;
  showOnce?: boolean;
};

export type EventNoticeFields = {
  noticeEnabled?: boolean | null;
  noticeTitle?: string | null;
  noticeBullets?: string | null;
  noticeFooterText?: string | null;
  noticeShowOnce?: boolean | null;
};

const normalizeText = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed || "";
};

const splitBullets = (value?: string | null) => {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const hasNoticeFields = (fields?: EventNoticeFields | null) => {
  if (!fields) return false;
  return (
    fields.noticeEnabled !== null &&
    fields.noticeEnabled !== undefined ||
    Boolean(fields.noticeTitle) ||
    Boolean(fields.noticeBullets) ||
    Boolean(fields.noticeFooterText) ||
    fields.noticeShowOnce !== null &&
    fields.noticeShowOnce !== undefined
  );
};

export const buildNoticeFromFields = (
  fields?: EventNoticeFields | null
): EventNotice | null => {
  if (!hasNoticeFields(fields)) {
    return null;
  }
  const enabled = Boolean(fields?.noticeEnabled);
  const title = normalizeText(fields?.noticeTitle);
  const bullets = splitBullets(fields?.noticeBullets);
  const footerTextValue = normalizeText(fields?.noticeFooterText);
  const footerText = footerTextValue ? footerTextValue : undefined;
  const showOnce = fields?.noticeShowOnce ?? true;

  return {
    enabled,
    title,
    bullets,
    footerText,
    showOnce
  };
};
