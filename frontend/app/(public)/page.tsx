"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentTextIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TicketIcon
} from "@heroicons/react/24/outline";

import { BaseCard } from "@/components/ui/BaseCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useApi } from "@/lib/api/client";
import { resolveApiOrigin } from "@/lib/config/api";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Event } from "@/types/api";

const BENEFITS = [
  { icon: ShieldCheckIcon, title: "Dados protegidos", description: "Suas informações são usadas somente para organizar a participação." },
  { icon: TicketIcon, title: "Inscrição simples", description: "Um fluxo claro para cadastrar uma ou várias pessoas." },
  { icon: DocumentTextIcon, title: "Comprovante digital", description: "Consulte seus documentos a qualquer momento pelo CPF." }
];

function EventCard({ event, apiOrigin }: { event: Event; apiOrigin: string }) {
  const bannerUrl = useMemo(() => {
    if (!event.bannerUrl) return "";
    if (/^(https?:|data:|blob:)/i.test(event.bannerUrl)) return event.bannerUrl;
    const sanitized = event.bannerUrl.replace(/^\/+/, "");
    return sanitized ? `${apiOrigin.replace(/\/$/, "")}/uploads/${sanitized}` : "";
  }, [apiOrigin, event.bannerUrl]);

  const price = useMemo(() => {
    if (event.isFree) return { label: "Gratuito", pending: false };
    if (event.currentLot) return { label: formatCurrency(event.currentLot.priceCents), pending: false };
    if (event.currentPriceCents && event.currentPriceCents > 0) {
      return { label: formatCurrency(event.currentPriceCents), pending: false };
    }
    return { label: "Lote em breve", pending: true };
  }, [event]);

  return (
    <article className="event-tile group flex h-full flex-col overflow-hidden rounded-[var(--card-radius)] border border-[color:var(--border-card)] bg-[color:var(--surface-card)] shadow-[var(--card-shadow)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--card-shadow-strong)]">
      <div className="event-tile-media relative aspect-[16/8.5] overflow-hidden">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt={`Banner do evento ${event.title}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/75 text-primary-600 shadow-sm dark:bg-white/10 dark:text-primary-300">
              <CalendarDaysIcon className="h-8 w-8" aria-hidden="true" />
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <span className="rounded-full bg-[#063f26]/90 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-sm">
            {event.currentLot?.name ?? (event.isFree ? "Entrada livre" : "Inscrições")}
          </span>
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-[#006033] shadow-sm dark:bg-[#0d2017]/95 dark:text-primary-300">
            {price.label}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-[color:var(--text-base)] transition group-hover:text-primary-700 dark:group-hover:text-primary-300">
            {event.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--text-muted)]">
            {event.description || "Participe deste momento especial com a comunidade CATRE Ipitinga."}
          </p>

          <div className="mt-5 space-y-2.5 border-t border-[color:var(--border-card)] pt-4 text-sm text-[color:var(--text-muted)]">
            <div className="flex items-start gap-2.5">
              <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" />
              <span>{formatDate(event.startDate)} a {formatDate(event.endDate)}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" />
              <span>{event.location || "Local a confirmar"}</span>
            </div>
            {!price.pending && !event.isFree ? (
              <div className="flex items-start gap-2.5">
                <TicketIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" />
                <span>{price.label} por participante</span>
              </div>
            ) : null}
          </div>
        </div>

        <Link href={`/evento/${event.slug}`} className="btn-primary mt-6 w-full">
          Fazer inscrição
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function EventLandingPage() {
  const { api } = useApi();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const apiOrigin = useMemo(() => resolveApiOrigin(), []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setErrorMessage("");
      try {
        const response = await api.get<Event[]>("/events", { signal: controller.signal });
        setEvents(response.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Falha ao carregar eventos", error);
        setErrorMessage("Não foi possível carregar os eventos agora. Tente novamente em alguns instantes.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [api]);

  return (
    <div className="space-y-10 pb-4 sm:space-y-12">
      <section className="landing-hero px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <div className="relative z-10 grid items-center gap-9 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-50">
              <SparklesIcon className="h-4 w-4 text-yellow-300" />
              Encontros que fortalecem a missão
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-[3.4rem]">
              Seu próximo evento começa aqui.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-emerald-50/85 sm:text-lg">
              Inscreva participantes, acompanhe o pagamento e acesse seus comprovantes em um único lugar.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#eventos" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#006033] shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50">
                Ver eventos disponíveis
                <ArrowRightIcon className="h-4 w-4" />
              </a>
              <Link href="/comprovante" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15">
                <DocumentTextIcon className="h-5 w-5" />
                Consultar comprovante
              </Link>
            </div>
          </div>

          <div className="hidden justify-self-end lg:block">
            <div className="relative w-[310px] rounded-[26px] border border-white/20 bg-white p-7 shadow-2xl">
              <Image
                src="/branding/campal-identidade.webp"
                alt="Campal Identidade Missionária"
                width={384}
                height={317}
                priority
                className="h-auto w-full"
              />
              <div className="absolute -bottom-4 -left-5 flex items-center gap-3 rounded-2xl border border-white/20 bg-[#063f26] px-4 py-3 text-white shadow-xl">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-yellow-400 text-[#123525]">
                  <CheckBadgeIcon className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold leading-tight">Inscrição rápida<br />e segura</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="eventos" className="scroll-mt-28">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300">
              Agenda CATRE
            </p>
            <h2 className="mt-2 text-2xl font-black text-[color:var(--text-base)] sm:text-3xl">Eventos disponíveis</h2>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Escolha um evento e conclua sua inscrição em poucos passos.</p>
          </div>
          {!loading && !errorMessage ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--border-card)] bg-[color:var(--surface-card)] px-3 py-1.5 text-xs font-bold text-[color:var(--text-muted)]">
              <ClockIcon className="h-4 w-4 text-primary-600 dark:text-primary-300" />
              {events.length} {events.length === 1 ? "evento aberto" : "eventos abertos"}
            </span>
          ) : null}
        </div>

        {loading ? (
          <BaseCard className="grid min-h-56 place-items-center"><LoadingSpinner /></BaseCard>
        ) : errorMessage ? (
          <BaseCard className="border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20">
            <div className="flex flex-col items-center py-8 text-center">
              <ShieldCheckIcon className="h-9 w-9 text-red-500" />
              <p className="mt-3 max-w-md text-sm text-red-700 dark:text-red-200">{errorMessage}</p>
            </div>
          </BaseCard>
        ) : events.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => <EventCard key={event.id} event={event} apiOrigin={apiOrigin} />)}
          </div>
        ) : (
          <BaseCard className="grid min-h-56 place-items-center text-center">
            <div>
              <CalendarDaysIcon className="mx-auto h-10 w-10 text-primary-500" />
              <h3 className="mt-4 text-lg font-bold">Novos eventos em breve</h3>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">A programação está sendo preparada. Volte para conferir as novidades.</p>
            </div>
          </BaseCard>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex gap-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{description}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
