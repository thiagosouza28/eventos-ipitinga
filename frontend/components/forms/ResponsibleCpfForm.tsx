"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatCPF, normalizeCPF, validateCPF } from "@/lib/utils/cpf";
type ResponsibleCpfFormProps = {
  value: { cpf?: string | null } | null;
  loading?: boolean;
  error?: string | null;
  onCpfChange?: (value: string) => void;
  onSubmit?: (cpfDigits: string) => void;
};

export function ResponsibleCpfForm({
  value,
  loading,
  error,
  onCpfChange,
  onSubmit
}: ResponsibleCpfFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [cpfValue, setCpfValue] = useState("");

  useEffect(() => {
    if (value?.cpf) {
      setCpfValue(formatCPF(value.cpf));
    }
  }, [value?.cpf]);

  const isValid = useMemo(() => {
    const digits = normalizeCPF(cpfValue);
    return digits.length === 11 && validateCPF(digits);
  }, [cpfValue]);

  const updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(/\D/g, "");
    const formattedValue = formatCPF(rawValue);
    setCpfValue(formattedValue);
    onCpfChange?.(formattedValue);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const digits = normalizeCPF(cpfValue);
    if (!digits || digits.length !== 11 || !validateCPF(digits)) {
      return;
    }
    onSubmit?.(digits);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="responsibleCpf" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          CPF do Responsável
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            id="responsibleCpf"
            value={cpfValue}
            onChange={updateValue}
            className={`block w-full rounded-lg border px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 ${error ? "border-red-500" : "border-neutral-300"}`}
            disabled={loading}
            placeholder="000.000.000-00"
          />
          {loading ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-b-primary-500" />
            </div>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={loading || !isValid}
      >
        Verificar CPF
      </button>
    </form>
  );
}
