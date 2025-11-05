import { defineStore } from "pinia";
import { ref } from "vue";

import { useApi } from "../composables/useApi";
import type { Event, PaymentMethod } from "../types/api";

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
    
    // Validação adicional para garantir que o CPF seja válido
    if (!buyerCpf || typeof buyerCpf !== "string" || buyerCpf.trim().length === 0) {
      throw new Error("CPF é obrigatório");
    }
    
    const response = await api.post("/inscriptions/start", {
      eventId: event.value.id,
      buyerCpf: buyerCpf.trim()
    });
    pendingOrders.value = response.data.pendingOrders ?? [];
    return { pendingOrders: pendingOrders.value };
  };

  const createBatchOrder = async (
    buyerCpf: string,
    paymentMethod: PaymentMethod,
    people: PersonPayload[]
  ) => {
    if (!event.value) throw new Error("Evento nao carregado");
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
