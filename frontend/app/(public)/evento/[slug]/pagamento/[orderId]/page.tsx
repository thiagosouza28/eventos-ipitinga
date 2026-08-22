"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { BaseCard } from "@/components/ui/BaseCard";
import { useEventStore } from "@/lib/stores/event";
import { paymentMethodLabel } from "@/lib/config/payment-methods";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { createPreviewSession } from "@/lib/utils/documentPreview";
import { resolveReceiptFileUrl, resolveReceiptImageUrl } from "@/lib/utils/receiptUrl";

type PaymentReceiptLink = {
  registrationId: string;
  fullName: string;
  receiptUrl: string;
  resolvedUrl?: string;
};

type PaymentResponse = {
  preferenceId?: string;
  initPoint?: string;
  pixQrData?: {
    qr_code: string;
    qr_code_base64: string;
  };
  status?: string;
  statusDetail?: string;
  participantCount?: number;
  totalCents?: number;
  participants?: Array<{
    id: string;
    fullName: string;
    status: string;
  }>;
  isFree?: boolean;
  paymentMethod?: string;
  paidAt?: string | null;
  isManual?: boolean;
  receipts?: PaymentReceiptLink[];
};

const PAID_STATUSES = new Set(["PAID", "APPROVED"]);
const isPaidStatus = (status?: string | null) => (status ? PAID_STATUSES.has(status.toUpperCase()) : false);

type PaymentRouteParams = {
  slug?: string | string[];
  orderId?: string | string[];
};

const resolveParam = (value?: string | string[]) => {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
};

export default function PaymentPage() {
  const params = useParams<PaymentRouteParams>();
  const slug = resolveParam(params?.slug);
  const orderId = resolveParam(params?.orderId);
  const eventStore = useEventStore();
  const getPaymentData = useEventStore((state) => state.getPaymentData);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [statusError, setStatusError] = useState("");
  const [receiptPreviewLoading, setReceiptPreviewLoading] = useState(false);
  const [receiptPreviewError, setReceiptPreviewError] = useState("");
  const pollingRef = useRef(false);

  const isPaid = isPaidStatus(payment?.status);
  const isFreeEvent = Boolean(payment?.isFree || eventStore.event?.isFree);
  const paymentMethodName = paymentMethodLabel(payment?.paymentMethod ?? null);

  const resolveReceiptUrl = (target: string) => {
    return resolveReceiptFileUrl(target);
  };

  const receiptLinks = useMemo(
    () =>
      (payment?.receipts ?? []).map((receipt) => ({
        ...receipt,
        resolvedUrl: resolveReceiptUrl(receipt.receiptUrl)
      })),
    [payment]
  );

  const loadPayment = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true;
    if (!silent) setLoadingStatus(true);
    try {
      if (!orderId) return;
      const data = await getPaymentData(orderId, { silent });
      setPayment(data);
      setLastCheckedAt(new Date());
      setStatusError("");
    } catch {
      setStatusError("Não foi possível verificar agora. Uma nova tentativa será feita automaticamente.");
    } finally {
      if (!silent) setLoadingStatus(false);
    }
  }, [getPaymentData, orderId]);

  useEffect(() => {
    if (!slug || !orderId) return;
    if (!eventStore.event || eventStore.event.slug !== slug) {
      void eventStore.fetchEvent(slug);
    }
    void loadPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, orderId, loadPayment]);

  useEffect(() => {
    const terminalStatuses = new Set(["CANCELED", "CANCELLED", "EXPIRED", "REFUNDED"]);
    const currentStatus = payment?.status?.toUpperCase() ?? "";
    if (!orderId || !payment || isPaid || isFreeEvent || payment.isManual || terminalStatuses.has(currentStatus)) {
      return;
    }

    let active = true;
    const poll = async () => {
      if (!active || pollingRef.current || document.visibilityState === "hidden") return;
      pollingRef.current = true;
      try {
        await loadPayment({ silent: true });
      } finally {
        pollingRef.current = false;
      }
    };
    const handleFocus = () => void poll();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void poll();
    };
    const timer = window.setInterval(() => void poll(), 5000);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isFreeEvent, isPaid, loadPayment, orderId, payment?.isManual, payment?.status]);

  const totalFormatted = useMemo(() => {
    if (isFreeEvent) return "Gratuito";
    if (payment?.totalCents != null) return formatCurrency(payment.totalCents);
    return formatCurrency(eventStore.event?.currentPriceCents ?? 0);
  }, [isFreeEvent, payment, eventStore.event?.currentPriceCents]);

  const statusTitle = useMemo(() => {
    if (isFreeEvent) return "Inscrições confirmadas";
    if (payment?.isManual) return isPaid ? "Pagamento registrado" : "Pagamento pendente de confirmação";
    if (isPaid) return "Pagamento aprovado";
    if (payment?.status === "CANCELED") return "Pagamento cancelado";
    return "Aguardando confirmação";
  }, [isFreeEvent, payment, isPaid]);

  const handleOpenCheckout = () => {
    if (!payment?.initPoint) return;
    window.open(payment.initPoint, "_blank", "noopener,noreferrer");
  };

  const copyPixCode = async () => {
    if (!payment?.pixQrData?.qr_code) return;
    await navigator.clipboard.writeText(payment.pixQrData.qr_code);
    alert("Código Pix copiado!");
  };

  const handleOpenAllReceipts = async () => {
    if (!receiptLinks.length) return;
    setReceiptPreviewError("");
    setReceiptPreviewLoading(true);
    try {
      const documents = receiptLinks.map((receipt, index) => ({
        id: receipt.registrationId,
        title: receipt.fullName || `Participante ${index + 1}`,
        fileName: `comprovante-${receipt.registrationId}.pdf`,
        sourceUrl: receipt.resolvedUrl ?? receipt.receiptUrl,
        imageSourceUrl: resolveReceiptImageUrl(receipt.resolvedUrl ?? receipt.receiptUrl),
        mimeType: "application/pdf"
      }));
      await createPreviewSession(documents, {
        context: `Comprovantes do pedido ${orderId}`,
        defaultIndex: 0
      });
    } catch (error: any) {
      setReceiptPreviewError(error?.message ?? "Não foi possível abrir os comprovantes agora.");
    } finally {
      setReceiptPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <BaseCard>
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Pagamento do pedido</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 sm:text-base">
            {isFreeEvent
              ? "Este evento é gratuito. As inscrições foram confirmadas automaticamente e nenhum pagamento é necessário."
              : "Conclua o pagamento para garantir as inscrições. Assim que o provedor aprovar, atualizamos automaticamente."}
          </p>
        </div>
      </BaseCard>

      {payment ? (
        <BaseCard>
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900/60 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Status</p>
                  <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{statusTitle}</p>
                  {payment.statusDetail ? (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      Detalhe do provedor: {payment.statusDetail}
                    </p>
                  ) : null}
                  {!isPaid && !isFreeEvent && !payment.isManual ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="h-2 w-2 bg-emerald-500" aria-hidden="true" />
                      <span>Identificação automática ativa</span>
                      {lastCheckedAt ? <span>· última consulta às {lastCheckedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span> : null}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-500 disabled:text-neutral-400"
                  disabled={loadingStatus}
                  onClick={() => void loadPayment()}
                >
                  {loadingStatus ? "Verificando..." : "Verificar agora"}
                </button>
              </div>
              {statusError ? <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{statusError}</p> : null}
              <div className="mt-5 grid gap-4 text-sm text-neutral-700 dark:text-neutral-200 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">Evento</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    {eventStore.event?.title ?? "Carregando..."}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">Total</span>
                  <span className="font-medium">{totalFormatted}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">Forma de pagamento</span>
                  <span>{paymentMethodName}</span>
                </div>
                {payment.paidAt ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-neutral-500">Data do pagamento</span>
                    <span>{formatDate(payment.paidAt)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {!isFreeEvent && !isPaid ? (
              <div className="space-y-6">
                {payment.isManual ? (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
                    <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Pagamento manual</h2>
                    <p className="mt-2">
                      Forma selecionada: <strong>{paymentMethodName}</strong>. Apresente o comprovante desta inscrição para a tesouraria.
                    </p>
                  </div>
                ) : (
                  <>
                    <section className="space-y-3">
                      <header className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Pague com Pix</h2>
                        <button
                          type="button"
                          className="text-sm text-primary-600 hover:text-primary-500 disabled:text-neutral-400"
                          disabled={!payment.pixQrData}
                          onClick={copyPixCode}
                        >
                          Copiar código
                        </button>
                      </header>
                      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900/80">
                        {payment.pixQrData?.qr_code_base64 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`data:image/png;base64,${payment.pixQrData.qr_code_base64}`}
                            alt="QR Code Pix"
                            className="h-48 w-48 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700"
                          />
                        ) : (
                          <span className="text-sm text-neutral-500">Gerando QR Code do Pix...</span>
                        )}
                        {payment.pixQrData?.qr_code ? (
                          <textarea
                            className="w-full rounded-lg border border-neutral-300 bg-white p-3 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                            rows={3}
                            readOnly
                            value={payment.pixQrData.qr_code}
                          />
                        ) : null}
                      </div>
                    </section>

                    {payment.initPoint ? (
                      <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Checkout Mercado Pago</h2>
                        <button
                          type="button"
                          onClick={handleOpenCheckout}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
                        >
                          Abrir checkout
                        </button>
                      </section>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {isPaid && receiptLinks.length ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-50 sm:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold">Comprovantes disponíveis</p>
                    <p className="text-sm text-emerald-800 dark:text-emerald-100/80">
                      Visualize antes de baixar: abrimos os PDFs em nova aba.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    disabled={receiptPreviewLoading}
                    onClick={handleOpenAllReceipts}
                  >
                    {receiptPreviewLoading ? "Abrindo..." : "Visualizar todos"}
                  </button>
                </div>
                {receiptPreviewError ? <p className="mt-3 text-sm text-red-600">{receiptPreviewError}</p> : null}
              </div>
            ) : null}
          </div>
        </BaseCard>
      ) : null}

      {isPaid ? (
        <BaseCard>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Pagamento confirmado</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Os recibos são gerados automaticamente e podem ser consultados com o CPF e a data de nascimento.
            </p>
            <Link
              href="/comprovante"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Consultar comprovantes
            </Link>
          </div>
        </BaseCard>
      ) : null}
    </div>
  );
}
