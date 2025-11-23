import { AsyncLocalStorage } from "node:async_hooks";

export type RequestScope = {
  userId?: string;
  ministryId?: string | null;
  churchId?: string | null;
};

const storage = new AsyncLocalStorage<RequestScope>();

export const requestScope = {
  run<T>(scope: RequestScope, callback: () => T | Promise<T>) {
    return storage.run(scope, callback);
  },
  get(): RequestScope | undefined {
    return storage.getStore();
  }
};

