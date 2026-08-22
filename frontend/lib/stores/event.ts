import { create } from "zustand";

import { useApi } from "@/lib/api/client";
import type { ChurchDirectorMatch, Event, PaymentMethod } from "@/types/api";

type PersonPayload = {
  fullName: string;
  cpf: string;
  birthDate: string;
  districtId: string;
  churchId: string;
  gender: string;
  photoUrl?: string | null;
  formResponses?: Record<string, unknown> | null;
};

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

type EventState = {
  event: Event | null;
  loading: boolean;
  pendingOrders: PendingOrder[];
  lastOrder: { orderId: string; registrationIds: string[] } | null;
  orderPending: { status?: string; paymentMethod?: string; initPoint?: string } | null;
  fetchEvent: (slug: string) => Promise<void>;
  checkPendingOrder: (buyerCpf: string) => Promise<{ pendingOrders: PendingOrder[]; suggestedChurch: ChurchDirectorMatch | null }>;
  createBatchOrder: (
    buyerCpf: string,
    paymentMethod: PaymentMethod,
    people: PersonPayload[],
    insurance?: { selected: boolean; waiverAccepted: boolean }
  ) => Promise<any>;
  getPaymentData: (orderId: string, options?: { silent?: boolean }) => Promise<any>;
};

export const useEventStore = create<EventState>((set, get) => ({
  event: null,
  loading: false,
  pendingOrders: [],
  lastOrder: null,
  orderPending: null,
  fetchEvent: async (slug: string) => {
    const { api } = useApi();
    set({ loading: true });
    try {
      const response = await api.get(`/events/${slug}`);
      set({ event: response.data });
    } finally {
      set({ loading: false });
    }
  },
  checkPendingOrder: async (buyerCpf: string) => {
    const { api } = useApi();
    const event = get().event;
    if (!event) {
      throw new Error("Evento não carregado");
    }

    const sanitizedCpf = (buyerCpf ?? "").toString().replace(/\D/g, "");
    if (!sanitizedCpf) {
      throw new Error("CPF é obrigatório");
    }

    const response = await api.post("/inscriptions/start", {
      eventId: event.id,
      buyerCpf: sanitizedCpf
    });
    const pendingOrders: PendingOrder[] = response.data.pendingOrders ?? [];
    set({ pendingOrders });

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

    return { pendingOrders, suggestedChurch };
  },
  createBatchOrder: async (buyerCpf, paymentMethod, people, insurance) => {
    const { api } = useApi();
    const event = get().event;
    if (!event) {
      throw new Error("Evento não carregado");
    }
    const response = await api.post("/inscriptions/batch", {
      eventId: event.id,
      buyerCpf,
      paymentMethod,
      insuranceSelected: insurance?.selected ?? false,
      insuranceWaiverAccepted: insurance?.waiverAccepted ?? false,
      people
    });
    set({
      lastOrder: { orderId: response.data.orderId, registrationIds: response.data.registrationIds },
      orderPending: response.data.payment
    });
    return response.data;
  },
  getPaymentData: async (orderId: string, options) => {
    const { api } = useApi();
    const response = await api.get(`/payments/order/${orderId}`, {
      skipLoader: options?.silent === true
    } as any);
    return response.data;
  }
}));
