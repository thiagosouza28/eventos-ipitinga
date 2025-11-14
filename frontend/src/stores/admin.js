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
    const profiles = ref([]);
    const extractArray = (input, fallbackKeys = []) => {
        if (Array.isArray(input)) {
            return input;
        }
        if (input && typeof input === "object") {
            for (const key of fallbackKeys) {
                const value = input[key];
                if (Array.isArray(value)) {
                    return value;
                }
            }
        }
        return [];
    };
    const loadEvents = async () => {
        const response = await api.get("/admin/events");
        const data = extractArray(response.data, ["events", "data"]);
        events.value = data;
        const lotsMap = {};
        data.forEach((event) => {
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
    const updateUser = async (userId, payload) => {
        const response = await api.patch(`/admin/users/${userId}`, payload);
        await loadUsers();
        return response.data;
    };
    const resetUserPassword = async (userId) => {
        const response = await api.post(`/admin/users/${userId}/reset-password`);
        return response.data;
    };
    const updateUserStatus = async (userId, status) => {
        const response = await api.patch(`/admin/users/${userId}/status`, { status });
        await loadUsers();
        return response.data;
    };
    const deleteUser = async (userId) => {
        await api.delete(`/admin/users/${userId}`);
        await loadUsers();
    };
    const loadProfiles = async () => {
        const response = await api.get("/admin/profiles");
        profiles.value = response.data;
        return profiles.value;
    };
    const createProfile = async (payload) => {
        const response = await api.post("/admin/profiles", payload);
        await loadProfiles();
        return response.data;
    };
    const updateProfile = async (profileId, payload) => {
        const response = await api.patch(`/admin/profiles/${profileId}`, payload);
        await loadProfiles();
        return response.data;
    };
    const updateProfileStatus = async (profileId, isActive) => {
        const response = await api.patch(`/admin/profiles/${profileId}/status`, { isActive });
        await loadProfiles();
        return response.data;
    };
    const deleteProfile = async (profileId) => {
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
//# sourceMappingURL=admin.js.map