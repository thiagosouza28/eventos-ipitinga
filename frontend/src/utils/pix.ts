const normalizePixCode = (value?: string | null) => (value ?? "").replace(/\r/g, "").replace(/\n/g, "");

const hashBufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const hashPixCode = async (value?: string | null) => {
  const normalized = normalizePixCode(value);
  if (!normalized) return "";
  if (typeof crypto === "undefined" || !crypto.subtle) return "";
  const encoded = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return hashBufferToHex(digest);
};

export { normalizePixCode, hashPixCode };
