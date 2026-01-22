import { createHash } from "crypto";

type PixQrData = {
  qr_code?: string | null;
  qr_code_base64?: string | null;
};

export const normalizePixCode = (value?: string | null) =>
  (value ?? "").replace(/\r/g, "").replace(/\n/g, "");

export const hashPixCode = (value?: string | null) => {
  const normalized = normalizePixCode(value);
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
};

export const buildPixMeta = (pixQrData?: PixQrData | null) => {
  const normalized = normalizePixCode(pixQrData?.qr_code ?? "");
  const hash = hashPixCode(pixQrData?.qr_code ?? "");
  return {
    pixQrHash: hash ?? undefined,
    pixQrLength: normalized ? normalized.length : undefined,
    pixQrBase64Length: pixQrData?.qr_code_base64 ? pixQrData.qr_code_base64.length : undefined
  };
};
