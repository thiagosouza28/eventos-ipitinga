import { Moon, User2 } from "lucide-react";

export const TopBar = () => (
  <header className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-sm font-semibold text-[color:var(--primary)]">
        CI
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">CATRE Ipitiga</p>
        <p className="text-xs text-[color:var(--text-muted)]">Inscri\u00e7\u00e3o Online</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
        aria-label="Alternar modo noturno"
      >
        <Moon size={18} />
      </button>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
        aria-label="Conta"
      >
        <User2 size={18} />
      </button>
    </div>
  </header>
);
