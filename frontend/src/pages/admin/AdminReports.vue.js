/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AccessDeniedNotice from "../../components/admin/AccessDeniedNotice.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/defaultPhoto";
import { useApi } from "../../composables/useApi";
import { useModulePermissions } from "../../composables/usePermissions";
import { useAdminStore } from "../../stores/admin";
import { useAuthStore } from "../../stores/auth";
import { useCatalogStore } from "../../stores/catalog";
import { formatCurrency } from "../../utils/format";
const props = defineProps();
const router = useRouter();
const route = useRoute();
const admin = useAdminStore();
const catalog = useCatalogStore();
const auth = useAuthStore();
const { api } = useApi();
const reportsPermissions = useModulePermissions("reports");
const financialPermissions = useModulePermissions("financial");
const errorDialog = reactive({
    open: false,
    title: "Erro ao carregar dados",
    message: "",
    details: ""
});
const showError = (title, error) => {
    const details = error?.response?.data?.details;
    errorDialog.open = true;
    errorDialog.title = title;
    errorDialog.message =
        error?.response?.data?.message || error?.message || "Ocorreu um erro inesperado.";
    errorDialog.details = typeof details === "string" ? details : details ? JSON.stringify(details, null, 2) : "";
};
const tabs = computed(() => {
    const hasFinancialAccess = financialPermissions.canView.value || financialPermissions.canFinancial.value;
    return [
        { key: "event", label: "Eventos", visible: reportsPermissions.canView.value },
        { key: "church", label: "Distritos / Igrejas", visible: reportsPermissions.canView.value },
        { key: "financial", label: "Financeiro", visible: hasFinancialAccess }
    ].filter((tab) => tab.visible);
});
const activeTab = ref("event");
const setActiveTab = (tabKey) => {
    if (!tabs.value.length)
        return;
    const fallback = tabs.value[0]?.key;
    const target = tabs.value.some((tab) => tab.key === tabKey) ? tabKey : fallback;
    if (!target)
        return;
    activeTab.value = target;
    if (route.params.tab !== target) {
        router.replace({ name: "admin-reports", params: { tab: target } });
    }
};
watch(() => props.tab, (next) => setActiveTab(next), { immediate: true });
watch(tabs, () => {
    if (!tabs.value.some((tab) => tab.key === activeTab.value)) {
        setActiveTab(tabs.value[0]?.key);
    }
}, { immediate: true });
const currentUser = computed(() => auth.user);
const userRole = computed(() => currentUser.value?.role ?? null);
const isGeneralAdmin = computed(() => userRole.value === "AdminGeral");
const isDirector = computed(() => userRole.value === "DiretorLocal");
const isDistrictAdmin = computed(() => userRole.value === "AdminDistrital");
const scopedDistrictId = computed(() => (isGeneralAdmin.value ? null : currentUser.value?.districtScopeId ?? null));
const scopedChurchId = computed(() => (isGeneralAdmin.value ? null : currentUser.value?.churchId ?? null));
const scopedMinistryIds = computed(() => {
    const ids = new Set();
    if (currentUser.value?.ministryId) {
        ids.add(currentUser.value.ministryId);
    }
    (currentUser.value?.ministries ?? []).forEach((ministry) => {
        if (ministry.id) {
            ids.add(ministry.id);
        }
    });
    return Array.from(ids);
});
const accessibleEvents = computed(() => {
    if (isDirector.value && scopedMinistryIds.value.length) {
        return admin.events.filter((event) => event.ministryId && scopedMinistryIds.value.includes(event.ministryId));
    }
    return admin.events;
});
const accessibleDistricts = computed(() => {
    if (isDirector.value || isDistrictAdmin.value) {
        return catalog.districts.filter((district) => district.id === scopedDistrictId.value);
    }
    return catalog.districts;
});
const lockDistrictSelect = computed(() => (isDirector.value || isDistrictAdmin.value) && Boolean(scopedDistrictId.value));
const lockChurchSelect = computed(() => isDirector.value && Boolean(scopedChurchId.value));
const participantCache = reactive({});
const getCachedParticipants = (eventId) => participantCache[eventId];
const setCachedParticipants = (eventId, participants) => {
    participantCache[eventId] = participants;
};
const eventReport = reactive({
    eventId: "",
    loading: false,
    generatedAt: null
});
const eventParticipants = ref([]);
const selectedEvent = computed(() => accessibleEvents.value.find((event) => event.id === eventReport.eventId) ?? null);
const fetchParticipantsForEvent = async (eventId) => {
    const params = { eventId };
    if (!isGeneralAdmin.value && scopedDistrictId.value) {
        params.districtId = scopedDistrictId.value;
    }
    if (!isGeneralAdmin.value && scopedChurchId.value) {
        params.churchId = scopedChurchId.value;
    }
    const response = await api.get("/admin/registrations", { params });
    return response.data;
};
const loadEventParticipants = async () => {
    if (!eventReport.eventId)
        return;
    eventReport.loading = true;
    try {
        const data = await fetchParticipantsForEvent(eventReport.eventId);
        eventParticipants.value = data;
        setCachedParticipants(eventReport.eventId, data);
        eventReport.generatedAt = new Date();
    }
    catch (error) {
        showError("Erro ao carregar participantes do evento", error);
    }
    finally {
        eventReport.loading = false;
    }
};
const eventDownloadState = ref(false);
const downloadEventReport = async () => {
    if (!eventReport.eventId)
        return;
    eventDownloadState.value = true;
    try {
        const response = await admin.downloadRegistrationReport({ eventId: eventReport.eventId }, "event", "standard");
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const filename = selectedEvent.value?.slug ?? selectedEvent.value?.title ?? "relatorio-evento";
        link.href = url;
        link.download = `relatorio-evento-${filename}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
    catch (error) {
        showError("Erro ao gerar relatório do evento", error);
    }
    finally {
        eventDownloadState.value = false;
    }
};
const churchReport = reactive({
    eventId: "",
    districtId: "",
    churchId: "",
    layout: "single",
    template: "event",
    loading: false
});
const churchParticipants = ref([]);
const churchReportDownloadState = ref(false);
const churchesForSelectedDistrict = computed(() => {
    const districtId = churchReport.districtId || scopedDistrictId.value;
    if (!districtId) {
        return catalog.churches;
    }
    return catalog.churches.filter((church) => church.districtId === districtId);
});
const loadChurchParticipants = async () => {
    if (!churchReport.districtId) {
        showError("Selecione um distrito", new Error("É necessário informar o distrito para gerar o relatório."));
        return;
    }
    churchReport.loading = true;
    try {
        const params = {};
        if (churchReport.eventId)
            params.eventId = churchReport.eventId;
        params.districtId = churchReport.districtId;
        if (churchReport.churchId)
            params.churchId = churchReport.churchId;
        const response = await api.get("/admin/registrations", { params });
        churchParticipants.value = response.data;
    }
    catch (error) {
        showError("Erro ao carregar participantes da igreja", error);
    }
    finally {
        churchReport.loading = false;
    }
};
const downloadChurchReport = async () => {
    if (!churchReport.churchId)
        return;
    churchReportDownloadState.value = true;
    try {
        const baseFilters = {
            eventId: churchReport.eventId || undefined,
            districtId: churchReport.districtId,
            churchId: churchReport.churchId,
            template: churchReport.template
        };
        if (churchReport.template === "event") {
            baseFilters.layout = churchReport.layout;
        }
        const response = await admin.downloadRegistrationReport(baseFilters, "church", churchReport.template);
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `confirmacao-${findChurchName(churchReport.churchId)}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
    catch (error) {
        showError("Erro ao gerar PDF da igreja", error);
    }
    finally {
        churchReportDownloadState.value = false;
    }
};
const financialSummary = ref(null);
const financialLoading = ref(true);
const financialDetailLoading = ref(false);
const financialEventSummary = ref(null);
const selectedFinancialEventId = ref("");
const financialGeneratedAt = ref(null);
const financialDownloadState = ref(false);
const ensureParticipantsForEvent = async (eventId) => {
    if (!eventId)
        return [];
    if (getCachedParticipants(eventId)) {
        return getCachedParticipants(eventId);
    }
    const data = await fetchParticipantsForEvent(eventId);
    setCachedParticipants(eventId, data);
    return data;
};
const refreshFinancialData = async () => {
    if (!selectedFinancialEventId.value) {
        financialEventSummary.value = null;
        return;
    }
    financialDetailLoading.value = true;
    try {
        const [summaryResponse] = await Promise.all([
            api.get(`/admin/financial/events/${selectedFinancialEventId.value}`),
            ensureParticipantsForEvent(selectedFinancialEventId.value)
        ]);
        financialEventSummary.value = summaryResponse.data;
        financialGeneratedAt.value = new Date();
    }
    catch (error) {
        showError("Erro ao carregar resumo financeiro do evento", error);
        financialEventSummary.value = null;
    }
    finally {
        financialDetailLoading.value = false;
    }
};
const downloadFinancialPdf = async () => {
    if (!selectedFinancialEventId.value)
        return;
    financialDownloadState.value = true;
    try {
        const response = await admin.downloadFinancialReport(selectedFinancialEventId.value);
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const eventSlug = findEventTitle(selectedFinancialEventId.value).replace(/\s+/g, "-").toLowerCase();
        link.href = url;
        link.download = `relatorio-financeiro-${eventSlug}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
    catch (error) {
        showError("Erro ao gerar PDF financeiro", error);
    }
    finally {
        financialDownloadState.value = false;
    }
};
const exportFinancialCsv = async () => {
    if (!selectedFinancialEventId.value)
        return;
    const participants = await ensureParticipantsForEvent(selectedFinancialEventId.value);
    if (!participants.length) {
        showError("Nada para exportar", new Error("Carregue os participantes do evento antes de exportar."));
        return;
    }
    const headers = ["Participante", "Status", "Valor", "Igreja", "Distrito"];
    const rows = participants.map((participant) => [
        `"${participant.fullName.replace(/"/g, '""')}"`,
        translateStatus(participant.status),
        (participant.priceCents / 100).toFixed(2).replace(".", ","),
        `"${findChurchName(participant.churchId).replace(/"/g, '""')}"`,
        `"${findDistrictName(participant.districtId).replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro-${findEventTitle(selectedFinancialEventId.value)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
const loadFinancialSummary = async () => {
    if (!financialPermissions.canView.value && !financialPermissions.canFinancial.value) {
        financialLoading.value = false;
        return;
    }
    financialLoading.value = true;
    try {
        const response = await api.get("/admin/financial/summary");
        financialSummary.value = response.data;
    }
    catch (error) {
        showError("Erro ao carregar resumo financeiro geral", error);
        financialSummary.value = null;
    }
    finally {
        financialLoading.value = false;
    }
};
const formatDateTime = (value) => new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const formatDateBr = (value) => new Date(value).toLocaleDateString("pt-BR");
const formatEventPeriod = (event) => {
    const start = formatDateBr(event.startDate);
    const end = formatDateBr(event.endDate);
    if (start === end)
        return start;
    return `${start} a ${end}`;
};
const formatBirthDate = (value) => {
    if (!value)
        return "Não informado";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "Não informado";
    return date.toLocaleDateString("pt-BR");
};
const findEventTitle = (eventId) => admin.events.find((event) => event.id === eventId)?.title ?? "Evento";
const findDistrictName = (districtId) => catalog.districts.find((district) => district.id === districtId)?.name ?? "Não informado";
const findChurchName = (churchId) => catalog.churches.find((church) => church.id === churchId)?.name ?? "Não informado";
const resolvePhotoUrl = (photoUrl) => {
    if (photoUrl && photoUrl.trim().length > 0) {
        return photoUrl;
    }
    return DEFAULT_PHOTO_DATA_URL;
};
const statusLabels = {
    DRAFT: "Rascunho",
    PENDING_PAYMENT: "Pendente",
    PAID: "Pago",
    CHECKED_IN: "Check-in",
    CANCELED: "Cancelada",
    REFUNDED: "Estornada"
};
const translateStatus = (status) => statusLabels[status] ?? status;
const statusBadgeClass = (status) => {
    switch (status) {
        case "PAID":
        case "CHECKED_IN":
            return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
        case "PENDING_PAYMENT":
            return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100";
        case "REFUNDED":
            return "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200";
        case "CANCELED":
            return "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";
        default:
            return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";
    }
};
const eventSummaryCards = computed(() => {
    const participants = eventParticipants.value;
    const groups = new Set(participants.map((participant) => participant.orderId || participant.id));
    const paidCount = participants.filter((participant) => participant.status === "PAID" || participant.status === "CHECKED_IN").length;
    const pendingCount = participants.filter((participant) => participant.status === "PENDING_PAYMENT").length;
    return [
        { label: "Gerado em", value: eventReport.generatedAt ? formatDateTime(eventReport.generatedAt) : "—", accent: "text-neutral-900 dark:text-white" },
        { label: "Total de grupos", value: groups.size.toString().padStart(2, "0"), accent: "text-sky-700 dark:text-sky-300" },
        { label: "Participantes", value: participants.length.toString().padStart(2, "0"), accent: "text-neutral-900 dark:text-white" },
        { label: "Pagos", value: paidCount.toString().padStart(2, "0"), accent: "text-emerald-600 dark:text-emerald-300" },
        { label: "Pendentes", value: pendingCount.toString().padStart(2, "0"), accent: "text-amber-600 dark:text-amber-300" }
    ];
});
const financialParticipants = computed(() => {
    if (!selectedFinancialEventId.value)
        return [];
    if (selectedFinancialEventId.value === eventReport.eventId) {
        return eventParticipants.value;
    }
    return getCachedParticipants(selectedFinancialEventId.value) ?? [];
});
const sumPrice = (items) => items.reduce((total, registration) => total + (registration.priceCents ?? 0), 0);
const financialStatusTotals = computed(() => {
    const paid = financialParticipants.value.filter((participant) => participant.status === "PAID" || participant.status === "CHECKED_IN");
    const pending = financialParticipants.value.filter((participant) => participant.status === "PENDING_PAYMENT");
    const refunded = financialParticipants.value.filter((participant) => participant.status === "REFUNDED");
    return {
        paid: { count: paid.length, amount: sumPrice(paid) },
        pending: { count: pending.length, amount: sumPrice(pending) },
        refunded: { count: refunded.length, amount: sumPrice(refunded) }
    };
});
const financialStatusCards = computed(() => [
    {
        label: "Pagos",
        value: formatCurrency(financialStatusTotals.value.paid.amount),
        helper: `${financialStatusTotals.value.paid.count} inscrições`,
        accent: "text-emerald-600 dark:text-emerald-300"
    },
    {
        label: "Pendentes",
        value: formatCurrency(financialStatusTotals.value.pending.amount),
        helper: `${financialStatusTotals.value.pending.count} aguardando`,
        accent: "text-amber-600 dark:text-amber-300"
    },
    {
        label: "Estornados",
        value: formatCurrency(financialStatusTotals.value.refunded.amount),
        helper: `${financialStatusTotals.value.refunded.count} registros`,
        accent: "text-neutral-600 dark:text-neutral-300"
    },
    {
        label: "Receita líquida do evento",
        value: financialEventSummary.value ? formatCurrency(financialEventSummary.value.totals?.netCents ?? 0) : "—",
        helper: financialEventSummary.value ? `${financialEventSummary.value.paidRegistrationsCount ?? 0} confirmados` : "Selecione um evento",
        accent: "text-sky-700 dark:text-sky-300"
    }
]);
const buildGrouping = (participants, key) => {
    const groups = new Map();
    const paidParticipants = participants.filter((participant) => participant.status === "PAID" || participant.status === "CHECKED_IN");
    paidParticipants.forEach((participant) => {
        const id = participant[key];
        if (!id)
            return;
        const name = key === "districtId" ? findDistrictName(id) : findChurchName(id);
        const group = groups.get(id) ?? { id, name, count: 0, amountCents: 0 };
        group.count += 1;
        group.amountCents += participant.priceCents ?? 0;
        groups.set(id, group);
    });
    return Array.from(groups.values()).sort((a, b) => b.amountCents - a.amountCents);
};
const financialByDistrict = computed(() => buildGrouping(financialParticipants.value, "districtId"));
const financialByChurch = computed(() => buildGrouping(financialParticipants.value, "churchId"));
const generalFinancialCards = computed(() => {
    if (!financialSummary.value) {
        return [];
    }
    const totals = financialSummary.value.totals ?? {};
    return [
        { label: "Receita bruta", value: formatCurrency(totals.grossCents ?? 0), accent: "text-neutral-900 dark:text-white" },
        { label: "Receita líquida", value: formatCurrency(totals.netCents ?? 0), accent: "text-sky-700 dark:text-sky-300" },
        { label: "Taxas", value: `-${formatCurrency(totals.feesCents ?? 0)}`, accent: "text-red-600 dark:text-red-400" },
        { label: "Saldo em caixa", value: formatCurrency(totals.cashBalanceCents ?? 0), accent: "text-emerald-600 dark:text-emerald-300" }
    ];
});
watch(() => eventReport.eventId, async (next, previous) => {
    if (next && next !== previous) {
        await loadEventParticipants();
        if (!churchReport.eventId) {
            churchReport.eventId = next;
        }
        if (!selectedFinancialEventId.value) {
            selectedFinancialEventId.value = next;
        }
    }
});
watch(() => churchReport.districtId, async () => {
    try {
        await catalog.loadChurches(churchReport.districtId || scopedDistrictId.value || undefined);
    }
    catch (error) {
        showError("Erro ao carregar igrejas", error);
    }
    if (churchReport.churchId && !catalog.churches.some((church) => church.id === churchReport.churchId)) {
        churchReport.churchId = "";
    }
});
watch(() => tabs.value.length, (count) => {
    if (!count)
        return;
    setActiveTab(route.params.tab?.toString() ?? tabs.value[0]?.key);
});
watch(() => selectedFinancialEventId.value, async (value, previous) => {
    if (value && value !== previous) {
        await refreshFinancialData();
    }
});
onMounted(async () => {
    try {
        await Promise.all([
            admin.loadEvents(),
            catalog.loadDistricts(),
            catalog.loadChurches(scopedDistrictId.value ?? undefined)
        ]);
        if (scopedDistrictId.value) {
            churchReport.districtId = scopedDistrictId.value;
        }
        if (scopedChurchId.value) {
            churchReport.churchId = scopedChurchId.value;
        }
        if (accessibleEvents.value.length) {
            eventReport.eventId = accessibleEvents.value[0].id;
            if (!churchReport.eventId) {
                churchReport.eventId = accessibleEvents.value[0].id;
            }
            if (!selectedFinancialEventId.value) {
                selectedFinancialEventId.value = accessibleEvents.value[0].id;
            }
        }
        if (reportsPermissions.canView.value && eventReport.eventId) {
            await loadEventParticipants();
        }
        await loadFinancialSummary();
        if (selectedFinancialEventId.value) {
            await refreshFinancialData();
        }
    }
    catch (error) {
        showError("Erro ao carregar dados iniciais", error);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.reportsPermissions.canView) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-6" },
        'data-uppercase-scope': true,
    });
    /** @type {[typeof ErrorDialog, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(ErrorDialog, new ErrorDialog({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.errorDialog.open),
        title: (__VLS_ctx.errorDialog.title),
        message: (__VLS_ctx.errorDialog.message),
        details: (__VLS_ctx.errorDialog.details),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.errorDialog.open),
        title: (__VLS_ctx.errorDialog.title),
        message: (__VLS_ctx.errorDialog.message),
        details: (__VLS_ctx.errorDialog.details),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        'onUpdate:modelValue': (...[$event]) => {
            if (!(__VLS_ctx.reportsPermissions.canView))
                return;
            __VLS_ctx.errorDialog.open = $event;
        }
    };
    var __VLS_2;
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "bg-gradient-to-br from-sky-50 via-blue-100/60 to-blue-200/40 shadow-lg shadow-sky-200/80 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/40" },
    }));
    const __VLS_8 = __VLS_7({
        ...{ class: "bg-gradient-to-br from-sky-50 via-blue-100/60 to-blue-200/40 shadow-lg shadow-sky-200/80 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/40" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_9.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "max-w-3xl" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.35em] text-sky-700 dark:text-sky-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "text-3xl font-semibold text-neutral-900 dark:text-white" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-1 text-sm text-neutral-600 dark:text-neutral-400" },
    });
    var __VLS_9;
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/60 bg-white/90 shadow-lg shadow-neutral-200/70 dark:border-white/10 dark:bg-neutral-950/60 dark:shadow-black/30" },
    }));
    const __VLS_11 = __VLS_10({
        ...{ class: "border border-white/60 bg-white/90 shadow-lg shadow-neutral-200/70 dark:border-white/10 dark:bg-neutral-950/60 dark:shadow-black/30" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
    __VLS_12.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-wrap gap-3" },
    });
    for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.tabs))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.reportsPermissions.canView))
                        return;
                    __VLS_ctx.setActiveTab(tab.key);
                } },
            key: (tab.key),
            type: "button",
            ...{ class: "inline-flex flex-1 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition sm:flex-none sm:px-6 sm:py-3" },
            ...{ class: (__VLS_ctx.activeTab === tab.key ? 'border-sky-600 bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-400/50' : 'border-neutral-200/70 bg-white/70 text-neutral-700 hover:border-sky-200 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70') },
        });
        (tab.label);
    }
    var __VLS_12;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-5" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'event') }, null, null);
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/60 bg-gradient-to-br from-white to-neutral-50 shadow-xl shadow-neutral-200/70 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-900/70 dark:shadow-black/40" },
    }));
    const __VLS_14 = __VLS_13({
        ...{ class: "border border-white/60 bg-gradient-to-br from-white to-neutral-50 shadow-xl shadow-neutral-200/70 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-900/70 dark:shadow-black/40" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.eventReport.eventId),
        ...{ class: "mt-2 w-full rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
        disabled: true,
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.accessibleEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (event.id),
            value: (event.id),
        });
        (event.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-wrap gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadEventParticipants) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center rounded-full border border-neutral-300/80 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
        disabled: (__VLS_ctx.eventReport.loading || !__VLS_ctx.eventReport.eventId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.downloadEventReport) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900" },
        disabled: (!__VLS_ctx.eventReport.eventId || __VLS_ctx.eventDownloadState),
    });
    if (__VLS_ctx.eventDownloadState) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.eventDownloadState ? "Gerando..." : "Baixar PDF");
    if (__VLS_ctx.selectedEvent) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-2xl border border-neutral-200/90 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2 text-lg font-semibold text-neutral-900 dark:text-white" },
        });
        (__VLS_ctx.selectedEvent.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
        });
        (__VLS_ctx.formatEventPeriod(__VLS_ctx.selectedEvent));
        (__VLS_ctx.selectedEvent.location);
        for (const [card] of __VLS_getVForSourceType((__VLS_ctx.eventSummaryCards))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (card.label),
                ...{ class: "rounded-2xl border border-neutral-200/80 bg-white/80 p-4 text-neutral-800 shadow-inner shadow-sky-100/30 dark:border-white/10 dark:bg-white/5 dark:text-white" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" },
            });
            (card.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "mt-2 text-2xl font-bold" },
                ...{ class: (card.accent) },
            });
            (card.value);
        }
    }
    var __VLS_15;
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/60 bg-white/95 shadow-2xl shadow-neutral-200/80 dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/50" },
    }));
    const __VLS_17 = __VLS_16({
        ...{ class: "border border-white/60 bg-white/95 shadow-2xl shadow-neutral-200/80 dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/50" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    __VLS_18.slots.default;
    if (__VLS_ctx.eventReport.loading) {
        /** @type {[typeof TableSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
            helperText: "Carregando participantes do evento...",
        }));
        const __VLS_20 = __VLS_19({
            helperText: "Carregando participantes do evento...",
        }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        if (!__VLS_ctx.eventParticipants.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "p-6 text-sm text-neutral-500 dark:text-neutral-400" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "overflow-x-auto" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                ...{ class: "min-w-full table-auto text-sm text-neutral-700 dark:text-neutral-200" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
                ...{ class: "bg-neutral-900 text-[11px] uppercase tracking-[0.3em] text-white dark:bg-neutral-800" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                ...{ class: "px-4 py-3 text-left" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                ...{ class: "px-4 py-3 text-left" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                ...{ class: "px-4 py-3 text-left" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                ...{ class: "px-4 py-3 text-left" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                ...{ class: "px-4 py-3 text-left" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                ...{ class: "px-4 py-3 text-left" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                ...{ class: "px-4 py-3 text-left" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
            for (const [participant] of __VLS_getVForSourceType((__VLS_ctx.eventParticipants))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                    key: (participant.id),
                    ...{ class: "border-b border-neutral-100/80 bg-white/90 text-neutral-800 transition odd:bg-white even:bg-neutral-50 hover:bg-sky-50/70 dark:border-white/5 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                    ...{ class: "px-4 py-3 font-semibold" },
                });
                (participant.fullName);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                    ...{ class: "px-4 py-3 text-neutral-600 dark:text-neutral-300" },
                });
                (__VLS_ctx.findChurchName(participant.churchId));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                    ...{ class: "px-4 py-3 text-neutral-600 dark:text-neutral-300" },
                });
                (__VLS_ctx.findDistrictName(participant.districtId));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                    ...{ class: "px-4 py-3 text-neutral-600 dark:text-neutral-300" },
                });
                (__VLS_ctx.formatBirthDate(participant.birthDate));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                    ...{ class: "px-4 py-3 text-neutral-600 dark:text-neutral-300" },
                });
                (participant.ageYears ?? '-');
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                    ...{ class: "px-4 py-3" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]" },
                    ...{ class: (__VLS_ctx.statusBadgeClass(participant.status)) },
                });
                (__VLS_ctx.translateStatus(participant.status));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                    ...{ class: "px-4 py-3 text-neutral-700 dark:text-neutral-200" },
                });
                (__VLS_ctx.findEventTitle(participant.eventId));
            }
        }
    }
    var __VLS_18;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-5" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'church') }, null, null);
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/60 bg-gradient-to-br from-white to-neutral-50 shadow-xl shadow-neutral-200/70 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-900/70" },
    }));
    const __VLS_23 = __VLS_22({
        ...{ class: "border border-white/60 bg-gradient-to-br from-white to-neutral-50 shadow-xl shadow-neutral-200/70 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-900/70" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    __VLS_24.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid gap-5 md:grid-cols-2 xl:grid-cols-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.churchReport.eventId),
        ...{ class: "w-full rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.accessibleEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (event.id),
            value: (event.id),
        });
        (event.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.churchReport.districtId),
        disabled: (__VLS_ctx.lockDistrictSelect),
        ...{ class: "w-full rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    (__VLS_ctx.lockDistrictSelect ? "Distrito vinculado" : "Todos");
    for (const [district] of __VLS_getVForSourceType((__VLS_ctx.accessibleDistricts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (district.id),
            value: (district.id),
        });
        (district.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.churchReport.churchId),
        disabled: (__VLS_ctx.lockChurchSelect || !__VLS_ctx.churchReport.districtId),
        ...{ class: "w-full rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    (__VLS_ctx.lockChurchSelect ? "Igreja vinculada" : __VLS_ctx.churchReport.districtId ? "Todas" : "Selecione o distrito");
    for (const [church] of __VLS_getVForSourceType((__VLS_ctx.churchesForSelectedDistrict))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (church.id),
            value: (church.id),
        });
        (church.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.churchReport.layout),
        disabled: (__VLS_ctx.churchReport.template !== 'event'),
        ...{ class: "w-full rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "single",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "two",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "four",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.churchReport.template),
        ...{ class: "w-full rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "event",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "standard",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-4 flex flex-wrap gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadChurchParticipants) },
        type: "button",
        ...{ class: "inline-flex flex-1 items-center justify-center rounded-full border border-neutral-300/80 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
        disabled: (__VLS_ctx.churchReport.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.downloadChurchReport) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-400/50 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" },
        disabled: (!__VLS_ctx.churchReport.churchId || __VLS_ctx.churchReportDownloadState),
    });
    if (__VLS_ctx.churchReportDownloadState) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.churchReportDownloadState ? "Gerando..." : "Gerar PDF");
    var __VLS_24;
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/60 bg-white/95 shadow-2xl shadow-neutral-200/80 dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/40" },
    }));
    const __VLS_26 = __VLS_25({
        ...{ class: "border border-white/60 bg-white/95 shadow-2xl shadow-neutral-200/80 dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/40" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    if (__VLS_ctx.churchReport.loading) {
        /** @type {[typeof TableSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
            helperText: "Carregando participantes...",
        }));
        const __VLS_29 = __VLS_28({
            helperText: "Carregando participantes...",
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        if (!__VLS_ctx.churchParticipants.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "p-6 text-sm text-neutral-500 dark:text-neutral-400" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "grid gap-5 md:grid-cols-2 xl:grid-cols-3" },
            });
            for (const [participant] of __VLS_getVForSourceType((__VLS_ctx.churchParticipants))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                    key: (participant.id),
                    ...{ class: "flex flex-col gap-4 rounded-3xl border border-neutral-100/80 bg-white/95 p-5 shadow-xl shadow-sky-50/70 transition hover:-translate-y-0.5 hover:shadow-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/30" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-start gap-4" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/80 bg-neutral-100 dark:border-white/20" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (__VLS_ctx.resolvePhotoUrl(participant.photoUrl)),
                    alt: (participant.fullName ? 'Foto de ' + participant.fullName : 'Foto do participante'),
                    ...{ class: "h-full w-full object-cover" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex-1 space-y-1 text-sm text-neutral-600 dark:text-neutral-300" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-base font-semibold uppercase tracking-[0.18em] text-neutral-900 dark:text-white" },
                });
                (participant.fullName);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                });
                (__VLS_ctx.formatBirthDate(participant.birthDate));
                (participant.ageYears ?? '-');
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "font-semibold text-neutral-800 dark:text-white" },
                });
                (__VLS_ctx.findChurchName(participant.churchId));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "font-semibold text-neutral-800 dark:text-white" },
                });
                (__VLS_ctx.findDistrictName(participant.districtId));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs font-semibold uppercase text-sky-700 dark:text-sky-300" },
                });
                (__VLS_ctx.findEventTitle(participant.eventId));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 text-sm leading-relaxed text-neutral-600 shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-neutral-200" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "mt-2 text-sm text-neutral-700 dark:text-neutral-200" },
                });
            }
        }
    }
    var __VLS_27;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-5" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'financial') }, null, null);
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/60 bg-gradient-to-br from-white to-neutral-50 shadow-xl shadow-neutral-200/70 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-900/70" },
    }));
    const __VLS_32 = __VLS_31({
        ...{ class: "border border-white/60 bg-gradient-to-br from-white to-neutral-50 shadow-xl shadow-neutral-200/70 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-900/70" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    __VLS_33.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedFinancialEventId),
        ...{ class: "mt-2 w-full rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.accessibleEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (event.id),
            value: (event.id),
        });
        (event.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-wrap gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshFinancialData) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center rounded-full border border-neutral-300/80 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
        disabled: (__VLS_ctx.financialDetailLoading || !__VLS_ctx.selectedFinancialEventId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.downloadFinancialPdf) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900" },
        disabled: (!__VLS_ctx.selectedFinancialEventId || __VLS_ctx.financialDownloadState),
    });
    if (__VLS_ctx.financialDownloadState) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.financialDownloadState ? "Gerando..." : "PDF do evento");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportFinancialCsv) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center rounded-full border border-sky-500 px-6 py-2.5 text-sm font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-300 dark:text-sky-200 dark:hover:bg-sky-900/30" },
        disabled: (!__VLS_ctx.selectedFinancialEventId),
    });
    var __VLS_33;
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/60 bg-white/95 shadow-2xl shadow-neutral-200/80 dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/50" },
    }));
    const __VLS_35 = __VLS_34({
        ...{ class: "border border-white/60 bg-white/95 shadow-2xl shadow-neutral-200/80 dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/50" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    __VLS_36.slots.default;
    if (__VLS_ctx.financialLoading) {
        /** @type {[typeof TableSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
            helperText: "Carregando resumo financeiro...",
        }));
        const __VLS_38 = __VLS_37({
            helperText: "Carregando resumo financeiro...",
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        if (!__VLS_ctx.financialSummary) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "p-6 text-sm text-neutral-500 dark:text-neutral-400" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-y-6" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "grid gap-4 md:grid-cols-2 xl:grid-cols-4" },
            });
            for (const [card] of __VLS_getVForSourceType((__VLS_ctx.generalFinancialCards))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (card.label),
                    ...{ class: "rounded-2xl border border-neutral-200/80 bg-white/90 p-4 shadow-inner shadow-sky-100/30 dark:border-white/10 dark:bg-white/5" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" },
                });
                (card.label);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "mt-2 text-2xl font-bold" },
                    ...{ class: (card.accent) },
                });
                (card.value);
            }
            if (__VLS_ctx.financialSummary.events?.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "overflow-x-auto" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                    ...{ class: "min-w-full table-auto text-sm text-neutral-600 dark:text-neutral-300" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
                    ...{ class: "bg-neutral-900 text-[11px] uppercase tracking-[0.3em] text-white" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                    ...{ class: "px-4 py-3 text-left" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                    ...{ class: "px-4 py-3 text-right" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                    ...{ class: "px-4 py-3 text-right" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                    ...{ class: "px-4 py-3 text-right" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
                    ...{ class: "px-4 py-3 text-right" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
                for (const [item] of __VLS_getVForSourceType((__VLS_ctx.financialSummary.events))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                        key: (item.event.id),
                        ...{ class: "border-b border-neutral-100/70 bg-white/90 dark:border-white/5 dark:bg-white/5" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                        ...{ class: "px-4 py-3 font-semibold text-neutral-900 dark:text-white" },
                    });
                    (item.event.title);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                        ...{ class: "px-4 py-3 text-right text-neutral-700 dark:text-neutral-200" },
                    });
                    (__VLS_ctx.formatCurrency(item.grossCents));
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                        ...{ class: "px-4 py-3 text-right text-red-600 dark:text-red-400" },
                    });
                    (__VLS_ctx.formatCurrency(item.feesCents));
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                        ...{ class: "px-4 py-3 text-right text-sky-700 dark:text-sky-300" },
                    });
                    (__VLS_ctx.formatCurrency(item.netCents));
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                        ...{ class: "px-4 py-3 text-right" },
                    });
                    (item.ordersCount);
                }
            }
            if (__VLS_ctx.selectedFinancialEventId) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "space-y-5 rounded-3xl border border-neutral-100/80 bg-white/95 p-5 shadow-inner shadow-neutral-200/60 dark:border-white/10 dark:bg-neutral-900/50" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs uppercase tracking-[0.35em] text-sky-700 dark:text-sky-300" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
                    ...{ class: "text-xl font-semibold text-neutral-900 dark:text-white" },
                });
                (__VLS_ctx.findEventTitle(__VLS_ctx.selectedFinancialEventId));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                });
                (__VLS_ctx.financialGeneratedAt ? __VLS_ctx.formatDateTime(__VLS_ctx.financialGeneratedAt) : "—");
                if (__VLS_ctx.financialDetailLoading) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "py-10" },
                    });
                    /** @type {[typeof TableSkeleton, ]} */ ;
                    // @ts-ignore
                    const __VLS_40 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
                        rows: (2),
                        helperText: "Sincronizando financeiro do evento...",
                    }));
                    const __VLS_41 = __VLS_40({
                        rows: (2),
                        helperText: "Sincronizando financeiro do evento...",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "space-y-5" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "grid gap-4 md:grid-cols-2 xl:grid-cols-4" },
                    });
                    for (const [card] of __VLS_getVForSourceType((__VLS_ctx.financialStatusCards))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            key: (card.label),
                            ...{ class: "rounded-2xl border border-neutral-200/80 bg-white/90 p-4 shadow-inner shadow-neutral-100/40 dark:border-white/10 dark:bg-white/5" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                            ...{ class: "text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" },
                        });
                        (card.label);
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                            ...{ class: "mt-2 text-2xl font-bold" },
                            ...{ class: (card.accent) },
                        });
                        (card.value);
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                            ...{ class: "text-xs text-neutral-500" },
                        });
                        (card.helper);
                    }
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "grid gap-5 md:grid-cols-2" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "space-y-3" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-200" },
                    });
                    for (const [district] of __VLS_getVForSourceType((__VLS_ctx.financialByDistrict))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            key: (district.id),
                            ...{ class: "flex items-center justify-between rounded-2xl border border-neutral-100/80 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                            ...{ class: "font-semibold text-neutral-900 dark:text-white" },
                        });
                        (district.name);
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                            ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                        });
                        (district.count);
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                            ...{ class: "text-base font-bold text-sky-700 dark:text-sky-200" },
                        });
                        (__VLS_ctx.formatCurrency(district.amountCents));
                    }
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "space-y-3" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-200" },
                    });
                    for (const [church] of __VLS_getVForSourceType((__VLS_ctx.financialByChurch))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            key: (church.id),
                            ...{ class: "flex items-center justify-between rounded-2xl border border-neutral-100/80 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                            ...{ class: "font-semibold text-neutral-900 dark:text-white" },
                        });
                        (church.name);
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                            ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                        });
                        (church.count);
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                            ...{ class: "text-base font-bold text-emerald-700 dark:text-emerald-200" },
                        });
                        (__VLS_ctx.formatCurrency(church.amountCents));
                    }
                }
            }
        }
    }
    var __VLS_36;
}
else {
    /** @type {[typeof AccessDeniedNotice, ]} */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(AccessDeniedNotice, new AccessDeniedNotice({
        module: "Relatórios",
    }));
    const __VLS_44 = __VLS_43({
        module: "Relatórios",
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    var __VLS_46 = {};
    var __VLS_45;
}
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-sky-50']} */ ;
/** @type {__VLS_StyleScopedClasses['via-blue-100/60']} */ ;
/** @type {__VLS_StyleScopedClasses['to-blue-200/40']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sky-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-neutral-900/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-primary-950/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sky-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-sky-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/30']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-none']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['to-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-sky-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['xl:grid-cols-5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/90']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sky-100/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/95']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['table-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['odd:bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['even:bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-sky-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['to-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['xl:grid-cols-5']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-sky-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-sky-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-sky-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-sky-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-sky-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-sky-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sky-400/50']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/95']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/40']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['xl:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/95']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sky-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:shadow-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/30']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-16']} */ ;
/** @type {__VLS_StyleScopedClasses['w-16']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.18em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sky-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-sky-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['to-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-sky-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sky-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-sky-50']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-sky-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-sky-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-sky-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/95']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['xl:grid-cols-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sky-100/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['table-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sky-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-sky-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/95']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sky-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-sky-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['py-10']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['xl:grid-cols-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-100/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sky-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-sky-200']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-200']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AccessDeniedNotice: AccessDeniedNotice,
            BaseCard: BaseCard,
            ErrorDialog: ErrorDialog,
            TableSkeleton: TableSkeleton,
            formatCurrency: formatCurrency,
            reportsPermissions: reportsPermissions,
            errorDialog: errorDialog,
            tabs: tabs,
            activeTab: activeTab,
            setActiveTab: setActiveTab,
            accessibleEvents: accessibleEvents,
            accessibleDistricts: accessibleDistricts,
            lockDistrictSelect: lockDistrictSelect,
            lockChurchSelect: lockChurchSelect,
            eventReport: eventReport,
            eventParticipants: eventParticipants,
            selectedEvent: selectedEvent,
            loadEventParticipants: loadEventParticipants,
            eventDownloadState: eventDownloadState,
            downloadEventReport: downloadEventReport,
            churchReport: churchReport,
            churchParticipants: churchParticipants,
            churchReportDownloadState: churchReportDownloadState,
            churchesForSelectedDistrict: churchesForSelectedDistrict,
            loadChurchParticipants: loadChurchParticipants,
            downloadChurchReport: downloadChurchReport,
            financialSummary: financialSummary,
            financialLoading: financialLoading,
            financialDetailLoading: financialDetailLoading,
            selectedFinancialEventId: selectedFinancialEventId,
            financialGeneratedAt: financialGeneratedAt,
            financialDownloadState: financialDownloadState,
            refreshFinancialData: refreshFinancialData,
            downloadFinancialPdf: downloadFinancialPdf,
            exportFinancialCsv: exportFinancialCsv,
            formatDateTime: formatDateTime,
            formatEventPeriod: formatEventPeriod,
            formatBirthDate: formatBirthDate,
            findEventTitle: findEventTitle,
            findDistrictName: findDistrictName,
            findChurchName: findChurchName,
            resolvePhotoUrl: resolvePhotoUrl,
            translateStatus: translateStatus,
            statusBadgeClass: statusBadgeClass,
            eventSummaryCards: eventSummaryCards,
            financialStatusCards: financialStatusCards,
            financialByDistrict: financialByDistrict,
            financialByChurch: financialByChurch,
            generalFinancialCards: generalFinancialCards,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=AdminReports.vue.js.map