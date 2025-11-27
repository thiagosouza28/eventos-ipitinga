import { defineStore } from "pinia";
import { ref } from "vue";

import { useApi } from "../composables/useApi";
import type { Event, PaymentMethod, ChurchDirectorMatch } from "../types/api";

type PersonPayload = {
  fullName: string;
  cpf: string;
  birthDate: string;
  districtId: string;
  churchId: string;
  gender: string;
  photoUrl?: string | null;
};

export const useEventStore = defineStore("event", () => {
  const { api } = useApi();
  const event = ref<Event | null>(null);
  const loading = ref(false);
  type PendingRegistration = {
    id: string;
    fullName: string;
    cpf: string;
  };

  type PendingOrder = {
    orderId: string;
    expiresAt: string;
    totalCents: number;
    registrations: PendingRegistration[];
    payment: {
      status?: string;
      paymentMethod?: string;
      initPoint?: string;
    } | null;
  };

  const pendingOrders = ref<PendingOrder[]>([]);
  const lastOrder = ref<{ orderId: string; registrationIds: string[] } | null>(null);
  const orderPending = ref<{ status?: string; paymentMethod?: string; initPoint?: string } | null>(null);

  const fetchEvent = async (slug: string) => {
    loading.value = true;
    try {
      const response = await api.get(`/events/${slug}`);
      event.value = response.data;
    } finally {
      loading.value = false;
    }
  };

  const checkPendingOrder = async (buyerCpf: string) => {
    if (!event.value) {
      throw new Error("Evento não carregado");
    }

    const sanitizedCpf = (buyerCpf ?? "").toString().replace(/\D/g, "");
    if (!sanitizedCpf) {
      throw new Error("CPF é obrigatório");
    }

    const response = await api.post("/inscriptions/start", {
      eventId: event.value.id,
      buyerCpf: sanitizedCpf
    });
    pendingOrders.value = response.data.pendingOrders ?? [];

    let suggestedChurch: ChurchDirectorMatch | null = null;
    try {
      const directorResponse = await api.get("/catalog/churches/director", {
        params: { cpf: sanitizedCpf }
      });
      suggestedChurch = directorResponse.data ?? null;
    } catch (error: any) {
      if (!error?.response || error.response.status !== 404) {
        console.warn("Falha ao buscar igreja do diretor pelo CPF", error);
      }
    }

    return { pendingOrders: pendingOrders.value, suggestedChurch };
  };

  const createBatchOrder = async (
    buyerCpf: string,
    paymentMethod: PaymentMethod,
    people: PersonPayload[]
  ) => {
    if (!event.value) throw new Error("Evento não carregado");
    const response = await api.post("/inscriptions/batch", {
      eventId: event.value.id,
      buyerCpf,
      paymentMethod,
      people
    });
    lastOrder.value = {
      orderId: response.data.orderId,
      registrationIds: response.data.registrationIds
    };
    orderPending.value = response.data.payment;
    return response.data;
  };

  const getPaymentData = async (orderId: string) => {
    const response = await api.get(`/payments/order/${orderId}`);
    return response.data;
  };

  return {
    event,
    loading,
    orderPending,
    lastOrder,
    fetchEvent,
    checkPendingOrder,
    createBatchOrder,
    getPaymentData
  };
});
