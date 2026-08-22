import Link from "next/link";

import { BaseCard } from "@/components/ui/BaseCard";

export default function AdminPlaceholderPage() {
  return (
    <BaseCard>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Painel administrativo</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          O painel administrativo esta sendo migrado para o novo sistema. Algumas rotas ainda não estáo disponíveis.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin" className="btn-primary">
            Voltar ao login
          </Link>
          <Link href="/" className="btn-muted">
            Voltar ao site
          </Link>
        </div>
      </div>
    </BaseCard>
  );
}
