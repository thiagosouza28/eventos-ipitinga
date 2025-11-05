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
    const downloadRegistrationReport = async (filters, groupBy) => {
        const params = normalizeFilters({ ...filters, groupBy });
        return api.get("/admin/registrations/report.pdf", {
            params,
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
    const confirmOrderPayment = async (orderId, payload) => {
        await api.post(`/admin/orders/${orderId}/mark-paid`, payload ?? {});
        await loadRegistrations(registrationFilters.value);
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
        refundRegistration,
        markRegistrationsPaid,
        loadOrders,
        loadDashboard,
        checkinScan,
        checkinManualLookup,
        confirmCheckin
    };
});
//# sourceMappingURL=admin.js.map