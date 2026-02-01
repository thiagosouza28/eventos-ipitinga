import { env } from "../config/env";

export const getPublicAppBaseUrl = () => {
  const base = (env.PUBLIC_APP_URL ?? env.APP_URL).trim();
  return base.replace(/\/$/, "");
};
