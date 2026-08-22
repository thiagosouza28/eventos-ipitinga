"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

type DateFieldProps = {
  value?: string | null;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  autoComplete?: string;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onEnter?: () => void;
};

const baseInputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-primary-400 dark:focus:ring-primary-500/40";

const formatDisplayValue = (value?: string | null): string => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
};

const parseDigitsToIso = (digits: string): string | null => {
  if (digits.length !== 8) return null;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4);
  const dayNum = Number(day);
  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!yearNum || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return null;
  }

  const testDate = new Date(yearNum, monthNum - 1, dayNum);
  if (
    testDate.getFullYear() !== yearNum ||
    testDate.getMonth() !== monthNum - 1 ||
    testDate.getDate() !== dayNum
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

export function DateField({
  value,
  onChange,
  name,
  id,
  placeholder = "DD/MM/AAAA",
  className,
  inputClassName,
  disabled,
  required,
  min,
  max,
  autoComplete = "bday",
  onFocus,
  onBlur,
  onEnter
}: DateFieldProps) {
  const nativeInputRef = useRef<HTMLInputElement | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [displayValue, setDisplayValue] = useState(formatDisplayValue(value));

  useEffect(() => {
    setDisplayValue(formatDisplayValue(value));
  }, [value]);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const media = window.matchMedia("(pointer: coarse)");
      setIsCoarsePointer(media.matches);
      if (typeof media.addEventListener === "function") {
        const listener = (evt: MediaQueryListEvent) => setIsCoarsePointer(evt.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
      }
    }
    return undefined;
  }, []);

  const openPicker = useCallback(() => {
    if (!nativeInputRef.current || disabled) return;
    if (typeof (nativeInputRef.current as any).showPicker === "function") {
      try {
        (nativeInputRef.current as any).showPicker();
        return;
      } catch {
        // ignore
      }
    }
    nativeInputRef.current.click();
  }, [disabled]);

  const handleDisplayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setDisplayValue(raw);
    const digits = raw.replace(/\D/g, "");
    if (!digits.length) {
      onChange?.("");
      return;
    }
    if (digits.length === 8) {
      const iso = parseDigitsToIso(digits);
      if (iso) {
        onChange?.(iso);
      }
    }
  };

  const handleNativeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.value;
    onChange?.(selected);
    setDisplayValue(formatDisplayValue(selected));
  };

  const mergedClass = useMemo(
    () => cn(baseInputClass, inputClassName, className),
    [className, inputClassName]
  );

  return (
    <div className="relative w-full">
      <input
        value={displayValue}
        onChange={handleDisplayChange}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        name={name}
        id={id}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        className={mergedClass}
        onFocus={(event) => {
          onFocus?.(event);
          if (isCoarsePointer) {
            openPicker();
          }
        }}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter?.();
          }
        }}
      />

      <button
        type="button"
        className="absolute inset-y-0 right-2 flex items-center rounded-full p-1 text-neutral-400 transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:opacity-40"
        disabled={disabled}
        aria-label="Abrir calendário"
        onClick={openPicker}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path
            fill="currentColor"
            d="M7 2a1 1 0 0 0-1 1v1H5a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-1V3a1 1 0 1 0-2 0v1H9V3a1 1 0 0 0-1-1ZM5 9h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z"
          />
        </svg>
      </button>

      <input
        ref={nativeInputRef}
        type="date"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        tabIndex={-1}
        aria-hidden="true"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={handleNativeInput}
      />
    </div>
  );
}
