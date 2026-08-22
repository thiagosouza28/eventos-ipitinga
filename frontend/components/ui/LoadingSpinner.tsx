"use client";

import { cn } from "@/lib/utils/cn";

type LoadingSpinnerProps = {
  className?: string;
  size?: number;
};

export function LoadingSpinner({ className, size = 48 }: LoadingSpinnerProps) {
  const dimension = `${size}px`;
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className="theme-inline-spinner animate-spin rounded-full border-4 border-t-[color:var(--primary)]"
        style={{ width: dimension, height: dimension }}
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Carregando...</span>
      </div>
    </div>
  );
}
