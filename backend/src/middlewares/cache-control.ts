type Handler = (req: any, res: any, next: (err?: any) => void) => any;

type CacheOptions = {
  /**
   * CDN cache TTL (Vercel respects `s-maxage` for caching at the edge).
   */
  sMaxAgeSeconds: number;
  /**
   * Allow serving stale content while revalidating in background.
   */
  staleWhileRevalidateSeconds?: number;
};

export const publicCache =
  (options: CacheOptions): Handler =>
  (req, res, next) => {
    const method = String(req?.method ?? "").toUpperCase();
    if (method !== "GET" && method !== "HEAD") return next();

    // Don't override if something else already set cache headers.
    if (typeof res.getHeader === "function" && res.getHeader("Cache-Control")) {
      return next();
    }

    const sMaxAge = Math.max(0, Math.floor(options.sMaxAgeSeconds));
    const stale = Math.max(0, Math.floor(options.staleWhileRevalidateSeconds ?? 0));

    // `max-age=0` forces browsers to revalidate; `s-maxage` caches at CDN/proxy.
    const parts = [`public`, `max-age=0`, `s-maxage=${sMaxAge}`];
    if (stale > 0) {
      parts.push(`stale-while-revalidate=${stale}`);
    }
    res.setHeader("Cache-Control", parts.join(", "));
    return next();
  };

