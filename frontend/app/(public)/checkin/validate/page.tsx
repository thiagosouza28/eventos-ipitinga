import { Suspense } from "react";

import CheckinValidateClient from "./CheckinValidateClient";

export default function CheckinValidatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center">
          <div className="w-full max-w-xl space-y-6 py-8 lg:py-12">
            <div className="rounded-3xl border border-white/60 bg-white/70 px-6 py-10 shadow-inner shadow-primary-100/40 animate-pulse dark:border-white/10 dark:bg-neutral-900/50" />
            <div className="rounded-3xl border border-white/60 bg-white/70 px-6 py-6 shadow-inner shadow-primary-100/40 animate-pulse dark:border-white/10 dark:bg-neutral-900/50" />
          </div>
        </div>
      }
    >
      <CheckinValidateClient />
    </Suspense>
  );
}
