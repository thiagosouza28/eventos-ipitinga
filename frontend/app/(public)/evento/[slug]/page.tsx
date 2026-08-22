"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarDaysIcon, MapPinIcon, PhotoIcon, TicketIcon } from "@heroicons/react/24/outline";

import { BaseCard } from "@/components/ui/BaseCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ResponsibleCpfForm } from "@/components/forms/ResponsibleCpfForm";
import { DateField } from "@/components/forms/DateField";
import { EventNoticeModal } from "@/components/forms/EventNoticeModal";
import { useEventStore } from "@/lib/stores/event";
import { useCatalogStore } from "@/lib/stores/catalog";
import { resolveApiOrigin } from "@/lib/config/api";
import { ADMIN_ONLY_PAYMENT_METHODS, PAYMENT_METHODS } from "@/lib/config/payment-methods";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { formatCPF, normalizeCPF, validateCPF } from "@/lib/utils/cpf";
import { applyInputMask, maskInputProps, resolveInputMask } from "@/lib/utils/input-masks";
import type { ChurchDirectorMatch, Event, EventFormField, PaymentMethod } from "@/types/api";

const SYSTEM_FIELD_IDS = new Set(["cpf", "fullName", "birthDate", "gender", "districtId", "churchId"]);

type RouteParams = {
  slug?: string | string[];
};

type RegistrationStep = "IDENTIFICATION" | "PENDING" | "PARTICIPANTS" | "PAYMENT";

type PersonDraft = {
  id: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  gender: string;
  districtId: string;
  churchId: string;
  formResponses: Record<string, unknown>;
};

const createId = () => Math.random().toString(36).slice(2, 10);

const resolveSlug = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? "" : value ?? "");

const genderOptions = [
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Feminino" },
  { value: "OTHER", label: "Outro" }
];

const isEmptyValue = (value: unknown) => value === undefined || value === null || value === "";

export default function EventRegistrationPage() {
  const params = useParams<RouteParams>();
  const slug = resolveSlug(params?.slug);
  const router = useRouter();

  const event = useEventStore((state) => state.event);
  const pendingOrders = useEventStore((state) => state.pendingOrders);
  const loading = useEventStore((state) => state.loading);
  const fetchEvent = useEventStore((state) => state.fetchEvent);
  const checkPendingOrder = useEventStore((state) => state.checkPendingOrder);
  const createBatchOrder = useEventStore((state) => state.createBatchOrder);

  const districts = useCatalogStore((state) => state.districts);
  const churches = useCatalogStore((state) => state.churches);
  const loadDistricts = useCatalogStore((state) => state.loadDistricts);
  const loadChurches = useCatalogStore((state) => state.loadChurches);

  const [buyerCpf, setBuyerCpf] = useState("");
  const [cpfChecked, setCpfChecked] = useState(false);
  const [cpfError, setCpfError] = useState("");
  const [cpfLoading, setCpfLoading] = useState(false);
  const [forceNewRegistration, setForceNewRegistration] = useState(false);
  const [suggestedChurch, setSuggestedChurch] = useState<ChurchDirectorMatch | null>(null);

  const [people, setPeople] = useState<PersonDraft[]>(() => [
    {
      id: createId(),
      fullName: "",
      cpf: "",
      birthDate: "",
      gender: "",
      districtId: "",
      churchId: "",
      formResponses: {}
    }
  ]);
  const [personErrors, setPersonErrors] = useState<Array<Record<string, string>>>([]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>("IDENTIFICATION");
  const [insuranceSelected, setInsuranceSelected] = useState(false);
  const [insuranceWaiverAccepted, setInsuranceWaiverAccepted] = useState(false);

  const apiOrigin = useMemo(() => resolveApiOrigin(), []);

  const customFields = useMemo(
    () => (event?.formConfig?.campos ?? []).filter((field) => !SYSTEM_FIELD_IDS.has(field.id)),
    [event?.formConfig?.campos]
  );

  const availablePaymentMethods = useMemo(() => {
    const allowed = event?.paymentMethods?.length
      ? event.paymentMethods
      : PAYMENT_METHODS.map((method) => method.value);
    return PAYMENT_METHODS.filter(
      (method) =>
        allowed.includes(method.value as PaymentMethod) &&
        !ADMIN_ONLY_PAYMENT_METHODS.includes(method.value as PaymentMethod)
    );
  }, [event?.paymentMethods]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX_MP");

  useEffect(() => {
    if (!availablePaymentMethods.length) return;
    const fallback = availablePaymentMethods[0]?.value as PaymentMethod;
    setPaymentMethod((current) =>
      availablePaymentMethods.some((method) => method.value === current) ? current : fallback
    );
  }, [availablePaymentMethods]);

  const resolveBannerUrl = (value?: string | null) => {
    if (!value) return "";
    if (/^(data:|blob:)/i.test(value)) return value;
    try {
      const parsed = new URL(value, apiOrigin || window.location.origin);
      if (parsed.pathname.startsWith("/uploads/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
      if (/^https?:/i.test(parsed.protocol)) return parsed.toString();
    } catch {
      // Fall through to the local upload path for legacy values.
    }
    const sanitized = value.replace(/^\/+/, "");
    if (!sanitized) return "";
    return sanitized.startsWith("uploads/") ? `/${sanitized}` : `/uploads/${sanitized}`;
  };

  const priceInfo = (currentEvent: Event) => {
    if (currentEvent.isFree) {
      return { label: "Gratuito", pending: false };
    }
    if (currentEvent.currentLot) {
      return { label: formatCurrency(currentEvent.currentLot.priceCents), pending: false };
    }
    if (currentEvent.currentPriceCents && currentEvent.currentPriceCents > 0) {
      return { label: formatCurrency(currentEvent.currentPriceCents), pending: false };
    }
    return { label: "Aguardando liberação do lote", pending: true };
  };

  useEffect(() => {
    if (!slug) return;
    void fetchEvent(slug);
  }, [fetchEvent, slug]);

  useEffect(() => {
    void loadDistricts();
    void loadChurches();
  }, [loadDistricts, loadChurches]);

  useEffect(() => {
    if (!event) return;
    setPeople((current) => {
      if (!current.length) {
        return [
          {
            id: createId(),
            fullName: "",
            cpf: "",
            birthDate: "",
            gender: "",
            districtId: event.districtId ?? "",
            churchId: event.churchId ?? "",
            formResponses: {}
          }
        ];
      }
      return current.map((person, index) =>
        index === 0 && !person.districtId
          ? { ...person, districtId: event.districtId ?? person.districtId }
          : person
      );
    });
  }, [event?.districtId, event?.churchId, event?.id]);

  useEffect(() => {
    if (!suggestedChurch) return;
    setPeople((current) =>
      current.map((person, index) =>
        index === 0
          ? {
              ...person,
              districtId: suggestedChurch.districtId ?? person.districtId,
              churchId: suggestedChurch.churchId ?? person.churchId
            }
          : person
      )
    );
  }, [suggestedChurch]);

  useEffect(() => {
    if (!event?.notice?.enabled) {
      setNoticeAccepted(true);
      return;
    }
    if (!slug) return;
    if (typeof window === "undefined") return;
    const storageKey = `event-notice-${slug}`;
    if (event.notice.showOnce) {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "true") {
        setNoticeAccepted(true);
        return;
      }
    }
    setNoticeOpen(true);
  }, [event?.notice?.enabled, event?.notice?.showOnce, event?.id, slug]);

  useEffect(() => {
    setBannerFailed(false);
  }, [event?.bannerUrl, event?.id]);

  useEffect(() => {
    if (!event?.insuranceEnabled) {
      setInsuranceSelected(false);
      setInsuranceWaiverAccepted(false);
      return;
    }
    setInsuranceSelected(true);
    setInsuranceWaiverAccepted(false);
  }, [event?.id, event?.insuranceEnabled, event?.insuranceRequired]);

  const handleNoticeAccept = (remember: boolean) => {
    if (slug && typeof window !== "undefined" && remember) {
      window.localStorage.setItem(`event-notice-${slug}`, "true");
    }
    setNoticeAccepted(true);
    setNoticeOpen(false);
  };

  const handleNoticeCancel = () => {
    setNoticeOpen(false);
    router.push("/");
  };

  const goToStep = (step: RegistrationStep) => {
    setRegistrationStep(step);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("registration-step")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleCpfSubmit = async (cpfDigits: string) => {
    setCpfLoading(true);
    setCpfError("");
    try {
      const result = await checkPendingOrder(cpfDigits);
      setBuyerCpf(cpfDigits);
      setCpfChecked(true);
      setForceNewRegistration(result.pendingOrders.length === 0);
      setSuggestedChurch(result.suggestedChurch ?? null);
      goToStep(result.pendingOrders.length > 0 ? "PENDING" : "PARTICIPANTS");
    } catch (error: any) {
      setCpfError(error?.response?.data?.message ?? "Não foi possível validar o CPF.");
    } finally {
      setCpfLoading(false);
    }
  };

  const updatePerson = (index: number, patch: Partial<PersonDraft>) => {
    setPeople((current) =>
      current.map((person, idx) => (idx === index ? { ...person, ...patch } : person))
    );
  };

  const updatePersonResponse = (index: number, fieldId: string, value: unknown) => {
    setPeople((current) =>
      current.map((person, idx) =>
        idx === index
          ? {
              ...person,
              formResponses: {
                ...person.formResponses,
                [fieldId]: value
              }
            }
          : person
      )
    );
  };

  const createEmptyPerson = (seed?: Partial<PersonDraft>): PersonDraft => ({
    id: createId(),
    fullName: "",
    cpf: "",
    birthDate: "",
    gender: "",
    districtId: seed?.districtId ?? event?.districtId ?? "",
    churchId: seed?.churchId ?? event?.churchId ?? "",
    formResponses: {}
  });

  const validatePerson = (
    person: PersonDraft,
    fields: EventFormField[],
    duplicateCpfs: Set<string>
  ) => {
    const errors: Record<string, string> = {};
    if (!person.fullName.trim()) {
      errors.fullName = "Informe o nome completo.";
    }
    const cpfDigits = normalizeCPF(person.cpf);
    if (!cpfDigits || !validateCPF(cpfDigits)) {
      errors.cpf = "CPF inválido.";
    } else if (duplicateCpfs.has(cpfDigits)) {
      errors.cpf = "CPF duplicado.";
    }
    if (!person.birthDate) {
      errors.birthDate = "Data de nascimento obrigatória.";
    }
    if (!person.gender) {
      errors.gender = "Selecione o gênero.";
    }
    if (!person.districtId) {
      errors.districtId = "Selecione o distrito.";
    }
    if (!person.churchId) {
      errors.churchId = "Selecione a igreja.";
    }
    fields.forEach((field) => {
      const value = person.formResponses[field.id];
      if (field.obrigatorio && isEmptyValue(value)) {
        errors[field.id] = "Campo obrigatório.";
      }
    });
    return errors;
  };

  const validatePeopleStep = () => {
    const cpfDigitsList = people
      .map((person) => normalizeCPF(person.cpf))
      .filter((cpf) => cpf.length === 11);
    const duplicateCpfs = new Set<string>();
    const seenCpfs = new Set<string>();
    cpfDigitsList.forEach((cpf) => {
      if (seenCpfs.has(cpf)) {
        duplicateCpfs.add(cpf);
      }
      seenCpfs.add(cpf);
    });

    const errors = people.map((person) => validatePerson(person, customFields, duplicateCpfs));
    setPersonErrors(errors);
    const hasErrors = errors.some((err) => Object.keys(err).length > 0);
    if (hasErrors) {
      setSubmitError("Revise os dados antes de continuar.");
      return false;
    }
    setSubmitError("");
    return true;
  };

  const handleContinueToPayment = () => {
    if (validatePeopleStep()) {
      goToStep("PAYMENT");
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!event) {
      setSubmitError("Evento não carregado.");
      return;
    }
    if (!buyerCpf || !cpfChecked) {
      setSubmitError("Informe o CPF do responsável financeiro.");
      goToStep("IDENTIFICATION");
      return;
    }
    if (!validatePeopleStep()) {
      goToStep("PARTICIPANTS");
      return;
    }
    if (event.insuranceEnabled && !insuranceSelected && !insuranceWaiverAccepted) {
      setSubmitError("Para continuar sem o seguro, aceite o termo de responsabilidade.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = people.map((person) => ({
        fullName: person.fullName.trim(),
        cpf: normalizeCPF(person.cpf),
        birthDate: person.birthDate,
        districtId: person.districtId,
        churchId: person.churchId,
        gender: person.gender,
        formResponses: person.formResponses
      }));

      const response = await createBatchOrder(buyerCpf, paymentMethod, payload, {
        selected: event.insuranceRequired || insuranceSelected,
        waiverAccepted: insuranceWaiverAccepted
      });
      if (response?.orderId) {
        router.push(`/evento/${slug}/pagamento/${response.orderId}`);
      } else {
        setSubmitError("Não foi possível concluir a inscrição.");
      }
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message ?? "Não foi possível concluir a inscrição.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPerson = () => {
    const first = people[0];
    setPeople((current) => [
      ...current,
      createEmptyPerson({
        districtId: first?.districtId,
        churchId: first?.churchId
      })
    ]);
  };

  const handleRemovePerson = (index: number) => {
    if (people.length <= 1) return;
    setPeople((current) => current.filter((_, idx) => idx !== index));
  };

  if (loading && !event) {
    return (
      <div className="py-10">
        <LoadingSpinner />
      </div>
    );
  }

  if (!event) {
    return (
      <BaseCard>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Evento não encontrado</h1>
          <p className="text-sm text-neutral-500">Verifique o link do evento e tente novamente.</p>
          <Link href="/" className="btn-outline w-fit">
            Voltar para eventos
          </Link>
        </div>
      </BaseCard>
    );
  }

  const showRegistrationForm = cpfChecked && (forceNewRegistration || pendingOrders.length === 0);
  const bannerUrl = resolveBannerUrl(event.bannerUrl);
  const price = priceInfo(event);
  const paymentLabel = event.isFree
    ? "Evento gratuito"
    : price.pending
      ? "Lote indisponível"
      : `${price.label} por inscrição`;
  const activeStepNumber = registrationStep === "PAYMENT" ? 3 : registrationStep === "PARTICIPANTS" ? 2 : 1;
  const unitPriceCents = event.isFree ? 0 : event.currentLot?.priceCents ?? event.currentPriceCents ?? 0;
  const insuranceDays = Math.max(event.insuranceDays ?? 1, 1);
  const insuranceUnitCents = event.insuranceEnabled && insuranceSelected
    ? Math.max(event.insuranceDailyCents ?? 0, 0) * insuranceDays
    : 0;
  const registrationSubtotalCents = unitPriceCents * people.length;
  const insuranceSubtotalCents = insuranceUnitCents * people.length;
  const estimatedTotalCents = registrationSubtotalCents + insuranceSubtotalCents;
  const requiresPayment = estimatedTotalCents > 0;

  return (
    <div className="event-registration-page mx-auto max-w-5xl space-y-5">
      {event.notice?.enabled ? (
        <EventNoticeModal
          slug={event.slug}
          open={noticeOpen && !noticeAccepted}
          title={event.notice.title}
          bullets={event.notice.bullets}
          footerText={event.notice.footerText}
          showOnce={event.notice.showOnce}
          onAccept={handleNoticeAccept}
          onCancel={handleNoticeCancel}
        />
      ) : null}

      <BaseCard className="event-card event-hero !overflow-hidden !p-0">
        {registrationStep === "IDENTIFICATION" ? <div className="event-hero-media">
          {bannerUrl && !bannerFailed ? (
            <div className="flex min-h-52 items-center justify-center bg-white md:min-h-72 dark:bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt={`Imagem do evento ${event.title}`}
                className="max-h-[360px] w-full object-contain"
                onError={() => setBannerFailed(true)}
              />
            </div>
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center gap-3 bg-slate-100 text-slate-500 md:min-h-56 dark:bg-slate-800 dark:text-slate-400">
              <PhotoIcon className="h-10 w-10" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Imagem do evento indisponível</span>
            </div>
          )}
        </div> : null}
        <div className={`${registrationStep === "IDENTIFICATION" ? "space-y-5 p-5 sm:p-7" : "space-y-3 p-4 sm:p-5"}`}>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">{registrationStep === "IDENTIFICATION" ? "Inscrição aberta" : `Inscrição · Etapa ${activeStepNumber} de 3`}</p>
            <h1 className={`${registrationStep === "IDENTIFICATION" ? "text-2xl sm:text-3xl" : "text-xl"} font-bold text-neutral-900 dark:text-white`}>{event.title}</h1>
            {registrationStep === "IDENTIFICATION" && event.description ? <p className="max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">{event.description}</p> : null}
          </div>
          {registrationStep === "IDENTIFICATION" ? <div className="grid border-y border-slate-200 sm:grid-cols-3 dark:border-slate-700">
            <div className="flex gap-3 border-b border-slate-200 py-4 sm:border-b-0 sm:border-r sm:pr-4 dark:border-slate-700">
              <CalendarDaysIcon className="h-5 w-5 shrink-0 text-primary-600" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Período</p>
                <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatDate(event.startDate)} - {formatDate(event.endDate)}</p>
              </div>
            </div>
            <div className="flex gap-3 border-b border-slate-200 py-4 sm:border-b-0 sm:border-r sm:px-4 dark:border-slate-700">
              <MapPinIcon className="h-5 w-5 shrink-0 text-primary-600" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Local</p>
                <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{event.location}</p>
              </div>
            </div>
            <div className="flex gap-3 py-4 sm:pl-4">
              <TicketIcon className="h-5 w-5 shrink-0 text-primary-600" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Valor</p>
                <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{paymentLabel}</p>
              </div>
            </div>
          </div> : <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400"><span>{formatDate(event.startDate)} – {formatDate(event.endDate)}</span><span>{event.location}</span><strong className="text-primary-600 dark:text-primary-400">{paymentLabel}</strong></div>}
          {registrationStep === "IDENTIFICATION" ? <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <span>{event.district?.name ?? "Distrito"}</span>
            {event.currentLot?.name ? <span>Lote: {event.currentLot.name}</span> : null}
            {event.minAgeYears !== null && event.minAgeYears !== undefined ? <span>Idade mínima: {event.minAgeYears}+</span> : null}
          </div> : null}
        </div>
      </BaseCard>

      <div id="registration-step" className="event-step-progress border border-[color:var(--border-card)] bg-[color:var(--surface-card)] p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2">
          {["Identificação", "Participantes", "Pagamento"].map((label, index) => {
            const number = index + 1;
            const active = number === activeStepNumber;
            const completed = number < activeStepNumber;
            return (
              <div key={label} className="min-w-0">
                <div className={`mb-2 h-1 w-full ${active || completed ? "bg-primary-600" : "bg-slate-200 dark:bg-slate-700"}`} />
                <div className="flex items-center gap-2">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center border text-xs font-bold ${active ? "border-primary-600 bg-primary-600 text-white" : completed ? "border-primary-600 text-primary-600" : "border-slate-300 text-slate-400 dark:border-slate-600"}`}>{number}</span>
                  <span className={`hidden truncate text-xs font-semibold sm:block ${active ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"}`}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {registrationStep === "IDENTIFICATION" ? (
        <BaseCard className="event-card">
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-600">Etapa 1 de 3</p>
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Identificação</h2>
              <p className="text-sm text-neutral-500">
                Informe o CPF do responsável financeiro para validar pedidos pendentes e iniciar novas inscrições.
              </p>
            </div>
            <ResponsibleCpfForm value={buyerCpf ? { cpf: buyerCpf } : null} loading={cpfLoading} error={cpfError} onSubmit={handleCpfSubmit} />
            {cpfChecked ? (
              <div className="border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
                CPF verificado anteriormente: <strong>{formatCPF(buyerCpf)}</strong>
              </div>
            ) : null}
          </div>
        </BaseCard>
      ) : null}

      {registrationStep === "PENDING" && cpfChecked && pendingOrders.length > 0 ? (
        <BaseCard className="event-card">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Pedidos pendentes</h2>
              <p className="text-sm text-neutral-500">
                Encontramos pedidos em aberto para este CPF. Voce pode continuar o pagamento ou criar uma nova inscrição.
              </p>
            </div>
            <div className="grid gap-4">
              {pendingOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        Pedido {order.orderId}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {order.registrations.length} inscrições • Total {formatCurrency(order.totalCents)}
                      </p>
                      {order.expiresAt ? (
                        <p className="text-xs text-neutral-400">Expira em {formatDate(order.expiresAt)}</p>
                      ) : null}
                    </div>
                    <Link
                      href={`/evento/${slug}/pagamento/${order.orderId}`}
                      className="btn-primary w-full justify-center md:w-auto"
                    >
                      Continuar pagamento
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                className="btn-muted w-full justify-center sm:w-auto"
                onClick={() => goToStep("IDENTIFICATION")}
              >
                Usar outro CPF
              </button>
              <button
                type="button"
                className="btn-primary w-full justify-center sm:w-auto"
                onClick={() => {
                  setForceNewRegistration(true);
                  goToStep("PARTICIPANTS");
                }}
              >
                Criar nova inscrição
              </button>
            </div>
          </div>
        </BaseCard>
      ) : null}

      {registrationStep === "PARTICIPANTS" && showRegistrationForm ? (
        <BaseCard className="event-card">
          <div className="space-y-6">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-600">Etapa 2 de 3</p>
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Participantes</h2>
              <p className="text-sm text-neutral-500">
                Preencha os dados de cada participante. Ao terminar, avance para revisar o pedido.
              </p>
            </div>

            <div className="space-y-6">
              {people.map((person, index) => {
                const errors = personErrors[index] ?? {};
                const churchOptions = person.districtId
                  ? churches.filter((church) => church.districtId === person.districtId)
                  : churches;

                return (
                  <div
                    key={person.id}
                    className="participant-card border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900/60 lg:p-7"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:border-b lg:border-neutral-200 lg:pb-4 dark:lg:border-neutral-700">
                      <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                        Participante {index + 1}
                      </h3>
                      {people.length > 1 ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600 hover:text-red-500"
                          onClick={() => handleRemovePerson(index)}
                        >
                          Remover
                        </button>
                      ) : null}
                    </div>

                    <div className="participant-form-grid mt-4 grid gap-4 md:grid-cols-2 lg:mt-6 lg:gap-x-6 lg:gap-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-600">Nome completo</label>
                        <input
                          value={person.fullName}
                          onChange={(event) => updatePerson(index, { fullName: event.target.value })}
                          type="text"
                          className="w-full"
                        />
                        {errors.fullName ? <p className="text-xs text-red-600">{errors.fullName}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-600">CPF</label>
                        <input
                          value={person.cpf}
                          onChange={(event) => updatePerson(index, { cpf: formatCPF(event.target.value) })}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={14}
                          className="w-full"
                          placeholder="000.000.000-00"
                        />
                        {errors.cpf ? <p className="text-xs text-red-600">{errors.cpf}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-600">Data de nascimento</label>
                        <DateField value={person.birthDate} onChange={(value) => updatePerson(index, { birthDate: value })} />
                        {errors.birthDate ? <p className="text-xs text-red-600">{errors.birthDate}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-600">Gênero</label>
                        <select value={person.gender} onChange={(event) => updatePerson(index, { gender: event.target.value })}>
                          <option value="">Selecione</option>
                          {genderOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {errors.gender ? <p className="text-xs text-red-600">{errors.gender}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-600">Distrito</label>
                        <select
                          value={person.districtId}
                          onChange={(event) => updatePerson(index, { districtId: event.target.value, churchId: "" })}
                        >
                          <option value="">Selecione</option>
                          {districts.map((district) => (
                            <option key={district.id} value={district.id}>{district.name}</option>
                          ))}
                        </select>
                        {errors.districtId ? <p className="text-xs text-red-600">{errors.districtId}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-600">Igreja</label>
                        <select value={person.churchId} onChange={(event) => updatePerson(index, { churchId: event.target.value })}>
                          <option value="">Selecione</option>
                          {churchOptions.map((church) => (
                            <option key={church.id} value={church.id}>{church.name}</option>
                          ))}
                        </select>
                        {errors.churchId ? <p className="text-xs text-red-600">{errors.churchId}</p> : null}
                      </div>
                    </div>

                    {customFields.length ? (
                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {customFields.map((field) => {
                          const value = person.formResponses[field.id];
                          const fieldError = errors[field.id];
                          const maskKind = resolveInputMask(field);
                          const generatedInputProps = maskInputProps(maskKind);

                          if (field.tipo === "textarea") {
                            return (
                              <div key={`${person.id}-${field.id}`} className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-neutral-600">{field.label}</label>
                                <textarea
                                  value={(value as string) ?? ""}
                                  onChange={(event) => updatePersonResponse(index, field.id, event.target.value)}
                                  placeholder={field.placeholder ?? ""}
                                  rows={3}
                                  className="w-full"
                                />
                                {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
                              </div>
                            );
                          }

                          if (field.tipo === "select") {
                            return (
                              <div key={`${person.id}-${field.id}`} className="space-y-2">
                                <label className="text-sm font-medium text-neutral-600">{field.label}</label>
                                <select
                                  value={(value as string) ?? ""}
                                  onChange={(event) => updatePersonResponse(index, field.id, event.target.value)}
                                >
                                  <option value="">Selecione</option>
                                  {(field.opcoes ?? []).map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                                {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
                              </div>
                            );
                          }

                          if (field.tipo === "checkbox") {
                            return (
                              <div key={`${person.id}-${field.id}`} className="space-y-2">
                                <label className="flex items-start gap-2 text-sm font-medium text-neutral-600">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(value)}
                                    onChange={(event) => updatePersonResponse(index, field.id, event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600"
                                  />
                                  <span>{field.label}</span>
                                </label>
                                {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
                              </div>
                            );
                          }

                          const inputType = field.tipo === "email" ? "email" : field.tipo === "number" ? "number" : "text";
                          const inputValue =
                            field.tipo === "number" && typeof value === "number" ? String(value) : (value as string) ?? "";

                          return (
                            <div key={`${person.id}-${field.id}`} className="space-y-2">
                              <label className="text-sm font-medium text-neutral-600">{field.label}</label>
                              <input
                                type={inputType}
                                value={inputValue}
                                inputMode={generatedInputProps.inputMode}
                                maxLength={generatedInputProps.maxLength}
                                autoComplete={field.tipo === "email" ? "email" : generatedInputProps.autoComplete}
                                placeholder={field.placeholder || generatedInputProps.placeholder || ""}
                                min={field.min}
                                max={field.max}
                                onChange={(event) => {
                                  const raw = applyInputMask(maskKind, event.target.value);
                                  if (field.tipo === "number") {
                                    const numeric = raw === "" ? "" : Number(raw);
                                    updatePersonResponse(index, field.id, Number.isFinite(numeric) ? numeric : "");
                                  } else {
                                    updatePersonResponse(index, field.id, raw);
                                  }
                                }}
                                className="w-full"
                              />
                              {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 lg:items-center">
              <button type="button" className="btn-outline" onClick={handleAddPerson}>
                Adicionar participante
              </button>
            </div>

            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className="btn-muted w-full justify-center sm:w-auto" onClick={() => goToStep("IDENTIFICATION")}>
                Voltar
              </button>
              <button
                type="button"
                className="btn-primary w-full justify-center sm:w-auto"
                onClick={handleContinueToPayment}
              >
                Revisar e continuar
              </button>
            </div>
          </div>
        </BaseCard>
      ) : null}

      {registrationStep === "PAYMENT" && showRegistrationForm ? (
        <BaseCard className="event-card">
          <div className="space-y-6">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-600">Etapa 3 de 3</p>
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Revisão e pagamento</h2>
              <p className="text-sm text-neutral-500">Confira os participantes e escolha como deseja concluir a inscrição.</p>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/60">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Responsável financeiro</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatCPF(buyerCpf)}</p>
                </div>
                <button type="button" className="text-xs font-bold text-primary-600" onClick={() => goToStep("IDENTIFICATION")}>Alterar</button>
              </div>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {people.map((person, index) => (
                  <div key={person.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{index + 1}. {person.fullName}</p>
                      <p className="text-xs text-neutral-500">{formatCPF(person.cpf)}</p>
                    </div>
                    <button type="button" className="mt-2 text-left text-xs font-bold text-primary-600 sm:mt-0" onClick={() => goToStep("PARTICIPANTS")}>Editar</button>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-neutral-200 px-4 py-4 text-sm dark:border-neutral-700">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">Inscrições ({people.length})</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                    {registrationSubtotalCents > 0 ? formatCurrency(registrationSubtotalCents) : "Gratuito"}
                  </span>
                </div>
                {insuranceSubtotalCents > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">Seguro ({people.length} participante{people.length > 1 ? "s" : ""})</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-100">{formatCurrency(insuranceSubtotalCents)}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-4 dark:border-neutral-700">
                <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Total estimado</span>
                <strong className="text-lg text-neutral-900 dark:text-white">{requiresPayment ? formatCurrency(estimatedTotalCents) : "Gratuito"}</strong>
              </div>
            </div>

            {event.insuranceEnabled ? (
              <section className="border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">Proteção durante o evento</p>
                    <h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">Seguro do participante</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {formatCurrency(event.insuranceDailyCents)} por dia × {insuranceDays} dia{insuranceDays > 1 ? "s" : ""} = {formatCurrency(event.insuranceDailyCents * insuranceDays)} por participante.
                    </p>
                  </div>
                  {event.insuranceRequired ? (
                    <span className="w-fit border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold uppercase text-primary-700 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-300">Obrigatório</span>
                  ) : (
                    <span className="w-fit border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">Recomendado</span>
                  )}
                </div>

                {event.insuranceRequired ? (
                  <p className="mt-4 border-l-4 border-primary-500 bg-primary-50 px-4 py-3 text-sm text-primary-900 dark:bg-primary-950/30 dark:text-primary-100">
                    O seguro é obrigatório neste evento e já está incluído no valor final.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <label className={`flex cursor-pointer gap-3 border p-4 ${insuranceSelected ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30" : "border-neutral-200 dark:border-neutral-700"}`}>
                      <input
                        type="radio"
                        name="insuranceOption"
                        checked={insuranceSelected}
                        onChange={() => {
                          setInsuranceSelected(true);
                          setInsuranceWaiverAccepted(false);
                          setSubmitError("");
                        }}
                        className="mt-0.5 h-4 w-4 text-primary-600"
                      />
                      <span>
                        <strong className="block text-sm text-neutral-900 dark:text-white">Sim, quero contratar o seguro</strong>
                        <span className="mt-1 block text-xs text-neutral-500">Recomendamos que todos os participantes estejam assegurados.</span>
                      </span>
                    </label>
                    <label className={`flex cursor-pointer gap-3 border p-4 ${!insuranceSelected ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-neutral-200 dark:border-neutral-700"}`}>
                      <input
                        type="radio"
                        name="insuranceOption"
                        checked={!insuranceSelected}
                        onChange={() => {
                          setInsuranceSelected(false);
                          setInsuranceWaiverAccepted(false);
                        }}
                        className="mt-0.5 h-4 w-4 text-amber-600"
                      />
                      <strong className="text-sm text-neutral-900 dark:text-white">Não quero contratar o seguro</strong>
                    </label>
                    {!insuranceSelected ? (
                      <label className="flex cursor-pointer gap-3 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                        <input
                          type="checkbox"
                          checked={insuranceWaiverAccepted}
                          onChange={(inputEvent) => setInsuranceWaiverAccepted(inputEvent.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                        />
                        <span>Declaro que optei por não contratar o seguro e estou ciente de que os responsáveis e organizadores do evento não se responsabilizam por eventualidades ocorridas durante o evento.</span>
                      </label>
                    ) : null}
                  </div>
                )}
              </section>
            ) : null}

            <div className="border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900/60">
              <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">Forma de pagamento</h3>
              {!requiresPayment ? (
                <p className="mt-2 text-sm text-neutral-500">Evento gratuito. Nenhum pagamento será necessário.</p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {availablePaymentMethods.map((method) => (
                    <label
                      key={method.value}
                      className={`flex cursor-pointer items-center justify-between border px-4 py-3 text-sm transition ${
                        paymentMethod === method.value
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                          : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
                      }`}
                    >
                      <span className="font-semibold text-neutral-700 dark:text-neutral-200">{method.label}</span>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                        className="h-4 w-4 text-primary-600"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className="btn-muted w-full justify-center sm:w-auto" onClick={() => goToStep("PARTICIPANTS")}>
                Voltar aos participantes
              </button>
              <button
                type="button"
                className="btn-primary w-full justify-center sm:w-auto"
                disabled={submitting || !noticeAccepted}
                onClick={handleSubmit}
              >
                {submitting ? "Processando..." : requiresPayment ? "Ir para pagamento" : "Concluir inscrição"}
              </button>
            </div>
          </div>
        </BaseCard>
      ) : null}
    </div>
  );
}
