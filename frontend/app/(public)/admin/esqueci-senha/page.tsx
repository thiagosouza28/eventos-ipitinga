"use client";

import { useState } from "react";
import Link from "next/link";

import { BaseCard } from "@/components/ui/BaseCard";
import { useAuthStore } from "@/lib/stores/auth";

export default function AdminForgotPasswordPage() {
  const auth = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setErrorMessage("");
      setSuccessMessage("");
      setLoading(true);
      await auth.requestPasswordReset(identifier);
      setSuccessMessage(
        "Se o usuário existir receberá um e-mail com a nova senha temporária. Verifique sua caixa de entrada e spam."
      );
      setIdentifier("");
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message ??
          "Não foi possível enviar a senha temporária. Tente novamente em instantes."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <BaseCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Recuperar senha</h1>
            <p className="text-sm text-neutral-500">
              Informe seu CPF ou e-mail cadastrado e enviaremos uma senha temporária para o seu e-mail.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              CPF ou e-mail
            </label>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              type="text"
              required
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-50"
              placeholder="000.000.000-00 ou e-mail@dominio.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : null}
            <span>{loading ? "Enviando..." : "Enviar senha temporária"}</span>
          </button>
          <Link className="block text-center text-sm text-primary-600 transition hover:text-primary-500" href="/admin">
            Voltar para o login
          </Link>
          {successMessage ? <p className="text-sm text-green-500">{successMessage}</p> : null}
          {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
        </form>
      </BaseCard>
    </div>
  );
}
