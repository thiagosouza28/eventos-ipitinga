import { API_BASE_URL } from "@/lib/config/api";

type ReceiptFormat = "pdf" | "png";

const getRuntimeOrigin = () =>
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost:3000";

export const resolveReceiptFileUrl = (value: string, format?: ReceiptFormat) => {
  try {
    const runtimeOrigin = getRuntimeOrigin();
    const apiBase = new URL(API_BASE_URL, runtimeOrigin);
    const target = new URL(value, apiBase);
    const receiptMatch = target.pathname.match(/\/receipts\/([^/]+)\.(?:pdf|png)$/i);

    if (!receiptMatch) {
      return target.toString();
    }

    const apiPath = apiBase.pathname.replace(/\/+$/, "").replace(/(?:\/api)+$/i, "/api");
    const extension = format ?? (target.pathname.toLowerCase().endsWith(".png") ? "png" : "pdf");
    target.protocol = apiBase.protocol;
    target.hostname = apiBase.hostname;
    target.port = apiBase.port;
    target.pathname = `${apiPath}/receipts/${receiptMatch[1]}.${extension}`.replace(/\/+/g, "/");
    return target.toString();
  } catch {
    return value;
  }
};

export const resolveReceiptImageUrl = (value: string) => resolveReceiptFileUrl(value, "png");
