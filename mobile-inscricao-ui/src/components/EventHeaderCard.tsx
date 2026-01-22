import { CalendarDays, MapPin } from "lucide-react";
import { Card } from "./ui/Card";

export const EventHeaderCard = () => (
  <Card className="bg-white">
    <div className="flex items-start justify-between gap-4">
      <span className="rounded-full bg-[color:var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--primary)]">
        LOTE 3
      </span>
      <div className="text-right">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          INVESTIMENTO
        </p>
        <p className="text-2xl font-bold text-[color:var(--primary)]">R$ 30,00</p>
      </div>
    </div>

    <div className="mt-4">
      <h2 className="text-xl font-bold text-slate-900">Retiro Espiritual 2026</h2>
      <p className="text-sm text-[color:var(--text-muted)]">Distrito de Ipitiga</p>
    </div>

    <div className="mt-4 grid gap-2 text-sm text-slate-600">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-[color:var(--primary)]" />
        <span>CATRE Ipitiga</span>
      </div>
      <div className="flex items-center gap-2">
        <CalendarDays size={16} className="text-[color:var(--primary)]" />
        <span>13 - 17 Fev 2026</span>
      </div>
    </div>
  </Card>
);
