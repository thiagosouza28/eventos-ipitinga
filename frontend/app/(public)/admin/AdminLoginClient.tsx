"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";

import { useAuthStore } from "@/lib/stores/auth";

const REMEMBER_ME_KEY = "catre-remember-me";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_ME_KEY);
    if (!remembered) return;
    try {
      const data = JSON.parse(remembered);
      setIdentifier(data.identifier || data.email || "");
      setRememberMe(Boolean(data.identifier || data.email));
      // Remove senhas salvas por versões anteriores.
      if (data.password) {
        localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ identifier: data.identifier || data.email || "" }));
      }
    } catch {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) redirectAuthenticated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated]);

  const redirectAuthenticated = () => {
    if (auth.user?.mustChangePassword) {
      router.replace("/admin/alterar-senha");
      return;
    }
    router.replace(searchParams.get("redirect") ?? "/admin/dashboard");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setErrorMessage("");
      setLoading(true);
      await auth.signIn(identifier, password);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ identifier }));
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
      redirectAuthenticated();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message ?? "Não foi possível entrar. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[color:var(--border-card)] bg-[color:var(--surface-card)] shadow-[var(--card-shadow-strong)] lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-[var(--hero-gradient)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[48px] border-white/5" />
        <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-yellow-300/10" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em]">
            <ShieldCheckIcon className="h-4 w-4 text-yellow-300" />
            Área restrita
          </div>
          <h1 className="mt-7 max-w-sm text-4xl font-black tracking-[-0.05em] text-white">Gestão de eventos, do começo ao check-in.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/80">Acompanhe inscrições, pagamentos, relatórios e participantes com segurança e clareza.</p>
        </div>

        <div className="relative space-y-3 text-sm text-emerald-50/90">
          {["Permissões por perfil", "Indicadores em tempo real", "Operação integrada"].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <CheckCircleIcon className="h-5 w-5 text-yellow-300" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </aside>

      <section className="p-6 sm:p-10 lg:p-12">
        <div className="mx-auto max-w-md">
          <div className="mb-8 flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-primary-100 bg-white p-2 shadow-sm dark:border-primary-900 dark:bg-white">
              <Image src="/branding/campal-identidade.webp" alt="Campal Identidade Missionária" width={384} height={317} className="h-auto w-full" priority />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-300">CATRE Ipitinga</p>
              <h2 className="mt-1 text-2xl font-black">Bem-vindo de volta</h2>
            </div>
          </div>

          <p className="mb-7 text-sm leading-6 text-[color:var(--text-muted)]">Use suas credenciais para acessar o painel administrativo.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-2 block text-sm font-bold text-[color:var(--text-base)]">CPF ou e-mail</label>
              <input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                type="text"
                autoComplete="username"
                required
                disabled={loading}
                placeholder="000.000.000-00 ou e-mail@dominio.com"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label htmlFor="password" className="text-sm font-bold text-[color:var(--text-base)]">Senha</label>
                <Link className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-300" href="/admin/esqueci-senha">Esqueci minha senha</Link>
              </div>
              <div className="relative">
                <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <input
                  id="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="pl-11 pr-11"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-card-alt)] hover:text-primary-600"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[color:var(--text-muted)]">
              <input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" disabled={loading} className="h-4 w-4 rounded border-neutral-300" />
              Lembrar meu CPF ou e-mail neste dispositivo
            </label>

            {errorMessage ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-200" role="alert">{errorMessage}</p>
            ) : null}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <span className="theme-inline-spinner h-4 w-4 animate-spin rounded-full border-2" /> : null}
              <span>{loading ? "Entrando..." : "Entrar no painel"}</span>
              {!loading ? <ArrowRightIcon className="h-4 w-4" /> : null}
            </button>
          </form>

          <p className="mt-7 text-center text-xs leading-5 text-[color:var(--text-muted)]">Acesso exclusivo para equipes autorizadas. Em caso de dificuldade, procure o administrador do sistema.</p>
        </div>
      </section>
    </div>
  );
}
