import type { Request, Response, NextFunction } from "express";

type ConcurrencyLimitOptions = {
  maxConcurrent: number;
  maxQueue: number;
  queueTimeoutMs: number;
};

type QueueEntry = {
  resolve: () => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
};

export const createConcurrencyLimiter = (options: ConcurrencyLimitOptions) => {
  const maxConcurrent = Math.max(1, options.maxConcurrent);
  const maxQueue = Math.max(0, options.maxQueue);
  const queueTimeoutMs = Math.max(0, options.queueTimeoutMs);
  const queue: QueueEntry[] = [];
  let active = 0;

  const rejectRequest = (response: Response, message: string) => {
    if (response.headersSent || response.writableEnded) {
      return;
    }
    const retryAfter = queueTimeoutMs > 0 ? Math.ceil(queueTimeoutMs / 1000) : 5;
    response.setHeader("Retry-After", String(Math.max(1, retryAfter)));
    response.status(503).json({ message });
  };

  const releaseNext = () => {
    if (active >= maxConcurrent || queue.length === 0) {
      return;
    }

    while (active < maxConcurrent && queue.length > 0) {
      const entry = queue.shift();
      if (!entry) return;
      active += 1;
      entry.resolve();
    }
  };

  const enqueue = (request: Request) =>
    new Promise<void>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;
      let settled = false;

      const cleanup = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        request.removeListener("aborted", onAbort);
      };

      const entry: QueueEntry = {
        enqueuedAt: Date.now(),
        resolve: () => {
          cleanup();
          resolve();
        },
        reject: (error: Error) => {
          cleanup();
          reject(error);
        }
      };

      const onAbort = () => {
        const index = queue.indexOf(entry);
        if (index >= 0) {
          queue.splice(index, 1);
        }
        entry.reject(new Error("request aborted"));
      };

      if (queueTimeoutMs > 0) {
        timeoutId = setTimeout(() => {
          const index = queue.indexOf(entry);
          if (index >= 0) {
            queue.splice(index, 1);
          }
          entry.reject(new Error("queue timeout"));
        }, queueTimeoutMs);
      }

      request.on("aborted", onAbort);
      queue.push(entry);
    });

  return async (request: Request, response: Response, next: NextFunction) => {
    if (request.method === "OPTIONS") {
      next();
      return;
    }

    const beginRequest = (alreadyCounted: boolean) => {
      if (!alreadyCounted) {
        active += 1;
      }

      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        active = Math.max(0, active - 1);
        releaseNext();
      };

      response.on("finish", done);
      response.on("close", done);
      request.on("aborted", done);

      if (request.aborted || response.writableEnded) {
        done();
        return;
      }

      next();
    };

    if (active < maxConcurrent) {
      beginRequest(false);
      return;
    }

    if (queue.length >= maxQueue) {
      rejectRequest(response, "Servidor ocupado. Tente novamente em instantes.");
      return;
    }

    try {
      await enqueue(request);
      beginRequest(true);
    } catch {
      rejectRequest(response, "Servidor ocupado. Tente novamente em instantes.");
    }
  };
};
