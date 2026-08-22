"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowPathIcon, CheckBadgeIcon, ShieldCheckIcon, UsersIcon } from "@heroicons/react/24/outline";

import { useApi } from "@/lib/api/client";
import { formatCPF } from "@/lib/utils/cpf";
import { formatCurrency, formatDate } from "@/lib/utils/format";

type InsuranceEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  insuranceEnabled: boolean;
  insuranceRequired: boolean;
  insuranceDailyCents: number;
  insuranceDays: number;
  totalRegistrations: number;
  insuredRegistrations: number;
  insuranceRevenueCents: number;
};

type InsuredRegistration = {
  id: string;
  fullName: string;
  cpf: string;
  status: string;
  insuranceSelected: boolean;
  insuranceDailyCents: number;
  insuranceDays: number;
  insuranceAmountCents: number;
  insuranceWaiverAccepted: boolean;
  createdAt: string;
  event: { id: string; title: string };
  district?: { name: string } | null;
  church?: { name: string } | null;
};

type InsuranceResponse = {
  summary: { totalRegistrations: number; insuredRegistrations: number; waivedRegistrations: number; insuranceRevenueCents: number };
  events: InsuranceEvent[];
  registrations: InsuredRegistration[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
};

const emptyData: InsuranceResponse = {
  summary: { totalRegistrations: 0, insuredRegistrations: 0, waivedRegistrations: 0, insuranceRevenueCents: 0 },
  events: [],
  registrations: [],
  pagination: { page: 1, pageSize: 25, total: 0, pages: 1 }
};

export function InsuranceAdminClient() {
  const { api } = useApi();
  const [data, setData] = useState<InsuranceResponse>(emptyData);
  const [eventId, setEventId] = useState("");
  const [coverage, setCoverage] = useState<"all" | "insured" | "waived">("insured");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedEvent = useMemo(() => data.events.find((item) => item.id === eventId) ?? null, [data.events, eventId]);
  const [enabled, setEnabled] = useState(false);
  const [required, setRequired] = useState(false);
  const [dailyValue, setDailyValue] = useState("0,00");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<InsuranceResponse>("/admin/insurance", {
        params: { eventId: eventId || undefined, coverage, search: appliedSearch || undefined, page, pageSize: 25 }
      });
      setData(response.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? "Não foi possível carregar o módulo de seguros.");
    } finally {
      setLoading(false);
    }
  }, [api, appliedSearch, coverage, eventId, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selectedEvent) return;
    setEnabled(selectedEvent.insuranceEnabled);
    setRequired(selectedEvent.insuranceRequired);
    setDailyValue((selectedEvent.insuranceDailyCents / 100).toFixed(2).replace(".", ","));
  }, [selectedEvent]);

  const saveConfiguration = async () => {
    if (!selectedEvent) return;
    const parsed = Number(dailyValue.replace(/\./g, "").replace(",", "."));
    const insuranceDailyCents = Math.round(parsed * 100);
    if ((enabled || required) && (!Number.isFinite(insuranceDailyCents) || insuranceDailyCents <= 0)) {
      setError("Informe um valor diário maior que zero.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/events/${selectedEvent.id}`, {
        insuranceEnabled: enabled || required,
        insuranceRequired: required,
        insuranceDailyCents: enabled || required ? insuranceDailyCents : 0
      });
      setMessage("Configuração do seguro atualizada.");
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? "Não foi possível salvar a configuração.");
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { label: "Inscrições no filtro", value: String(data.summary.totalRegistrations), icon: UsersIcon },
    { label: "Participantes segurados", value: String(data.summary.insuredRegistrations), icon: ShieldCheckIcon },
    { label: "Termos de recusa", value: String(data.summary.waivedRegistrations), icon: CheckBadgeIcon },
    { label: "Total em seguros", value: formatCurrency(data.summary.insuranceRevenueCents), icon: ShieldCheckIcon }
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <header className="border border-slate-200 bg-white px-5 py-6 dark:border-slate-800 dark:bg-slate-950 sm:px-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Proteção dos participantes</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">Seguros dos eventos</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Configure o valor diário e acompanhe quem está assegurado ou recusou a cobertura.</p>
          </div>
          <button type="button" className="btn-outline w-full justify-center lg:w-auto" onClick={() => void load()} disabled={loading}>
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <div key={card.label} className="admin-module-card p-5"><span className="admin-module-card__icon"><card.icon className="h-5 w-5" /></span><p className="admin-module-card__label mt-4 text-xs font-bold uppercase tracking-wider">{card.label}</p><strong className="admin-module-card__value mt-1 block text-2xl">{card.value}</strong></div>)}
      </div>

      <section className="grid gap-6 border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)] sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Configuração por evento</h2>
          <p className="mt-1 text-sm text-slate-500">O período é calculado incluindo o primeiro e o último dia do evento.</p>
          <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Evento</label>
          <select className="mt-2 h-11 w-full border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={eventId} onChange={(inputEvent) => { setEventId(inputEvent.target.value); setPage(1); }}>
            <option value="">Selecione um evento</option>
            {data.events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          {selectedEvent ? <p className="mt-2 text-xs text-slate-500">{formatDate(selectedEvent.startDate)} a {formatDate(selectedEvent.endDate)} · {selectedEvent.insuranceDays} dia{selectedEvent.insuranceDays > 1 ? "s" : ""}</p> : null}
        </div>
        <div className="border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <label className="flex items-center justify-between gap-4 py-2 text-sm font-semibold"><span>Oferecer seguro</span><input type="checkbox" checked={enabled} disabled={!selectedEvent} onChange={(e) => { setEnabled(e.target.checked); if (!e.target.checked) setRequired(false); }} /></label>
          <label className="flex items-center justify-between gap-4 border-t border-slate-200 py-3 text-sm font-semibold dark:border-slate-800"><span>Tornar obrigatório</span><input type="checkbox" checked={required} disabled={!selectedEvent || !enabled} onChange={(e) => setRequired(e.target.checked)} /></label>
          <label className="block border-t border-slate-200 pt-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:text-slate-300">Valor por dia (R$)<input className="mt-2 h-11 w-full border border-slate-300 bg-white px-3 text-base font-semibold dark:border-slate-700 dark:bg-slate-950" inputMode="decimal" value={dailyValue} disabled={!selectedEvent || !enabled} onChange={(e) => setDailyValue(e.target.value)} /></label>
          <button type="button" className="btn-primary mt-4 w-full justify-center" disabled={!selectedEvent || saving} onClick={saveConfiguration}>{saving ? "Salvando..." : "Salvar configuração"}</button>
        </div>
      </section>

      {message ? <p className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{message}</p> : null}
      {error ? <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}

      <section className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 border-b border-slate-200 p-5 dark:border-slate-800 md:grid-cols-[1fr_220px_auto]">
          <input className="h-11 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Buscar por nome ou CPF" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); setAppliedSearch(search.trim()); } }} />
          <select className="h-11 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={coverage} onChange={(e) => { setCoverage(e.target.value as typeof coverage); setPage(1); }}><option value="insured">Segurados</option><option value="waived">Recusaram</option><option value="all">Todos</option></select>
          <button type="button" className="btn-primary justify-center" onClick={() => { setPage(1); setAppliedSearch(search.trim()); }}>Aplicar filtros</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60"><tr><th className="px-5 py-3">Participante</th><th className="px-5 py-3">Evento</th><th className="px-5 py-3">Local</th><th className="px-5 py-3">Cobertura</th><th className="px-5 py-3 text-right">Valor</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.registrations.map((registration) => {
                const coverageActive = registration.status === "PAID" || registration.status === "CHECKED_IN";
                return <tr key={registration.id}><td className="px-5 py-4"><strong className="block text-slate-900 dark:text-white">{registration.fullName}</strong><span className="text-xs text-slate-500">{formatCPF(registration.cpf)}</span></td><td className="px-5 py-4 text-slate-600 dark:text-slate-300">{registration.event.title}</td><td className="px-5 py-4 text-xs text-slate-500">{registration.district?.name ?? "—"}<br />{registration.church?.name ?? "—"}</td><td className="px-5 py-4">{registration.insuranceSelected ? <span className={`border px-2 py-1 text-xs font-bold ${coverageActive ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"}`}>{coverageActive ? "Segurado" : "Aguardando pagamento"} · {registration.insuranceDays} dias</span> : <span className="border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Termo aceito</span>}</td><td className="px-5 py-4 text-right font-semibold">{formatCurrency(registration.insuranceAmountCents)}</td></tr>;
              })}
              {!loading && data.registrations.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Nenhum participante encontrado para este filtro.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><span className="text-slate-500">{data.pagination.total} registro{data.pagination.total === 1 ? "" : "s"}</span><div className="flex gap-2"><button className="btn-outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span className="grid min-w-11 place-items-center border border-slate-200 px-3 dark:border-slate-800">{page} / {data.pagination.pages}</span><button className="btn-outline" disabled={page >= data.pagination.pages} onClick={() => setPage((value) => value + 1)}>Próxima</button></div></footer>
      </section>
    </div>
  );
}
