"use client";

import { useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type EventNoticeModalProps = {
  slug: string;
  open: boolean;
  title: string;
  bullets: string[];
  footerText?: string;
  showOnce?: boolean;
  onAccept: (remember: boolean) => void;
  onCancel: () => void;
};

export function EventNoticeModal({
  slug,
  open,
  title,
  bullets,
  footerText,
  showOnce,
  onAccept,
  onCancel
}: EventNoticeModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRemember(false);
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 p-2 dark:bg-slate-950/80 sm:p-5">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`event-notice-title-${slug}`}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-none border border-slate-300 bg-white text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.16)] outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:max-h-[min(90dvh,760px)]"
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-5">
          <h2 id={`event-notice-title-${slug}`} className="min-w-0 text-lg font-bold text-slate-950 dark:text-white sm:text-xl">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar aviso"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-none border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={onCancel}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          <ul className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {bullets.map((item, index) => (
              <li key={`${slug}-${index}`} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-blue-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {footerText ? <p className="mt-5 border-l-2 border-blue-600 pl-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{footerText}</p> : null}
          {showOnce ? (
            <label className="mt-5 flex items-start gap-3 border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Não mostrar novamente</span>
            </label>
          ) : null}
        </div>

        <footer className="sticky bottom-0 z-10 grid shrink-0 gap-2 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:flex sm:justify-end sm:px-5">
          <button type="button" className="btn-muted w-full sm:w-auto" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => onAccept(showOnce === false ? false : remember)}>Li e concordo</button>
        </footer>
      </div>
    </div>
  );
}
