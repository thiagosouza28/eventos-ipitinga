"use client";

import { useMemo } from "react";

import { useLoaderStore } from "@/lib/stores/loader";

export function LoadingOverlay() {
  const isVisible = useLoaderStore((state) => state.manualLock || state.activeRequests > 0);
  const message = useLoaderStore((state) => state.message);

  const displayMessage = useMemo(() => {
    const text = message?.text?.trim();
    return text && text.length > 0 ? text : "Processando...";
  }, [message]);

  if (!isVisible) return null;

  return (
    <div
      className="theme-loading-overlay fixed inset-0 z-[2000] flex items-center justify-center p-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="theme-loading-panel">
        <div className="theme-loading-brand" aria-hidden="true">
          <img
            className="theme-loading-logo"
            src="/branding/campal-identidade.webp"
            width="384"
            height="319"
            alt=""
          />
        </div>
        <div className="theme-loading-content">
          <p className="theme-loading-eyebrow">Aguarde um instante</p>
          <p className="theme-loading-message">{displayMessage}</p>
          <div className="theme-loading-progress" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
