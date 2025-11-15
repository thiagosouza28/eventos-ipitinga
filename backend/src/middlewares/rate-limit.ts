import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

import { env } from "../config/env";

export const publicLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
});
