import { defineStore } from "pinia";
import { ref } from "vue";

import { useApi } from "../composables/useApi";
import type {
  Event,
  EventLot,
  Order,
  Registration,
  AdminRegistrationsReportResponse,
  RegistrationsDashboardResponse,
  AdminUser,
  AdminProfile,
  UserStatus,
  ResponsibleFinanceSummary,
  ResponsiblePendingOrder,
  TransferRecord
} from "../types/api";

export const useAdminStore = defineStore("admin", () => {
  const { api } = useApi();
  const registrationsTimeoutMs = (() => {
    const parsed = Number(import.meta.env.VITE_API_REGISTRATIONS_TIMEOUT_MS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20000;
  })();
  const registrationsPdfTimeoutMs = (() => {
    const parsed = Number(import.meta.env.VITE_API_REGISTRATIONS_PDF_TIMEOUT_MS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60000;
  })();
  const reportJobPollDelayMs = (() => {
    const parsed = Number(import.meta.env.VITE_API_REPORT_JOB_POLL_MS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1500;
  })();
  const reportJobMaxWaitMs = (() => {
    const parsed = Number(import.meta.env.VITE_API_REPORT_JOB_MAX_WAIT_MS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 180000;
  })();

  type ReportJobStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  type ReportJobSummary = {
    id: string;
    status: ReportJobStatus;
    type?: string;
    fileName?: string | null;
    errorMessage?: string | null;
  };
  type ReportJobResponse = {
    success?: boolean;
    jobId?: string;
    status?: ReportJobStatus;
    job?: ReportJobSummary;
    message?: string;
  };

  const normalizeReportJobResponse = (data: ReportJobResponse) => {
    if (!data) return data;
    const jobId = data.jobId ?? data.job?.id ?? (data.job as { jobId?: string | null } | undefined)?.jobId;
    return jobId ? { ...data, jobId } : data;
  };
  const events = ref<Event[]>([]);
  const eventLots = ref<Record<string, EventLot[]>>({});
  const registrations = ref<Registration[]>([]);
  const registrationFilters = ref<Record<string, unknown>>({});
  const registrationsTotal = ref<number | null>(null);
  const registrationsHasMore = ref(false);
  const registrationsPage = ref(1);
  const registrationsPageSize = ref<number | null>(null);
  const orders = ref<Order[]>([]);
  const dashboard = ref<Record<string, unknown> | null>(null);
  const users = ref<AdminUser[]>([]);
  const profiles = ref<AdminProfile[]>([]);
  const responsibleFinance = ref<ResponsibleFinanceSummary[]>([]);
  const responsiblePending = ref<Record<string, ResponsiblePendingOrder[]>>({});
  const responsibleTransfers = ref<Record<string, TransferRecord[]>>({});

  const extractArray = <T>(input: unknown, fallbackKeys: string[] = []): T[] => {
    if (Array.isArray(input)) {
      return input as T[];
    }
    if (input && typeof input === "object") {
      for (const key of fallbackKeys) {
        const value = (input as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
          return value as T[];
        }
      }
    }
    return [];
  };

  const loadEvents = async () => {
    const response = await api.get("/admin/events");
    const data = extractArray<Event>(response.data, ["events", "data"]);
    events.value = data;
    const lotsMap: Record<string, EventLot[]> = {};
    data.forEach((event: Event) => {
      lotsMap[event.id] = event.lots ?? [];
    });
    eventLots.value = lotsMap;
  };

  const saveEvent = async (payload: Partial<Event>) => {
    if (payload.id) {
      const response = await api.patch(`/admin/events/${payload.id}`, payload);
      await loadEvents();
      return response.data;
    }
    const response = await api.post("/admin/events", payload);
    await loadEvents();
    return response.data;
  };

  const deleteEvent = async (id: string) => {
    await api.delete(`/admin/events/${id}`);
    await loadEvents();
  };

  const loadEventLots = async (eventId: string) => {
    const response = await api.get(`/admin/events/${eventId}/lots`);
    eventLots.value = { ...eventLots.value, [eventId]: response.data };
    const eventIndex = events.value.findIndex((event) => event.id === eventId);
    if (eventIndex >= 0) {
      events.value[eventIndex] = {
        ...events.value[eventIndex],
        lots: response.data
      };
    }
    return response.data as EventLot[];
  };

  const createEventLot = async (
    eventId: string,
    payload: {
      name: string;
      priceCents: number;
      startsAt: string;
      endsAt?: string | null;
      type?: EventLot["type"];
      tipo_lote?: EventLot["type"];
    }
  ) => {
    await api.post(`/admin/events/${eventId}/lots`, payload);
    await loadEventLots(eventId);
    await loadEvents();
    return eventLots.value[eventId] ?? [];
  };

  const updateEventLot = async (
    eventId: string,
    lotId: string,
    payload: Partial<{
      name: string;
      priceCents: number;
      startsAt: string;
      endsAt: string | null;
      type: EventLot["type"];
      tipo_lote: EventLot["type"];
    }>
  ) => {
    await api.patch(`/admin/events/${eventId}/lots/${lotId}`, payload);
    await loadEventLots(eventId);
    await loadEvents();
    return eventLots.value[eventId] ?? [];
  };

  const deleteEventLot = async (eventId: string, lotId: string) => {
    await api.delete(`/admin/events/${eventId}/lots/${lotId}`);
    await loadEventLots(eventId);
    await loadEvents();
    return eventLots.value[eventId] ?? [];
  };

  const normalizeFilters = (input: Record<string, unknown> | undefined) =>
    Object.fromEntries(
      Object.entries(input ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
    );

  type RegistrationsLoadOptions = {
    page?: number;
    limit?: number;
    pageSize?: number;
    append?: boolean;
  };

  const loadRegistrations = async (
    filters: Record<string, unknown> = {},
    options: RegistrationsLoadOptions = {}
  ) => {
    const params = normalizeFilters(filters);
    registrationFilters.value = params;
    let requestedPage: number | null = null;
    let requestedLimit: number | null = null;
    if (options.page || options.pageSize || options.limit) {
      requestedPage = Math.max(1, Math.floor(options.page ?? 1));
      requestedLimit = Math.max(1, Math.floor(options.limit ?? options.pageSize ?? 200));
      params.page = requestedPage;
      params.limit = requestedLimit;
    }
    const response = await api.get("/admin/registrations", {
      params,
      timeout: registrationsTimeoutMs
    });
    const data = response.data;
    if (Array.isArray(data)) {
      registrations.value = data;
      registrationsTotal.value = data.length;
      registrationsHasMore.value = false;
      registrationsPage.value = 1;
      registrationsPageSize.value = null;
      return;
    }
    const items = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
        ? data.items
        : [];
    registrations.value = options.append ? [...registrations.value, ...items] : items;
    const total = typeof data?.total === "number" && Number.isFinite(data.total) ? data.total : null;
    registrationsTotal.value = total;
    const resolvedLimit =
      typeof data?.limit === "number" && Number.isFinite(data.limit)
        ? data.limit
        : typeof data?.pageSize === "number" && Number.isFinite(data.pageSize)
          ? data.pageSize
          : requestedLimit;
    const resolvedPage =
      typeof data?.page === "number" && Number.isFinite(data.page) ? data.page : (requestedPage ?? 1);
    const totalPages =
      typeof data?.totalPages === "number" && Number.isFinite(data.totalPages)
        ? data.totalPages
        : total !== null && resolvedLimit
          ? Math.max(1, Math.ceil(total / resolvedLimit))
          : null;
    registrationsHasMore.value =
      typeof data?.hasMore === "boolean"
        ? data.hasMore
        : totalPages !== null
          ? resolvedPage < totalPages
          : total !== null
            ? registrations.value.length < total
            : false;
    registrationsPage.value = resolvedPage;
    registrationsPageSize.value = resolvedLimit;
  };

  const reloadRegistrations = async () => {
    if (registrationsPageSize.value) {
      await loadRegistrations(registrationFilters.value, {
        page: registrationsPage.value,
        limit: registrationsPageSize.value
      });
      return;
    }
    await loadRegistrations(registrationFilters.value);
  };

  const downloadRegistrationReport = async (
    filters: Record<string, unknown>,
    groupBy: "event" | "church",
    template: "standard" | "event" = "standard"
  ) => {
    const params = normalizeFilters({ ...filters, groupBy, template });
    return api.get<Blob>("/admin/registrations/report.pdf", {
      params,
      responseType: "blob",
      timeout: registrationsPdfTimeoutMs
    });
  };

  const requestRegistrationReportJob = async (
    filters: Record<string, unknown>,
    groupBy: "event" | "church",
    template: "standard" | "event" = "standard",
    layout?: "single" | "two" | "four"
  ) => {
    const params = normalizeFilters({ ...filters, groupBy, template, layout, async: true });
    const response = await api.get<ReportJobResponse>("/admin/registrations/report.pdf", { params });
    return normalizeReportJobResponse(response.data);
  };

  const requestRegistrationListJob = async (filters: Record<string, unknown> = {}) => {
    const params = normalizeFilters({ ...filters, async: true });
    const response = await api.get<ReportJobResponse>("/admin/registrations/list.pdf", { params });
    return normalizeReportJobResponse(response.data);
  };

  const getReportJobStatus = async (jobId: string) => {
    const response = await api.get<{ job: ReportJobSummary }>(`/admin/reports/jobs/${jobId}`);
    return response.data.job;
  };

  const waitForReportJob = async (
    jobId: string,
    options?: { maxWaitMs?: number; pollDelayMs?: number }
  ) => {
    const startedAt = Date.now();
    const maxWaitMs = options?.maxWaitMs ?? reportJobMaxWaitMs;
    const pollDelayMs = options?.pollDelayMs ?? reportJobPollDelayMs;
    while (true) {
      const job = await getReportJobStatus(jobId);
      if (job.status === "DONE") return job;
      if (job.status === "FAILED") {
        const message = job.errorMessage ?? "Falha ao gerar relatorio.";
        throw new Error(message);
      }
      if (Date.now() - startedAt >= maxWaitMs) {
        throw new Error("Tempo limite para gerar relatorio.");
      }
      await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
    }
  };

  const downloadReportJobFile = async (jobId: string) =>
    api.get<Blob>(`/admin/reports/jobs/${jobId}/file`, {
      responseType: "blob",
      timeout: registrationsPdfTimeoutMs
    });

  const downloadRegistrationListPdf = async (filters: Record<string, unknown> = {}) => {
    const params = normalizeFilters(filters);
    return api.get<Blob>("/admin/registrations/list.pdf", {
      params,
      responseType: "blob",
      timeout: registrationsPdfTimeoutMs
    });
  };

  const downloadRegistrationListXlsx = async (filters: Record<string, unknown> = {}) => {
    const params = normalizeFilters(filters);
    return api.get<Blob>("/admin/registrations/list.xlsx", {
      params,
      responseType: "blob",
      timeout: registrationsPdfTimeoutMs
    });
  };

  const getAdminRegistrationsSummaryReport = async (filters: Record<string, unknown> = {}) => {
    const params = normalizeFilters(filters);
    const response = await api.get<AdminRegistrationsReportResponse>(
      "/admin/reports/registrations/summary",
      { params }
    );
    return response.data;
  };

  const downloadAdminRegistrationsSummaryCsv = async (filters: Record<string, unknown> = {}) => {
    const params = normalizeFilters(filters);
    return api.get<Blob>("/admin/reports/registrations/summary.csv", {
      params,
      responseType: "blob",
      timeout: registrationsPdfTimeoutMs
    });
  };

  const downloadAdminRegistrationsSummaryXlsx = async (filters: Record<string, unknown> = {}) => {
    const params = normalizeFilters(filters);
    return api.get<Blob>("/admin/reports/registrations/summary.xlsx", {
      params,
      responseType: "blob",
      timeout: registrationsPdfTimeoutMs
    });
  };

  const downloadAdminRegistrationsSummaryPdf = async (filters: Record<string, unknown> = {}) => {
    const params = normalizeFilters(filters);
    return api.get<Blob>("/admin/reports/registrations/summary.pdf", {
      params,
      responseType: "blob",
      timeout: registrationsPdfTimeoutMs
    });
  };

  const getRegistrationsDashboard = async (filters: Record<string, unknown> = {}) => {
    const params = normalizeFilters(filters);
    const response = await api.get<RegistrationsDashboardResponse>(
      "/admin/dashboard/registrations",
      { params }
    );
    return response.data;
  };

  const downloadFinancialReport = async (eventId: string) => {
    return api.get<Blob>(`/admin/financial/events/${eventId}/report.pdf`, {
      responseType: "blob",
      timeout: registrationsPdfTimeoutMs
    });
  };

  const requestFinancialReportJob = async (eventId: string) => {
    const response = await api.get<ReportJobResponse>(
      `/admin/financial/events/${eventId}/report.pdf`,
      {
        params: { async: true }
      }
    );
    return normalizeReportJobResponse(response.data);
  };

  const loadResponsibleFinance = async () => {
    const response = await api.get("/admin/finance/responsibles");
    responsibleFinance.value = response.data as ResponsibleFinanceSummary[];
    return responsibleFinance.value;
  };

  const loadResponsiblePendingOrders = async (responsibleId: string) => {
    const response = await api.get(`/admin/finance/responsibles/${responsibleId}/pending-orders`);
    const list = response.data as ResponsiblePendingOrder[];
    responsiblePending.value = { ...responsiblePending.value, [responsibleId]: list };
    return list;
  };

  const loadResponsibleTransfers = async (responsibleId: string) => {
    const response = await api.get(`/admin/finance/responsibles/${responsibleId}/transfers`);
    const list = response.data as TransferRecord[];
    responsibleTransfers.value = { ...responsibleTransfers.value, [responsibleId]: list };
    return list;
  };

  const createResponsibleTransfer = async (responsibleId: string) => {
    const response = await api.post(`/admin/finance/responsibles/${responsibleId}/transfer`);
    await loadResponsibleFinance();
    await loadResponsiblePendingOrders(responsibleId);
    await loadResponsibleTransfers(responsibleId);
    return response.data;
  };

  const updateRegistration = async (id: string, payload: Record<string, unknown>) => {
    await api.patch(`/admin/registrations/${id}`, payload);
    await reloadRegistrations();
  };

  const cancelRegistration = async (id: string) => {
    await api.post(`/admin/registrations/${id}/cancel`);
    await reloadRegistrations();
  };

  const reactivateRegistration = async (id: string) => {
    const response = await api.post(`/admin/registrations/${id}/reactivate`);
    await reloadRegistrations();
    return response.data as { orderId?: string };
  };

  const refundRegistration = async (id: string, payload: { amountCents?: number; reason?: string }) => {
    await api.post(`/admin/registrations/${id}/refund`, payload);
    await reloadRegistrations();
  };

  const markRegistrationsPaid = async (
    registrationIds: string[],
    payload?: { paidAt?: string; reference?: string; paymentMethod?: string }
  ) => {
    await api.post(`/admin/registrations/mark-paid`, {
      registrationIds,
      ...(payload ?? {})
    });
    await reloadRegistrations();
  };

  const createPaymentOrderForRegistrations = async (payload: {
    registrationIds: string[];
    paymentMethod?: string;
  }) => {
    const response = await api.post(`/admin/registrations/payment-order`, payload);
    await reloadRegistrations();
    return response.data as {
      orderId: string;
      status: string;
      paymentMethod: string;
      totalCents: number;
      payment?: any;
    };
  };

  const deleteRegistration = async (id: string) => {
    await api.delete(`/admin/registrations/${id}`);
    await reloadRegistrations();
  };

  const createAdminRegistration = async (payload: {
    eventId: string;
    buyerCpf: string;
    paymentMethod: 'PIX_MP' | 'CASH' | 'FREE_PREVIOUS_YEAR';
    person: {
      fullName: string;
      cpf: string;
      birthDate: string; // YYYY-MM-DD
      gender?: string;
      districtId: string;
      churchId: string;
      photoUrl?: string | null;
    };
  }) => {
    const resp = await api.post(`/admin/inscriptions/batch`, {
      eventId: payload.eventId,
      buyerCpf: payload.buyerCpf,
      paymentMethod: payload.paymentMethod,
      people: [
        {
          fullName: payload.person.fullName,
          cpf: payload.person.cpf,
          birthDate: payload.person.birthDate,
          gender: payload.person.gender ?? 'OTHER',
          districtId: payload.person.districtId,
          churchId: payload.person.churchId,
          photoUrl: payload.person.photoUrl ?? null
        }
      ]
    });
    // Se foi em dinheiro, marcar pago imediatamente
    if (payload.paymentMethod === 'CASH') {
      const orderId = resp.data?.orderId;
      if (orderId) {
        await api.post(`/admin/orders/${orderId}/mark-paid`, {
          manualReference: 'CASH-ADMIN',
          paidAt: new Date().toISOString()
        });
      }
    }
    await reloadRegistrations();
    return resp.data;
  };

  const confirmOrderPayment = async (
    orderId: string,
    payload?: {
      paymentId?: string;
      manualReference?: string;
      paidAt?: string;
      proofFile?: string | File | Blob;
      proofUrl?: string;
    }
  ) => {
    const toFile = (input?: string | File | Blob) => {
      if (!input) return null;
      if (input instanceof File || input instanceof Blob) return input;
      const match = input.match(/^data:(.+);base64,(.*)$/);
      if (!match) return null;
      const mime = match[1];
      const base64 = match[2];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const ext = mime.includes("pdf") ? "pdf" : mime.split("/")[1] || "bin";
      return new File([bytes], `comprovante.${ext}`, { type: mime });
    };

    const proof = toFile(payload?.proofFile);
    if (proof) {
      const formData = new FormData();
      if (payload?.paymentId) formData.append("paymentId", payload.paymentId);
      if (payload?.manualReference) formData.append("manualReference", payload.manualReference);
      if (payload?.paidAt) formData.append("paidAt", payload.paidAt);
      formData.append("proofFile", proof);
      if (payload?.proofUrl) formData.append("proofUrl", payload.proofUrl);
      await api.post(`/admin/orders/${orderId}/mark-paid`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    } else {
      await api.post(`/admin/orders/${orderId}/mark-paid`, payload ?? {});
    }
    await reloadRegistrations();
  };

  // Consulta status do pagamento de um pedido (PIX/Manual)
  const getOrderPayment = async (orderId: string) => {
    const response = await api.get(`/payments/order/${orderId}`);
    return response.data as {
      status: string;
      paymentId?: string | null;
      paymentMethod: string;
      participantCount: number;
      totalCents: number;
      paidAt?: string | null;
      isFree?: boolean;
      isManual?: boolean;
      manualPaymentProofUrl?: string | null;
    };
  };

  const regenerateRegistrationPaymentLink = async (registrationId: string) => {
    const response = await api.post(`/admin/registrations/${registrationId}/payment-link`);
    return response.data as { orderId: string };
  };

  const getRegistrationReceiptLink = async (registrationId: string) => {
    const response = await api.get(`/admin/registrations/${registrationId}/receipt-link`);
    return response.data as { url: string };
  };

  const getRegistrationHistory = async (registrationId: string) => {
    const response = await api.get(`/admin/registrations/${registrationId}/history`);
    return response.data as {
      registration: any;
      orderId?: string | null;
      events: Array<{ type: string; at: string; actor?: { id: string; name?: string | null } | null; details?: any }>;
    };
  };

  const loadOrders = async (filters: Record<string, unknown> = {}) => {
    const response = await api.get("/admin/orders", { params: filters });
    orders.value = response.data;
  };

  const loadDashboard = async (eventId: string) => {
    const response = await api.get(`/admin/checkin/${eventId}`);
    dashboard.value = response.data;
  };

  const checkinScan = async (payload: { registrationId: string; signature: string }) => {
    const response = await api.post("/admin/checkin/scan", payload);
    return response.data;
  };

  const checkinManualLookup = async (payload: { cpf: string; birthDate: string }) => {
    const response = await api.post("/admin/checkin/manual", payload);
    return response.data;
  };

  const confirmCheckin = async (payload: { registrationId: string; signature?: string }) => {
    const response = await api.post("/admin/checkin/confirm", payload);
    return response.data;
  };

  const uploadAsset = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/admin/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data as { fileName: string; url: string; size: number; mimeType: string };
  };

  const loadUsers = async () => {
    const response = await api.get("/admin/users");
    users.value = response.data;
    return users.value;
  };

  type CreateUserPayload = {
    name: string;
    email: string;
    cpf?: string | null;
    phone?: string | null;
    role: AdminUser["role"];
    districtScopeId?: string | null;
    churchScopeId?: string | null;
    ministryIds?: string[];
    photoUrl?: string | null;
    profileId?: string | null;
    status?: UserStatus;
    pixType?: AdminUser["pixType"];
    pixKey?: string | null;
    pixOwnerName?: string | null;
    pixOwnerDocument?: string | null;
    pixBankName?: string | null;
    pixStatus?: AdminUser["pixStatus"];
  };

  type ProfilePermissionPayload = {
    module: string;
    canView?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    canDeactivate?: boolean;
    canReport?: boolean;
    canFinancial?: boolean;
  };

  type ProfilePayload = {
    name: string;
    description?: string | null;
    isActive?: boolean;
    permissions: ProfilePermissionPayload[];
  };

  const createUser = async (payload: CreateUserPayload) => {
    const response = await api.post("/admin/users", payload);
    await loadUsers();
    return response.data as { user: AdminUser; temporaryPassword: string };
  };

  const updateUser = async (
    userId: string,
    payload: Partial<CreateUserPayload> & { photoUrl?: string | null }
  ) => {
    const response = await api.patch(`/admin/users/${userId}`, payload);
    await loadUsers();
    return response.data as AdminUser;
  };

  const resetUserPassword = async (userId: string) => {
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data as { temporaryPassword: string };
  };

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    const response = await api.patch(`/admin/users/${userId}/status`, { status });
    await loadUsers();
    return response.data as AdminUser;
  };

  const deleteUser = async (userId: string) => {
    await api.delete(`/admin/users/${userId}`);
    await loadUsers();
  };

  const loadProfiles = async () => {
    const response = await api.get("/admin/profiles");
    profiles.value = response.data as AdminProfile[];
    return profiles.value;
  };

  const createProfile = async (payload: ProfilePayload) => {
    const response = await api.post("/admin/profiles", payload);
    await loadProfiles();
    return response.data as AdminProfile;
  };

  const updateProfile = async (profileId: string, payload: Partial<ProfilePayload>) => {
    const response = await api.patch(`/admin/profiles/${profileId}`, payload);
    await loadProfiles();
    return response.data as AdminProfile;
  };

  const updateProfileStatus = async (profileId: string, isActive: boolean) => {
    const response = await api.patch(`/admin/profiles/${profileId}/status`, { isActive });
    await loadProfiles();
    return response.data as AdminProfile;
  };

  const deleteProfile = async (profileId: string) => {
    await api.delete(`/admin/profiles/${profileId}`);
    await loadProfiles();
  };

  return {
    events,
    eventLots,
    registrations,
    registrationsTotal,
    registrationsHasMore,
    registrationsPage,
    registrationsPageSize,
    orders,
    dashboard,
    users,
    profiles,
    loadEvents,
    saveEvent,
    deleteEvent,
    loadEventLots,
    createEventLot,
    updateEventLot,
    deleteEventLot,
    loadRegistrations,
    downloadRegistrationReport,
    downloadRegistrationListPdf,
    downloadRegistrationListXlsx,
    getAdminRegistrationsSummaryReport,
    downloadAdminRegistrationsSummaryCsv,
    downloadAdminRegistrationsSummaryXlsx,
    downloadAdminRegistrationsSummaryPdf,
    getRegistrationsDashboard,
    downloadFinancialReport,
    requestRegistrationReportJob,
    requestRegistrationListJob,
    requestFinancialReportJob,
    getReportJobStatus,
    waitForReportJob,
    downloadReportJobFile,
    responsibleFinance,
    responsiblePending,
    responsibleTransfers,
    loadResponsibleFinance,
    loadResponsiblePendingOrders,
    loadResponsibleTransfers,
    createResponsibleTransfer,
    updateRegistration,
    cancelRegistration,
    reactivateRegistration,
    deleteRegistration,
    createAdminRegistration,
    refundRegistration,
    markRegistrationsPaid,
    createPaymentOrderForRegistrations,
    confirmOrderPayment,
    getOrderPayment,
    regenerateRegistrationPaymentLink,
    getRegistrationReceiptLink,
    getRegistrationHistory,
    loadOrders,
    loadDashboard,
    checkinScan,
    checkinManualLookup,
    confirmCheckin,
    uploadAsset,
    loadUsers,
    createUser,
    updateUser,
    resetUserPassword,
    updateUserStatus,
    deleteUser,
    loadProfiles,
    createProfile,
    updateProfile,
    updateProfileStatus,
    deleteProfile
  };
});
