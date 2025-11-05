import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
export const useEventStore = defineStore("event", () => {
    const { api } = useApi();
    const event = ref(null);
    const loading = ref(false);
    const pendingOrders = ref([]);
    const lastOrder = ref(null);
    const orderPending = ref(null);
    const fetchEvent = async (slug) => {
        loading.value = true;
        try {
            const response = await api.get(`/events/${slug}`);
            event.value = response.data;
        }
        finally {
            loading.value = false;
        }
    };
    const checkPendingOrder = async (buyerCpf) => {
        if (!event.value)
            return;
        const response = await api.post("/inscriptions/start", {
            eventId: event.value.id,
            buyerCpf
        });
        pendingOrders.value = response.data.pendingOrders ?? [];
        return { pendingOrders: pendingOrders.value };
    };
    const createBatchOrder = async (buyerCpf, paymentMethod, people) => {
        if (!event.value)
            throw new Error("Evento nao carregado");
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
    const getPaymentData = async (orderId) => {
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
//# sourceMappingURL=event.js.map