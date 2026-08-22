"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BaseCard } from "@/components/ui/BaseCard";
import { useAuthStore } from "@/lib/stores/auth";

export default function AdminForcePasswordPage() {
  const auth = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.replace(`/admin?redirect=${encodeURIComponent(window.location.pathname)}`);
    } else if (!auth.user?.mustChangePassword) {
      const redirect = searchParams.get("redirect");
      router.replace(redirect ?? "/admin/dashboard");
    }
  }, [auth.isAuthenticated, auth.user?.mustChangePassword, router, searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage("A confirmação da senha não confere.");
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");
      setLoading(true);
      await auth.changePassword(currentPassword, newPassword);
      setSuccessMessage("Senha atualizada com sucesso! Você será redirecionado.");
      setTimeout(() => {
        const redirect = searchParams.get("redirect");
        router.replace(redirect ?? "/admin/dashboard");
      }, 1500);
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message ??
          "Não foi possível atualizar a senha. Verifique os dados informados."
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
            <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Segurança</p>
            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Defina uma nova senha</h1>
            <p className="text-sm text-neutral-500">
              Você acessou com uma senha temporária. Crie uma nova senha para continuar usando o sistema.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Senha temporária
              </label>
              <input
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                required
                disabled={loading}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-50"
                placeholder="Digite a senha recebida por e-mail"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Nova senha
              </label>
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                minLength={8}
                required
                disabled={loading}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-50"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Confirmar nova senha
              </label>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                minLength={8}
                required
                disabled={loading}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-50"
              />
            </div>
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
            <span>{loading ? "Atualizando..." : "Atualizar senha"}</span>
          </button>
          {successMessage ? <p className="text-sm text-green-500">{successMessage}</p> : null}
          {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
        </form>
      </BaseCard>
    </div>
  );
}
