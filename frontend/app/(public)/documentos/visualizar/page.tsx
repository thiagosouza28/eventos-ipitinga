import { Suspense } from "react";

import DocumentPreviewClient from "./DocumentPreviewClient";

export default function DocumentPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-sky-50 to-primary-50 text-neutral-900 dark:from-neutral-900 dark:via-neutral-950 dark:to-sky-950 dark:text-neutral-50">
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
            <div className="h-32 rounded-3xl border border-white/60 bg-white/70 shadow-inner shadow-primary-100/40 animate-pulse dark:border-white/10 dark:bg-neutral-900/50" />
            <div className="h-[70vh] rounded-3xl border border-white/60 bg-white/70 shadow-inner shadow-primary-100/40 animate-pulse dark:border-white/10 dark:bg-neutral-900/50" />
          </div>
        </div>
      }
    >
      <DocumentPreviewClient />
    </Suspense>
  );
}
