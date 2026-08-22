import { Suspense } from "react";

import AdminForcePasswordClient from "./AdminForcePasswordClient";

export default function AdminForcePassword() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border border-white/60 bg-white/70 px-6 py-10 shadow-inner shadow-primary-100/40 animate-pulse dark:border-white/10 dark:bg-neutral-900/50" />
        </div>
      }
    >
      <AdminForcePasswordClient />
    </Suspense>
  );
}
