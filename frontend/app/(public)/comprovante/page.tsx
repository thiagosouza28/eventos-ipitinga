"use client";

import { useState } from "react";

import { BaseCard } from "@/components/ui/BaseCard";
import { DateField } from "@/components/forms/DateField";
import { useApi } from "@/lib/api/client";
import { normalizeCPF, formatCPF } from "@/lib/utils/cpf";
import { createPreviewSession } from "@/lib/utils/documentPreview";
import { resolveReceiptFileUrl, resolveReceiptImageUrl } from "@/lib/utils/receiptUrl";

type ReceiptSummary = {
  registrationId: string;
  fullName: string;
  eventTitle: string;
  status: string;
  issuedAt: string;
  receiptUrl: string;
};

const statusLabels: Record<string, string> = {
  PAID: "Pago",
  CHECKED_IN: "Check-in realizado",
  REFUNDED: "Estornado"
};

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60";

export default function ReceiptLookupPage() {
  const { api } = useApi();
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [results, setResults] = useState<ReceiptSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [openingReceiptId, setOpeningReceiptId] = useState("");
  const [previewError, setPreviewError] = useState("");

  const hasResults = results.length > 0;
  const showResultSummary = hasResults;
  const showFeedbackCard = Boolean(errorMessage) || hasResults || (hasSearched && !loading);

  const resetFeedback = () => {
    setErrorMessage("");
    setEmptyMessage("");
    setPreviewError("");
  };

  const clearResults = () => {
    setResults([]);
    setHasSearched(false);
    setOpeningReceiptId("");
  };

  const onCpfInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(event.target.value));
    resetFeedback();
    if (results.length) {
      clearResults();
    }
  };

  const formatStatus = (status: string) => statusLabels[status] ?? status;
  const formatIssuedAt = (value: string) => new Date(value).toLocaleString("pt-BR");

  const resolveReceiptUrl = (url: string) => {
    return resolveReceiptFileUrl(url);
  };

  const openReceiptPreview = async (receipt: ReceiptSummary) => {
    setPreviewError("");
    setOpeningReceiptId(receipt.registrationId);
    try {
      await createPreviewSession(
        [
          {
            id: receipt.registrationId,
            title: receipt.eventTitle,
            fileName: `comprovante-${receipt.registrationId}.pdf`,
            sourceUrl: resolveReceiptUrl(receipt.receiptUrl),
            imageSourceUrl: resolveReceiptImageUrl(receipt.receiptUrl),
            mimeType: "application/pdf"
          }
        ],
        { context: "Comprovante de inscrição" }
      );
    } catch (error: any) {
      setPreviewError(error?.message ?? "Não foi possível abrir o comprovante agora.");
    } finally {
      setOpeningReceiptId("");
    }
  };

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = normalizeCPF(cpf);
    resetFeedback();
    clearResults();

    if (digits.length !== 11) {
      setErrorMessage("Informe um CPF válido com 11 dígitos.");
      return;
    }
    if (!birthDate) {
      setErrorMessage("Informe a data de nascimento.");
      return;
    }

    setHasSearched(true);
    setLoading(true);
    try {
      const response = await api.post("/receipts/lookup", {
        cpf: digits,
        birthDate
      });
      const payload = [...response.data].sort(
        (a: ReceiptSummary, b: ReceiptSummary) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      );
      setResults(payload);
      if (!payload.length) {
        setEmptyMessage("Nenhum comprovante encontrado para os dados informados.");
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message ?? "Não foi possível consultar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-10 lg:py-16">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <BaseCard className="border border-white/30 bg-gradient-to-br from-white/85 via-primary-50/40 to-primary-100/40 shadow-xl dark:border-white/10 dark:from-neutral-900/70 dark:via-neutral-900/40 dark:to-primary-950/30">
          <div className="flex flex-col gap-3 text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.4em] text-primary-600 dark:text-primary-300">
              Consulta rápida
            </p>
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
              Encontre comprovantes emitidos
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Informe CPF e data de nascimento do participante para acessar os recibos e baixar seus PDFs em segundos.
            </p>
          </div>
        </BaseCard>

        <BaseCard className="border border-white/40 bg-white/90 shadow-2xl shadow-primary-900/5 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <form onSubmit={search} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300">
                  CPF do participante
                </label>
                <input
                  value={cpf}
                  onChange={onCpfInput}
                  type="text"
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  className="w-full rounded-2xl border border-neutral-200/70 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/60 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300">
                  Data de nascimento
                </label>
                <DateField
                  value={birthDate}
                  onChange={setBirthDate}
                  required
                  className="w-full rounded-2xl border border-neutral-200/70 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-inner focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/60 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              {hasSearched && !loading && showResultSummary ? (
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                  {results.length} comprovante(s) listado(s)
                </span>
              ) : null}
              <button type="submit" className={`${primaryButtonClass} w-full sm:w-auto px-6 py-2`} disabled={loading}>
                {loading ? "Buscando..." : "Buscar comprovantes"}
              </button>
            </div>
          </form>
        </BaseCard>

        {showFeedbackCard ? (
          <BaseCard className="border border-white/20 bg-white/80 shadow-xl dark:border-white/10 dark:bg-neutral-900/60">
            {errorMessage ? (
              <div
                className="rounded-2xl border border-red-200/60 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
                role="alert"
              >
                {errorMessage}
              </div>
            ) : hasResults ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
                  Resultados encontrados
                </h2>
                {results.map((receipt) => (
                  <div
                    key={receipt.registrationId}
                    className="flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/80 px-4 py-3 text-sm transition hover:border-primary-200 hover:bg-primary-50/60 dark:border-white/5 dark:bg-neutral-900/60 dark:hover:border-primary-400/60 dark:hover:bg-primary-500/10 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                        {receipt.fullName || "Participante não informado"}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{receipt.eventTitle}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Status: {formatStatus(receipt.status)} - emitido em {formatIssuedAt(receipt.issuedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`${primaryButtonClass} px-5 py-2 text-xs uppercase tracking-[0.3em]`}
                      disabled={openingReceiptId === receipt.registrationId}
                      onClick={() => openReceiptPreview(receipt)}
                    >
                      {openingReceiptId === receipt.registrationId ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Abrindo...
                        </span>
                      ) : (
                        "Visualizar"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : previewError ? (
              <p className="text-sm text-red-600 dark:text-red-300">{previewError}</p>
            ) : !hasResults && hasSearched && !loading ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {emptyMessage || "Nenhum comprovante encontrado para os dados informados."}
              </p>
            ) : null}
          </BaseCard>
        ) : null}
      </div>
    </div>
  );
}
