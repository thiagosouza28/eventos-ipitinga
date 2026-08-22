"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BaseCard } from "@/components/ui/BaseCard";
import { useApi } from "@/lib/api/client";

type CheckinStatus = "READY" | "CONFIRMED" | "ALREADY_CONFIRMED";

type CheckinRegistration = {
  id: string;
  fullName: string;
  eventTitle: string;
  eventLocation: string;
  eventPeriod: string;
  districtName: string;
  churchName: string;
  checkinAt: string | null;
};

type CheckinResponse = {
  status: CheckinStatus;
  registration: CheckinRegistration;
};

export default function CheckinValidatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { api } = useApi();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [ridParam, setRidParam] = useState("");
  const [sigParam, setSigParam] = useState("");
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const statusBadge = useMemo(() => {
    if (!result) {
      return { text: "", className: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200" };
    }
    if (result.status === "CONFIRMED") {
      return {
        text: "Presença confirmada!",
        className: "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-100"
      };
    }
    if (result.status === "READY") {
      return {
        text: "Pagamento confirmado. Solicite a senha para registrar presença.",
        className: "bg-primary-200 text-primary-900 dark:bg-primary-500/30 dark:text-primary-50"
      };
    }
    return {
      text: "Presença já havia sido confirmada",
      className: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
    };
  }, [result]);

  const formatCheckin = (value: string) =>
    new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

  const goToHome = () => {
    router.push("/");
  };

  const validateLink = async () => {
    setLoading(true);
    setErrorMessage("");
    setResult(null);
    const rid = searchParams.get("rid");
    const sig = searchParams.get("sig");

    if (!rid || !sig) {
      setErrorMessage("Link de check-in inválido. Escaneie novamente o QR Code do comprovante.");
      setLoading(false);
      return;
    }

    try {
      setRidParam(rid);
      setSigParam(sig);
      const response = await api.get<CheckinResponse>("/checkin/validate", { params: { rid, sig } });
      setResult(response.data);
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message ??
          "Não foi possível validar o check-in. Procure a equipe de recepção."
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmPresence = async () => {
    if (!result || result.status !== "READY") return;
    setConfirmError("");
    setConfirming(true);
    try {
      const response = await api.post<CheckinResponse>("/checkin/confirm", {
        rid: ridParam,
        sig: sigParam,
        password
      });
      setResult(response.data);
      setPassword("");
    } catch (error: any) {
      setConfirmError(
        error?.response?.data?.message ?? "Não foi possível confirmar o check-in. Verifique a senha."
      );
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    void validateLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="w-full max-w-xl space-y-6 py-8 lg:py-12">
        <BaseCard className="w-full">
          <div className="space-y-5 text-center">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
                Confirmação de presença
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Validamos o link gerado no comprovante para registrar a sua chegada ao evento.
              </p>
            </div>
            {loading ? (
              <div className="py-8 text-sm text-neutral-500 dark:text-neutral-400">
                Validando link de check-in...
              </div>
            ) : errorMessage ? (
              <div className="rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                {errorMessage}
              </div>
            ) : result ? (
              <div className="space-y-6">
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusBadge.className}`}>
                  <span>{statusBadge.text}</span>
                </div>
                <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <p className="text-base font-semibold text-neutral-800 dark:text-neutral-50">
                    {result.registration.fullName}
                  </p>
                  <p>
                    Evento:{" "}
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">
                      {result.registration.eventTitle}
                    </span>
                  </p>
                  <p>Local: {result.registration.eventLocation}</p>
                  <p>Período: {result.registration.eventPeriod}</p>
                  <p>
                    Igreja/Distrito: {result.registration.churchName} - {result.registration.districtName}
                  </p>
                  {result.registration.checkinAt ? (
                    <p>Check-in registrado em: {formatCheckin(result.registration.checkinAt)}</p>
                  ) : null}
                </div>
                {result.status === "READY" ? (
                  <div className="space-y-3 text-left">
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      Informe a senha da equipe
                    </label>
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                      placeholder="Senha do check-in"
                    />
                    {confirmError ? <p className="text-sm text-red-500 dark:text-red-300">{confirmError}</p> : null}
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
                      disabled={confirming || !password.trim()}
                      onClick={confirmPresence}
                    >
                      {confirming ? "Confirmando..." : "Confirmar presença"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
                    onClick={goToHome}
                  >
                    Ir para página inicial
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </BaseCard>

        <BaseCard className="w-full text-sm text-neutral-500 dark:text-neutral-400">
          <p>
            Este link funciona apenas uma vez e deve ser apresentado pela equipe de recepção. Se houver qualquer
            divergência, procure imediatamente a equipe de organização do evento.
          </p>
        </BaseCard>
      </div>
    </div>
  );
}
