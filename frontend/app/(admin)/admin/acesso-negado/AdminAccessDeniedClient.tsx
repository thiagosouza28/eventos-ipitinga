"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";

import { BaseCard } from "@/components/ui/BaseCard";
import { permissionModules } from "@/lib/config/permission-schema";
import { useAuthStore } from "@/lib/stores/auth";

export default function AdminAccessDeniedPage() {
  const searchParams = useSearchParams();
  const auth = useAuthStore();

  const moduleKey = searchParams.get("module");
  const moduleLabel =
    moduleKey ? permissionModules.find((module) => module.key === moduleKey)?.label ?? moduleKey : null;

  return (
    <div className="mx-auto max-w-3xl">
      <BaseCard>
        <div className="space-y-4 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-300">
            <ShieldExclamationIcon className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Acesso negado</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Você não possui permissão para acessar este módulo ou ação. Entre em contato com o Administrador Geral para
            solicitar acesso.
          </p>
          {moduleLabel ? (
            <div className="text-xs uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
              Módulo solicitado: <span className="font-semibold text-neutral-600 dark:text-neutral-200">{moduleLabel}</span>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {auth.hasPermission("dashboard", "view") ? (
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-200"
                href="/admin/dashboard"
              >
                Voltar ao painel
              </Link>
            ) : null}
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
              href="/admin"
            >
              Trocar usuário
            </Link>
          </div>
        </div>
      </BaseCard>
    </div>
  );
}
