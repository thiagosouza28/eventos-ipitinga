import { defineStore } from "pinia";
import { ref } from "vue";

import { useApi } from "../composables/useApi";
import type { Event, EventLot, Order, Registration } from "../types/api";

export const useAdminStore = defineStore("admin", () => {
  const { api } = useApi();
  const events = ref<Event[]>([]);
  const eventLots = ref<Record<string, EventLot[]>>({});
  const registrations = ref<Registration[]>([]);
  const registrationFilters = ref<Record<string, unknown>>({});
  const orders = ref<Order[]>([]);
  const dashboard = ref<Record<string, unknown> | null>(null);

  const loadEvents = async () => {
    const response = await api.get("/admin/events");
    events.value = response.data;
    const lotsMap: Record<string, EventLot[]> = {};
    response.data.forEach((event: Event) => {
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

  const downloadRegistrationReport = async (filters: Record<string, unknown>, groupBy: "event" | "church") => {
    const params = normalizeFilters({ ...filters, groupBy });
    return api.get<ArrayBuffer>("/admin/registrations/report.pdf", {
      params,
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
    payload?: { paymentId?: string; manualReference?: string; paidAt?: string }
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
    };
  };

  const loadOrders = async (filters: Record<string, unknown>) => {
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

  return {
    events,
    eventLots,
    registrations,
    orders,
    dashboard,
    loadEvents,
    saveEvent,
    deleteEvent,
    loadEventLots,
    createEventLot,
    updateEventLot,
    deleteEventLot,
    loadRegistrations,
    downloadRegistrationReport,
    updateRegistration,
    cancelRegistration,
    deleteRegistration,
    createAdminRegistration,
    refundRegistration,
    markRegistrationsPaid,
    getOrderPayment,
    loadOrders,
    loadDashboard,
    checkinScan,
    checkinManualLookup,
    confirmCheckin
  };
});
