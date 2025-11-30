import { defineStore } from "pinia";
import { ref } from "vue";

import { useApi } from "../composables/useApi";
import type {
  Event,
  EventLot,
  Order,
  Registration,
  AdminUser,
  AdminProfile,
  UserStatus
} from "../types/api";

export const useAdminStore = defineStore("admin", () => {
  const { api } = useApi();
  const events = ref<Event[]>([]);
  const eventLots = ref<Record<string, EventLot[]>>({});
  const registrations = ref<Registration[]>([]);
  const registrationFilters = ref<Record<string, unknown>>({});
  const orders = ref<Order[]>([]);
  const dashboard = ref<Record<string, unknown> | null>(null);
  const users = ref<AdminUser[]>([]);
  const profiles = ref<AdminProfile[]>([]);

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
    payload: { name: string; priceCents: number; startsAt: string; endsAt?: string | null }
  ) => {
    await api.post(`/admin/events/${eventId}/lots`, payload);
    await loadEventLots(eventId);
    await loadEvents();
    return eventLots.value[eventId] ?? [];
  };

  const updateEventLot = async (
    eventId: string,
    lotId: string,
    payload: Partial<{ name: string; priceCents: number; startsAt: string; endsAt: string | null }>
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

  const loadRegistrations = async (filters: Record<string, unknown> = {}) => {
    const params = normalizeFilters(filters);
    registrationFilters.value = params;
    const response = await api.get("/admin/registrations", { params });
    registrations.value = response.data;
  };

  const downloadRegistrationReport = async (
    filters: Record<string, unknown>,
    groupBy: "event" | "church",
    template: "standard" | "event" = "standard"
  ) => {
    const params = normalizeFilters({ ...filters, groupBy, template });
    return api.get<ArrayBuffer>("/admin/registrations/report.pdf", {
      params,
      responseType: "arraybuffer"
    });
  };

  const downloadFinancialReport = async (eventId: string) => {
    return api.get<ArrayBuffer>(`/admin/financial/events/${eventId}/report.pdf`, {
      responseType: "arraybuffer"
    });
  };

  const updateRegistration = async (id: string, payload: Record<string, unknown>) => {
    await api.patch(`/admin/registrations/${id}`, payload);
    await loadRegistrations(registrationFilters.value);
  };

  const cancelRegistration = async (id: string) => {
    await api.post(`/admin/registrations/${id}/cancel`);
    await loadRegistrations(registrationFilters.value);
  };

  const reactivateRegistration = async (id: string) => {
    const response = await api.post(`/admin/registrations/${id}/reactivate`);
    await loadRegistrations(registrationFilters.value);
    return response.data as { orderId?: string };
  };

  const refundRegistration = async (id: string, payload: { amountCents?: number; reason?: string }) => {
    await api.post(`/admin/registrations/${id}/refund`, payload);
    await loadRegistrations(registrationFilters.value);
  };

  const markRegistrationsPaid = async (
    registrationIds: string[],
    payload?: { paidAt?: string; reference?: string }
  ) => {
    await api.post(`/admin/registrations/mark-paid`, {
      registrationIds,
      ...(payload ?? {})
    });
    await loadRegistrations(registrationFilters.value);
  };

  const deleteRegistration = async (id: string) => {
    await api.delete(`/admin/registrations/${id}`);
    await loadRegistrations(registrationFilters.value);
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
    await loadRegistrations(registrationFilters.value);
    return resp.data;
  };

  const confirmOrderPayment = async (
    orderId: string,
    payload?: {
      paymentId?: string;
      manualReference?: string;
      paidAt?: string;
      proofFile?: string;
      proofUrl?: string;
    }
  ) => {
    await api.post(`/admin/orders/${orderId}/mark-paid`, payload ?? {});
    await loadRegistrations(registrationFilters.value);
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
    downloadFinancialReport,
    updateRegistration,
    cancelRegistration,
    reactivateRegistration,
    deleteRegistration,
    createAdminRegistration,
    refundRegistration,
    markRegistrationsPaid,
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
