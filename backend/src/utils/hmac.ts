import crypto from "crypto";

import { env } from "../config/env";

const secret = env.HMAC_SECRET;

export const generateCheckinSignature = (registrationId: string, createdAt: Date): string => {
  const payload = `${registrationId}|${createdAt.getTime()}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

export const verifyCheckinSignature = (registrationId: string, createdAt: Date, signature: string) => {
  const expected = generateCheckinSignature(registrationId, createdAt);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

export const signReceiptToken = (registrationId: string, expiresInMinutes = 60): string => {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const payload = `${registrationId}|${expiresAt}`;
  const signature = crypto.createHmac("sha256", env.PDF_SIGN_SECRET).update(payload).digest("hex");
  const token = Buffer.from(`${payload}|${signature}`).toString("base64url");
  return token;
};

export const verifyReceiptToken = (registrationId: string, token: string): boolean => {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [tokenRegistrationId, expiresAtStr, signature] = decoded.split("|");
    if (tokenRegistrationId !== registrationId) return false;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return false;
    const payload = `${tokenRegistrationId}|${expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", env.PDF_SIGN_SECRET)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error) {
    return false;
  }
};
