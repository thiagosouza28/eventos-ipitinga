import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
export const useAdminStore = defineStore("admin", () => {
    const { api } = useApi();
    const events = ref([]);
    const eventLots = ref({});
    const registrations = ref([]);
    const registrationFilters = ref({});
    const orders = ref([]);
    const dashboard = ref(null);
    const users = ref([]);
    const loadEvents = async () => {
        const response = await api.get("/admin/events");
        events.value = response.data;
        const lotsMap = {};
        response.data.forEach((event) => {
            lotsMap[event.id] = event.lots ?? [];
        });
        eventLots.value = lotsMap;
    };
    const saveEvent = async (payload) => {
        if (payload.id) {
            const response = await api.patch(`/admin/events/${payload.id}`, payload);
            await loadEvents();
            return response.data;
        }
        const response = await api.post("/admin/events", payload);
        await loadEvents();
        return response.data;
    };
    const deleteEvent = async (id) => {
        await api.delete(`/admin/events/${id}`);
        await loadEvents();
    };
    const loadEventLots = async (eventId) => {
        const response = await api.get(`/admin/events/${eventId}/lots`);
        eventLots.value = { ...eventLots.value, [eventId]: response.data };
        const eventIndex = events.value.findIndex((event) => event.id === eventId);
        if (eventIndex >= 0) {
            events.value[eventIndex] = {
                ...events.value[eventIndex],
                lots: response.data
            };
        }
        return response.data;
    };
    const createEventLot = async (eventId, payload) => {
        await api.post(`/admin/events/${eventId}/lots`, payload);
        await loadEventLots(eventId);
        await loadEvents();
        return eventLots.value[eventId] ?? [];
    };
    const updateEventLot = async (eventId, lotId, payload) => {
        await api.patch(`/admin/events/${eventId}/lots/${lotId}`, payload);
        await loadEventLots(eventId);
        await loadEvents();
        return eventLots.value[eventId] ?? [];
    };
    const deleteEventLot = async (eventId, lotId) => {
        await api.delete(`/admin/events/${eventId}/lots/${lotId}`);
        await loadEventLots(eventId);
        await loadEvents();
        return eventLots.value[eventId] ?? [];
    };
    const normalizeFilters = (input) => Object.fromEntries(Object.entries(input ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ""));
    const loadRegistrations = async (filters = {}) => {
        const params = normalizeFilters(filters);
        registrationFilters.value = params;
        const response = await api.get("/admin/registrations", { params });
        registrations.value = response.data;
    };
    const downloadRegistrationReport = async (filters, groupBy, template = "standard") => {
        const params = normalizeFilters({ ...filters, groupBy, template });
        return api.get("/admin/registrations/report.pdf", {
            params,
            responseType: "arraybuffer"
        });
    };
    const downloadFinancialReport = async (eventId) => {
        return api.get(`/admin/financial/events/${eventId}/report.pdf`, {
            responseType: "arraybuffer"
        });
    };
    const updateRegistration = async (id, payload) => {
        await api.patch(`/admin/registrations/${id}`, payload);
        await loadRegistrations(registrationFilters.value);
    };
    const cancelRegistration = async (id) => {
        await api.post(`/admin/registrations/${id}/cancel`);
        await loadRegistrations(registrationFilters.value);
    };
    const reactivateRegistration = async (id) => {
        const response = await api.post(`/admin/registrations/${id}/reactivate`);
        await loadRegistrations(registrationFilters.value);
        return response.data;
    };
    const refundRegistration = async (id, payload) => {
        await api.post(`/admin/registrations/${id}/refund`, payload);
        await loadRegistrations(registrationFilters.value);
    };
    const markRegistrationsPaid = async (registrationIds, payload) => {
        await api.post(`/admin/registrations/mark-paid`, {
            registrationIds,
            ...(payload ?? {})
        });
        await loadRegistrations(registrationFilters.value);
    };
    const deleteRegistration = async (id) => {
        await api.delete(`/admin/registrations/${id}`);
        await loadRegistrations(registrationFilters.value);
    };
    const createAdminRegistration = async (payload) => {
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
    const confirmOrderPayment = async (orderId, payload) => {
        await api.post(`/admin/orders/${orderId}/mark-paid`, payload ?? {});
        await loadRegistrations(registrationFilters.value);
    };
    // Consulta status do pagamento de um pedido (PIX/Manual)
    const getOrderPayment = async (orderId) => {
        const response = await api.get(`/payments/order/${orderId}`);
        return response.data;
    };
    const regenerateRegistrationPaymentLink = async (registrationId) => {
        const response = await api.post(`/admin/registrations/${registrationId}/payment-link`);
        return response.data;
    };
    const getRegistrationHistory = async (registrationId) => {
        const response = await api.get(`/admin/registrations/${registrationId}/history`);
        return response.data;
    };
    const loadOrders = async (filters) => {
        const response = await api.get("/admin/orders", { params: filters });
        orders.value = response.data;
    };
    const loadDashboard = async (eventId) => {
        const response = await api.get(`/admin/checkin/${eventId}`);
        dashboard.value = response.data;
    };
    const checkinScan = async (payload) => {
        const response = await api.post("/admin/checkin/scan", payload);
        return response.data;
    };
    const checkinManualLookup = async (payload) => {
        const response = await api.post("/admin/checkin/manual", payload);
        return response.data;
    };
    const confirmCheckin = async (payload) => {
        const response = await api.post("/admin/checkin/confirm", payload);
        return response.data;
    };
    const uploadAsset = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await api.post("/admin/uploads", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data;
    };
    const loadUsers = async () => {
        const response = await api.get("/admin/users");
        users.value = response.data;
        return users.value;
    };
    const createUser = async (payload) => {
        const response = await api.post("/admin/users", payload);
        await loadUsers();
        return response.data;
    };
    const resetUserPassword = async (userId) => {
        const response = await api.post(`/admin/users/${userId}/reset-password`);
        return response.data;
    };
    return {
        events,
        eventLots,
        registrations,
        orders,
        dashboard,
        users,
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
        getRegistrationHistory,
        loadOrders,
        loadDashboard,
        checkinScan,
        checkinManualLookup,
        confirmCheckin,
        uploadAsset,
        loadUsers,
        createUser,
        resetUserPassword
    };
});
//# sourceMappingURL=admin.js.map