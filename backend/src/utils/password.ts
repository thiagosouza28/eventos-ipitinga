import { randomBytes } from "crypto";

export const generateTemporaryPassword = () => {
  const candidate = randomBytes(8).toString("base64url");
  return candidate.slice(0, 10);
};

