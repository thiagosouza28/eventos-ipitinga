/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { reactive, ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { RouterLink } from 'vue-router';
import DateField from '../../components/forms/DateField.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import ErrorDialog from '../../components/ui/ErrorDialog.vue';
import AccessDeniedNotice from '../../components/admin/AccessDeniedNotice.vue';
import TableSkeleton from '../../components/ui/TableSkeleton.vue';
import { useAdminStore } from '../../stores/admin';
import { useCatalogStore } from '../../stores/catalog';
import { useAuthStore } from '../../stores/auth';
import { formatCurrency } from '../../utils/format';
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue';
import { validateCPF, normalizeCPF, formatCPF } from '../../utils/cpf';
import { paymentMethodLabel, PAYMENT_METHODS, ADMIN_ONLY_PAYMENT_METHODS } from '../../config/paymentMethods';
import { DEFAULT_PHOTO_DATA_URL } from '../../config/defaultPhoto';
import { useModulePermissions } from '../../composables/usePermissions';
import { createPreviewSession } from '../../utils/documentPreview';
const admin = useAdminStore();
const catalog = useCatalogStore();
const auth = useAuthStore();
const registrationPermissions = useModulePermissions('registrations');
const reportsPermissions = useModulePermissions('reports');
const canGenerateListPdf = computed(() => reportsPermissions.canReports.value);
const isAdminUser = computed(() => {
    const role = auth.user?.role;
    return role === 'AdminGeral' || role === 'AdminDistrital';
});
const filters = reactive({
    eventId: '',
    lotId: '',
    districtId: '',
    churchId: '',
    status: '',
    search: ''
});
const currentUser = computed(() => auth.user);
const userRole = computed(() => currentUser.value?.role ?? null);
const isLocalDirector = computed(() => userRole.value === 'DiretorLocal');
const hideFilters = computed(() => isLocalDirector.value);
const lockedDistrictId = computed(() => (isLocalDirector.value ? currentUser.value?.districtScopeId ?? '' : ''));
const lockedChurchId = computed(() => (isLocalDirector.value ? currentUser.value?.churchId ?? '' : ''));
const activeEventId = computed(() => admin.events.find((event) => event.isActive)?.id ?? admin.events[0]?.id ?? '');
const lockedEventId = computed(() => (isLocalDirector.value ? activeEventId.value : ''));
const isDistrictFilterLocked = computed(() => isLocalDirector.value && Boolean(lockedDistrictId.value));
const isChurchFilterLocked = computed(() => isLocalDirector.value && Boolean(lockedChurchId.value));
const isEventFilterLocked = computed(() => isLocalDirector.value && Boolean(lockedEventId.value));
const statusLabels = {
    DRAFT: 'Rascunho',
    PENDING_PAYMENT: 'Pendente',
    PAID: 'Pago',
    CANCELED: 'Cancelada',
    REFUNDED: 'Estornada',
    CHECKED_IN: 'Check-in realizado'
};
const registrationStatusOptions = [
    { value: 'DRAFT', label: statusLabels.DRAFT },
    { value: 'PENDING_PAYMENT', label: statusLabels.PENDING_PAYMENT },
    { value: 'PAID', label: statusLabels.PAID },
    { value: 'CHECKED_IN', label: statusLabels.CHECKED_IN },
    { value: 'CANCELED', label: statusLabels.CANCELED },
    { value: 'REFUNDED', label: statusLabels.REFUNDED }
];
const lotsForSelectedEvent = computed(() => {
    if (!filters.eventId)
        return [];
    const fromStore = admin.eventLots[filters.eventId];
    if (fromStore)
        return fromStore;
    const event = admin.events.find((item) => item.id === filters.eventId);
    return event?.lots ?? [];
});
const selectedLotName = computed(() => lotsForSelectedEvent.value.find((lot) => lot.id === filters.lotId)?.name ?? '');
const selectedRegistrationIds = ref(new Set());
const paymentDialog = reactive({
    open: false,
    loading: false,
    error: '',
    items: [],
    successOrderId: null,
    successLink: null,
    paymentMethod: ''
});
const manualConfirmDialog = reactive({
    open: false,
    loading: false,
    error: '',
    items: [],
    paymentMethod: ''
});
const manualConfirmPaymentOptions = computed(() => {
    const first = manualConfirmDialog.items[0];
    if (!first)
        return [];
    return resolveAllowedPaymentMethods(first.eventId);
});
const paymentDialogAllowedMethods = computed(() => {
    const first = paymentDialog.items[0];
    if (!first)
        return [];
    return resolveAllowedPaymentMethods(first.eventId);
});
const genderOptions = [
    { value: 'MALE', label: 'Masculino' },
    { value: 'FEMALE', label: 'Feminino' },
    { value: 'OTHER', label: 'Outro' }
];
const filtersReady = ref(false);
const isApplying = ref(false);
let applyDebounce = null;
const pendingApply = ref(false);
let searchDebounce = null;
const debouncedSearch = ref('');
const isMobile = ref(false);
const updateMobileState = () => {
    if (typeof window === 'undefined')
        return;
    isMobile.value = window.matchMedia('(max-width: 768px)').matches;
};
const shouldAutoApply = computed(() => hideFilters.value || !isMobile.value);
const listPdfState = reactive({ loading: false });
const errorDialog = reactive({ open: false, title: 'Ocorreu um erro', message: '', details: '' });
const extractErrorInfo = (error) => {
    const anyError = error;
    const responseData = anyError?.response?.data ?? {};
    const message = (typeof responseData.message === 'string' && responseData.message) || anyError?.message || 'Ocorreu um erro inesperado.';
    let details = '';
    const raw = responseData?.details;
    if (raw)
        details = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    return { message, details };
};
const showError = (title, error) => {
    const { message, details } = extractErrorInfo(error);
    errorDialog.title = title;
    errorDialog.message = message;
    errorDialog.details = details;
    errorDialog.open = true;
};
const applyScopedFilters = () => {
    if (!isLocalDirector.value) {
        return false;
    }
    let hasChanged = false;
    if (lockedEventId.value && filters.eventId !== lockedEventId.value) {
        filters.eventId = lockedEventId.value;
        hasChanged = true;
    }
    if (lockedDistrictId.value && filters.districtId !== lockedDistrictId.value) {
        filters.districtId = lockedDistrictId.value;
        hasChanged = true;
    }
    if (lockedChurchId.value && filters.churchId !== lockedChurchId.value) {
        filters.churchId = lockedChurchId.value;
        hasChanged = true;
    }
    return hasChanged;
};
const buildFilterParams = () => {
    const base = isLocalDirector.value
        ? {
            eventId: lockedEventId.value || undefined,
            districtId: lockedDistrictId.value || undefined,
            churchId: lockedChurchId.value || undefined,
            lotId: filters.lotId || undefined
        }
        : {
            eventId: filters.eventId || undefined,
            lotId: filters.lotId || undefined,
            districtId: filters.districtId || undefined,
            churchId: filters.churchId || undefined
        };
    return {
        ...base,
        status: filters.status || undefined,
        search: filters.search || undefined
    };
};
const applyFilters = async () => {
    if (!registrationPermissions.canList.value) {
        return;
    }
    if (isApplying.value) {
        pendingApply.value = true;
        return;
    }
    if (applyDebounce) {
        window.clearTimeout(applyDebounce);
        applyDebounce = null;
    }
    isApplying.value = true;
    try {
        await admin.loadRegistrations(buildFilterParams());
    }
    catch (error) {
        showError('Falha ao carregar inscrições', error);
    }
    finally {
        isApplying.value = false;
        if (pendingApply.value) {
            pendingApply.value = false;
            scheduleApply(true);
        }
    }
};
const scheduleApply = (immediate = false) => {
    if (!filtersReady.value)
        return;
    if (!shouldAutoApply.value && !immediate)
        return;
    if (immediate) {
        applyFilters();
        return;
    }
    if (applyDebounce)
        window.clearTimeout(applyDebounce);
    applyDebounce = window.setTimeout(applyFilters, 300);
};
const resetFilters = () => {
    Object.assign(filters, { eventId: '', lotId: '', districtId: '', churchId: '', status: '', search: '' });
    const changed = applyScopedFilters();
    if (filtersReady.value) {
        if (!shouldAutoApply.value) {
            scheduleApply(true);
            return;
        }
        if (changed) {
            scheduleApply(true);
        }
        else {
            scheduleApply();
        }
    }
};
watch(() => filters.districtId, async (value) => {
    if (isDistrictFilterLocked.value && lockedDistrictId.value && value !== lockedDistrictId.value) {
        filters.districtId = lockedDistrictId.value || '';
        return;
    }
    if (!filtersReady.value)
        return;
    try {
        await catalog.loadChurches(value || undefined);
    }
    catch (e) {
        showError('Falha ao carregar igrejas', e);
    }
    if (filters.churchId && !catalog.churches.some(c => c.id === filters.churchId))
        filters.churchId = '';
    scheduleApply();
});
watch(() => filters.eventId, (value) => {
    if (isEventFilterLocked.value && lockedEventId.value && value !== lockedEventId.value) {
        filters.eventId = lockedEventId.value || '';
        return;
    }
    filters.lotId = '';
    const loadLots = async () => {
        if (!value)
            return;
        if (!admin.eventLots[value]) {
            try {
                await admin.loadEventLots(value);
            }
            catch (e) {
                showError('Falha ao carregar lotes', e);
            }
        }
    };
    loadLots();
    if (filtersReady.value)
        scheduleApply();
});
watch(() => filters.churchId, (value) => {
    if (isChurchFilterLocked.value && lockedChurchId.value && value !== lockedChurchId.value) {
        filters.churchId = lockedChurchId.value || '';
        return;
    }
    if (filtersReady.value)
        scheduleApply();
});
watch(() => filters.status, () => { if (filtersReady.value)
    scheduleApply(); });
watch(() => filters.lotId, () => { if (filtersReady.value)
    scheduleApply(); });
watch(() => filters.search, (value) => {
    if (searchDebounce)
        window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => {
        debouncedSearch.value = value;
    }, 300);
});
watch([lockedEventId, lockedDistrictId, lockedChurchId], () => {
    const changed = applyScopedFilters();
    if (changed && filtersReady.value) {
        scheduleApply(true);
    }
});
watch(() => admin.registrations, () => {
    const validIds = new Set(admin.registrations.map((reg) => reg.id));
    const next = new Set();
    selectedRegistrationIds.value.forEach((id) => {
        const match = admin.registrations.find((reg) => reg.id === id);
        if (match && validIds.has(id) && isRegistrationSelectable(match)) {
            next.add(id);
        }
    });
    selectedRegistrationIds.value = next;
    if (paymentDialog.open) {
        paymentDialog.items = paymentDialog.items.filter((item) => next.has(item.id));
        if (!paymentDialog.items.length)
            paymentDialog.open = false;
    }
    openedActions.value = null;
}, { deep: true });
watch(manualConfirmPaymentOptions, (options) => {
    if (!manualConfirmDialog.open)
        return;
    if (!options.length) {
        manualConfirmDialog.paymentMethod = '';
        return;
    }
    if (!options.some((option) => option.value === manualConfirmDialog.paymentMethod)) {
        manualConfirmDialog.paymentMethod = options[0].value;
    }
}, { immediate: true });
watch(paymentDialogAllowedMethods, (options) => {
    if (!paymentDialog.open)
        return;
    if (!options.length) {
        paymentDialog.paymentMethod = '';
        return;
    }
    if (!options.some((option) => option.value === paymentDialog.paymentMethod)) {
        paymentDialog.paymentMethod = options[0].value;
    }
}, { immediate: true });
onMounted(async () => {
    updateMobileState();
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateMobileState);
    }
    try {
        const tasks = [admin.loadEvents(), catalog.loadDistricts()];
        if (!isMobile.value) {
            tasks.push(catalog.loadChurches());
        }
        await Promise.all(tasks);
    }
    catch (error) {
        showError('Falha ao carregar dados iniciais', error);
    }
    applyScopedFilters();
    await applyFilters();
    filtersReady.value = true;
    debouncedSearch.value = filters.search;
});
onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateMobileState);
    }
    if (applyDebounce)
        window.clearTimeout(applyDebounce);
    if (searchDebounce)
        window.clearTimeout(searchDebounce);
});
const churchesByDistrict = (districtId) => {
    if (!districtId)
        return catalog.churches;
    return catalog.churches.filter((c) => c.districtId === districtId);
};
const eventMap = computed(() => new Map(admin.events.map((event) => [event.id, event])));
const districtMap = computed(() => new Map(catalog.districts.map((district) => [district.id, district])));
const churchMap = computed(() => new Map(catalog.churches.map((church) => [church.id, church])));
const registrationDistrictMap = computed(() => {
    const map = new Map();
    admin.registrations.forEach((registration) => {
        const name = registration.district?.name;
        if (name)
            map.set(registration.districtId, name);
    });
    return map;
});
const registrationChurchMap = computed(() => {
    const map = new Map();
    admin.registrations.forEach((registration) => {
        const name = registration.church?.name;
        if (name)
            map.set(registration.churchId, name);
    });
    return map;
});
const findEventTitle = (eventId) => eventMap.value.get(eventId)?.title ?? 'Evento';
const findEventPriceCents = (eventId) => {
    const event = eventMap.value.get(eventId);
    return event?.currentPriceCents ?? event?.priceCents ?? 0;
};
const registrationLotId = (registration) => registration.lotId ||
    registration.order?.lotId ||
    registration.order?.pricingLotId ||
    registration.lot?.id ||
    '';
const registrationLotName = (registration) => registration.lotName ||
    registration.order?.lotName ||
    registration.order?.pricingLot?.name ||
    registration.lot?.name ||
    '';
const findRegistrationLotLabel = (registration) => {
    const name = registrationLotName(registration);
    if (name)
        return name;
    const lotId = registrationLotId(registration);
    if (!lotId)
        return '';
    const lots = admin.eventLots[registration.eventId] || [];
    const lot = lots.find((item) => item.id === lotId);
    return lot?.name || '';
};
const findDistrictName = (id) => districtMap.value.get(id)?.name ?? registrationDistrictMap.value.get(id) ?? 'Nao informado';
const findChurchName = (id) => churchMap.value.get(id)?.name ?? registrationChurchMap.value.get(id) ?? 'Nao informado';
const parseDateParts = (value) => {
    if (!value)
        return null;
    if (typeof value === 'string') {
        const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const year = Number(match[1]);
            const month = Number(match[2]);
            const day = Number(match[3]);
            if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
                return { year, month, day };
            }
        }
    }
    const source = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(source.getTime()))
        return null;
    return {
        year: source.getUTCFullYear(),
        month: source.getUTCMonth() + 1,
        day: source.getUTCDate()
    };
};
const formatDateDisplay = (parts) => {
    const day = String(parts.day).padStart(2, '0');
    const month = String(parts.month).padStart(2, '0');
    return `${day}/${month}/${parts.year}`;
};
const formatDateInputValue = (value) => {
    const parts = parseDateParts(value);
    if (!parts)
        return '';
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};
function formatBirthDate(value) {
    const parts = parseDateParts(value);
    if (!parts)
        return 'Não informado';
    return formatDateDisplay(parts);
}
function calculateAge(value) {
    const parts = parseDateParts(value ?? null);
    if (!parts)
        return '--';
    const today = new Date();
    let age = today.getFullYear() - parts.year;
    const monthDiff = today.getMonth() + 1 - parts.month;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parts.day)) {
        age -= 1;
    }
    return age >= 0 ? String(age) : '--';
}
function formatDateTime(value) {
    if (!value)
        return '-';
    const source = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(source.getTime()))
        return '-';
    return source.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
const translateStatus = (s) => statusLabels[s] ?? s;
const statusBadgeClass = (s) => {
    switch (s) {
        case "PENDING_PAYMENT":
            return "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100";
        case "PAID":
            return "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-100";
        case "CHECKED_IN":
            return "bg-primary-200 text-primary-800 dark:bg-primary-500/30 dark:text-primary-50";
        case "REFUNDED":
            return "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white";
        case "CANCELED":
            return "bg-black text-white dark:bg-neutral-900 dark:text-white";
        case "DRAFT":
            return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";
        default:
            return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";
    }
};
const statusAccentClass = (s) => {
    switch (s) {
        case "PAID":
        case "CHECKED_IN":
            return "bg-emerald-500";
        case "PENDING_PAYMENT":
            return "bg-amber-500";
        case "CANCELED":
        case "REFUNDED":
            return "bg-slate-400";
        case "DRAFT":
            return "bg-slate-300";
        default:
            return "bg-slate-400";
    }
};
// Busca local por nome/CPF
const displayedRegistrations = computed(() => {
    const q = (debouncedSearch.value || '').trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return admin.registrations.filter((r) => {
        if (filters.eventId && r.eventId !== filters.eventId)
            return false;
        if (filters.lotId) {
            const lotId = registrationLotId(r);
            const lotName = registrationLotName(r).toLowerCase();
            const targetName = selectedLotName.value.toLowerCase();
            const lotMatch = lotId ? lotId === filters.lotId : (lotName && targetName ? lotName === targetName : false);
            if (!lotMatch)
                return false;
        }
        if (!q)
            return true;
        const nameMatch = (r.fullName || '').toLowerCase().includes(q);
        const cpfMatch = digits ? String(r.cpf || '').includes(digits) : false;
        return nameMatch || cpfMatch;
    });
});
const isFilterActive = computed(() => {
    if (hideFilters.value)
        return true;
    return Boolean(filters.eventId ||
        filters.lotId ||
        filters.districtId ||
        filters.churchId ||
        filters.status ||
        filters.search);
});
const registrationCount = computed(() => {
    const displayed = displayedRegistrations.value.length;
    const total = admin.registrations.length;
    return {
        displayed,
        total,
        filterActive: isFilterActive.value,
        hasDifference: total !== displayed
    };
});
const isRegistrationSelectable = (registration) => {
    const blockedStatuses = new Set(['PAID', 'CHECKED_IN', 'REFUNDED']);
    if (blockedStatuses.has(registration.status))
        return false;
    return true;
};
const openedActions = ref(null);
const toggleActions = (id) => {
    openedActions.value = openedActions.value === id ? null : id;
};
const selectionDisabledReason = (registration) => {
    if (registration.status === 'PAID' || registration.status === 'CHECKED_IN' || registration.status === 'REFUNDED') {
        return 'Pago';
    }
    return '';
};
const isRegistrationSelected = (id) => selectedRegistrationIds.value.has(id);
const selectedRegistrations = computed(() => admin.registrations.filter((registration) => selectedRegistrationIds.value.has(registration.id)));
const selectionTotalCents = computed(() => selectedRegistrations.value.reduce((acc, registration) => acc + (registration.priceCents ?? findEventPriceCents(registration.eventId) ?? 0), 0));
const normalizePaymentMethods = (input) => {
    if (Array.isArray(input)) {
        return input.filter((value) => typeof value === 'string' && value.length > 0);
    }
    if (typeof input === 'string') {
        return input.split(',').map((value) => value.trim()).filter(Boolean);
    }
    return [];
};
const resolveAllowedPaymentMethods = (eventId, eventPaymentMethods) => {
    const eventFromStore = admin.events.find((e) => e.id === eventId);
    const allowed = normalizePaymentMethods(eventPaymentMethods ?? eventFromStore?.paymentMethods);
    return PAYMENT_METHODS.filter((option) => {
        if (!allowed.includes(option.value))
            return false;
        if (ADMIN_ONLY_PAYMENT_METHODS.includes(option.value) && !isAdminUser.value)
            return false;
        return true;
    });
};
const allDisplayedSelected = computed(() => {
    const selectable = displayedRegistrations.value.filter(isRegistrationSelectable);
    if (!selectable.length)
        return false;
    return selectable.every((registration) => selectedRegistrationIds.value.has(registration.id));
});
const someDisplayedSelected = computed(() => displayedRegistrations.value.some((registration) => isRegistrationSelectable(registration) && selectedRegistrationIds.value.has(registration.id)));
const toggleRegistrationSelection = (registration, checked) => {
    if (!isRegistrationSelectable(registration))
        return;
    const next = new Set(selectedRegistrationIds.value);
    const shouldSelect = typeof checked === 'boolean' ? checked : !next.has(registration.id);
    if (shouldSelect) {
        next.add(registration.id);
        if (paymentDialog.open && !paymentDialog.items.some((item) => item.id === registration.id)) {
            paymentDialog.items = [...paymentDialog.items, registration];
        }
    }
    else {
        next.delete(registration.id);
        if (paymentDialog.open) {
            paymentDialog.items = paymentDialog.items.filter((item) => item.id !== registration.id);
            if (!paymentDialog.items.length)
                paymentDialog.open = false;
        }
    }
    selectedRegistrationIds.value = next;
};
const toggleSelectAllDisplayed = (checked) => {
    const next = new Set(selectedRegistrationIds.value);
    displayedRegistrations.value.forEach((registration) => {
        if (!isRegistrationSelectable(registration))
            return;
        if (checked) {
            next.add(registration.id);
        }
        else {
            next.delete(registration.id);
        }
    });
    selectedRegistrationIds.value = next;
    if (paymentDialog.open) {
        paymentDialog.items = paymentDialog.items.filter((item) => next.has(item.id));
        if (!paymentDialog.items.length)
            paymentDialog.open = false;
    }
};
const closePaymentDialog = () => {
    paymentDialog.open = false;
    paymentDialog.error = '';
    paymentDialog.successOrderId = null;
    paymentDialog.successLink = null;
    paymentDialog.paymentMethod = '';
};
const openPaymentDialog = (itemsInput) => {
    const items = (Array.isArray(itemsInput) && itemsInput.length ? itemsInput : selectedRegistrations.value).filter(isRegistrationSelectable);
    if (!items.length) {
        showError('Selecione ao menos uma inscricao', new Error('Selecione ao menos uma inscricao para gerar o pagamento.'));
        return;
    }
    const uniqueEvents = new Set(items.map((item) => item.eventId));
    if (uniqueEvents.size > 1) {
        showError('Selecione apenas inscricoes do mesmo evento', new Error('Selecione inscricoes de um unico evento para gerar o pagamento.'));
        return;
    }
    const allowed = resolveAllowedPaymentMethods(items[0].eventId);
    if (!allowed.length) {
        showError('Evento sem formas de pagamento', new Error('Nenhuma forma de pagamento disponivel para este evento.'));
        return;
    }
    paymentDialog.items = items;
    paymentDialog.error = '';
    paymentDialog.successOrderId = null;
    paymentDialog.successLink = null;
    paymentDialog.paymentMethod = allowed[0].value;
    paymentDialog.open = true;
};
const removeFromPaymentDialog = (registrationId) => {
    paymentDialog.items = paymentDialog.items.filter((item) => item.id !== registrationId);
    const next = new Set(selectedRegistrationIds.value);
    next.delete(registrationId);
    selectedRegistrationIds.value = next;
    if (!paymentDialog.items.length) {
        paymentDialog.open = false;
    }
};
const confirmPaymentGeneration = async () => {
    if (!paymentDialog.items.length) {
        paymentDialog.error = 'Selecione ao menos uma inscricao para continuar.';
        return;
    }
    if (!paymentDialog.paymentMethod) {
        paymentDialog.error = 'Selecione a forma de pagamento.';
        return;
    }
    const allowed = paymentDialogAllowedMethods.value;
    if (allowed.length && !allowed.some((option) => option.value === paymentDialog.paymentMethod)) {
        paymentDialog.error = 'Forma de pagamento indisponivel para o evento.';
        return;
    }
    paymentDialog.loading = true;
    paymentDialog.error = '';
    try {
        const result = await admin.createPaymentOrderForRegistrations({
            registrationIds: paymentDialog.items.map((item) => item.id),
            paymentMethod: paymentDialog.paymentMethod
        });
        const mpLink = result?.payment?.initPoint ??
            result?.payment?.init_point ??
            result?.payment?.sandboxInitPoint ??
            '';
        const fallbackSlug = paymentDialog.items[0] ? findEventSlug(paymentDialog.items[0].eventId) : '';
        const fallbackLink = fallbackSlug && result?.orderId
            ? `${window.location.origin}/evento/${fallbackSlug}/pagamento/${result.orderId}`
            : '';
        paymentDialog.successLink = mpLink || fallbackLink || null;
        paymentDialog.successOrderId = result?.orderId ?? null;
        selectedRegistrationIds.value = new Set();
        if (!paymentDialog.successLink) {
            paymentDialog.error = 'Pagamento criado. Nao foi possivel gerar link automatico (pagamento manual).';
        }
    }
    catch (error) {
        const message = error?.response?.data?.message ?? error?.message ?? 'Erro ao gerar pagamento';
        paymentDialog.error = message;
        showError('Erro ao gerar pagamento', error);
    }
    finally {
        paymentDialog.loading = false;
    }
};
const copyPaymentUrl = async (url) => {
    if (!url)
        return;
    try {
        await navigator.clipboard.writeText(url);
    }
    catch (e) {
        console.warn('Clipboard copy failed', e);
    }
};
const openManualConfirmDialog = (registrations) => {
    if (!registrations.length) {
        showError('Selecione ao menos uma inscrição', new Error('Selecione ao menos uma inscrição.'));
        return;
    }
    const uniqueEvents = new Set(registrations.map((r) => r.eventId));
    if (uniqueEvents.size > 1) {
        showError('Selecione apenas inscrições do mesmo evento', new Error('Selecione apenas inscrições do mesmo evento para confirmar manualmente.'));
        return;
    }
    const allowed = resolveAllowedPaymentMethods(registrations[0].eventId);
    if (!allowed.length) {
        showError('Evento sem formas de pagamento', new Error('Nenhuma forma de pagamento disponível para este evento.'));
        return;
    }
    manualConfirmDialog.items = registrations;
    manualConfirmDialog.paymentMethod = allowed[0].value;
    manualConfirmDialog.error = '';
    manualConfirmDialog.open = true;
};
const closeManualConfirmDialog = () => {
    manualConfirmDialog.open = false;
    manualConfirmDialog.error = '';
    manualConfirmDialog.paymentMethod = '';
    manualConfirmDialog.items = [];
};
const confirmManualPayment = async () => {
    if (!manualConfirmDialog.items.length) {
        manualConfirmDialog.error = 'Selecione ao menos uma inscricao.';
        return;
    }
    const allowedOptions = manualConfirmPaymentOptions.value;
    if (!manualConfirmDialog.paymentMethod) {
        manualConfirmDialog.error = 'Selecione a forma de pagamento do evento.';
        return;
    }
    if (allowedOptions.length && !allowedOptions.some((opt) => opt.value === manualConfirmDialog.paymentMethod)) {
        manualConfirmDialog.error = 'Forma de pagamento nao disponivel para este evento.';
        return;
    }
    manualConfirmDialog.loading = true;
    manualConfirmDialog.error = '';
    try {
        await admin.markRegistrationsPaid(manualConfirmDialog.items.map((item) => item.id), { paymentMethod: manualConfirmDialog.paymentMethod, paidAt: new Date().toISOString() });
        selectedRegistrationIds.value = new Set();
        closeManualConfirmDialog();
    }
    catch (error) {
        manualConfirmDialog.error = error?.response?.data?.message ?? error?.message ?? 'Erro ao confirmar pagamento';
        showError('Erro ao confirmar pagamento', error);
    }
    finally {
        manualConfirmDialog.loading = false;
    }
};
function registrationCode(registration) {
    if (!registration)
        return '';
    if (registration.orderId)
        return registration.orderId;
    if (registration.id) {
        const suffix = registration.id.slice(-8);
        return suffix.toUpperCase();
    }
    return '';
}
// Nova inscrição (PIX, Dinheiro ou Gratuita)
const addDialog = reactive({ open: false, paymentMethod: 'PIX_MP' });
const addForm = reactive({
    eventId: '',
    fullName: '',
    birthDate: '',
    cpf: '',
    gender: '',
    districtId: '',
    churchId: '',
    responsibleCpf: '',
    responsiblePhone: '',
    photoUrl: null
});
const addPhotoPreview = ref(null);
const defaultResponsibleMessage = 'Informe o CPF do responsável para validar a igreja.';
const responsibleLookup = reactive({
    status: 'idle',
    message: defaultResponsibleMessage
});
const resetAddForm = (paymentMethod = 'PIX_MP') => {
    addDialog.paymentMethod = paymentMethod;
    addForm.eventId = filters.eventId || (admin.events[0]?.id ?? '');
    addForm.fullName = '';
    addForm.birthDate = '';
    addForm.cpf = '';
    addForm.gender = '';
    addForm.districtId = filters.districtId || (catalog.districts[0]?.id ?? '');
    addForm.churchId = filters.churchId || (churchesByDistrict(addForm.districtId)[0]?.id ?? '');
    addForm.responsibleCpf = '';
    addForm.responsiblePhone = '';
    addForm.photoUrl = null;
    addPhotoPreview.value = null;
    responsibleLookup.status = 'idle';
    responsibleLookup.message = defaultResponsibleMessage;
};
const openAddDialog = async () => {
    if (!registrationPermissions.canCreate.value) {
        showError('Acesso negado', new Error('Você não possui permissão para criar inscrições.'));
        return;
    }
    if (!catalog.churches.length) {
        const preferredDistrictId = lockedDistrictId.value || filters.districtId || catalog.districts[0]?.id || '';
        try {
            await catalog.loadChurches(preferredDistrictId || undefined);
        }
        catch (error) {
            showError('Falha ao carregar igrejas', error);
        }
    }
    resetAddForm();
    addDialog.open = true;
};
const closeAdd = () => {
    addDialog.open = false;
    resetAddForm(addDialog.paymentMethod);
};
const formatCpfInputValue = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (!digits)
        return '';
    if (digits.length > 9)
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => `${a}.${b}.${c}${d ? '-' + d : ''}`);
    if (digits.length > 6)
        return digits.replace(/(\d{3})(\d{3})(\d{0,3})/, (_, a, b, c) => `${a}.${b}.${c}`);
    if (digits.length > 3)
        return digits.replace(/(\d{3})(\d{0,3})/, (_, a, b) => `${a}.${b}`);
    return digits;
};
const onAddCpfInput = (e) => {
    const el = e.target;
    addForm.cpf = formatCpfInputValue(el.value);
};
const onResponsibleCpfInput = (e) => {
    const el = e.target;
    addForm.responsibleCpf = formatCpfInputValue(el.value);
    responsibleLookup.status = 'idle';
    responsibleLookup.message = defaultResponsibleMessage;
};
const formatPhoneInputValue = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (!digits)
        return '';
    if (digits.length <= 2)
        return `(${digits}`;
    if (digits.length <= 6)
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};
const onResponsiblePhoneInput = (e) => {
    const el = e.target;
    addForm.responsiblePhone = formatPhoneInputValue(el.value);
};
const handleResponsibleCpfLookup = async () => {
    const digits = normalizeCPF(addForm.responsibleCpf);
    if (!digits || digits.length !== 11) {
        responsibleLookup.status = 'error';
        responsibleLookup.message = 'Informe um CPF do responsável válido.';
        return;
    }
    try {
        responsibleLookup.status = 'idle';
        responsibleLookup.message = 'Buscando igreja vinculada...';
        const match = await catalog.findChurchByDirectorCpf(digits);
        if (!match) {
            responsibleLookup.status = 'error';
            responsibleLookup.message = 'Nenhuma igreja encontrada para este CPF.';
            return;
        }
        responsibleLookup.status = 'success';
        responsibleLookup.message = `Responsável identificado: ${match.directorName ?? 'Diretor'} - ${match.churchName}`;
        addForm.districtId = match.districtId;
        addForm.churchId = match.churchId;
    }
    catch (error) {
        responsibleLookup.status = 'error';
        responsibleLookup.message = error?.response?.data?.message ?? 'Falha ao buscar igreja para este CPF.';
    }
};
watch(() => addForm.districtId, (value) => {
    if (!value) {
        addForm.churchId = '';
        return;
    }
    const options = churchesByDistrict(value);
    if (!options.length) {
        addForm.churchId = '';
        return;
    }
    if (!options.some((church) => church.id === addForm.churchId)) {
        addForm.churchId = options[0].id;
    }
});
const handleAddPhotoChange = (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file)
        return;
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result;
        addPhotoPreview.value = result;
        addForm.photoUrl = result;
    };
    reader.readAsDataURL(file);
};
const clearAddPhoto = () => {
    addPhotoPreview.value = null;
    addForm.photoUrl = null;
};
const saveNewRegistration = async () => {
    if (!registrationPermissions.canCreate.value) {
        showError('Acesso negado', new Error('Você não possui permissão para criar inscrições.'));
        return;
    }
    try {
        if (!addForm.eventId) {
            showError('Evento obrigatório', new Error('Selecione o evento'));
            return;
        }
        if (!addForm.fullName || addForm.fullName.trim().length < 3) {
            showError('Nome inválido', new Error('Informe o nome completo'));
            return;
        }
        if (!addForm.birthDate) {
            showError('Nascimento inválido', new Error('Informe a data'));
            return;
        }
        if (!addForm.gender) {
            showError('Dados incompletos', new Error('Selecione o gênero do participante'));
            return;
        }
        if (!validateCPF(addForm.cpf)) {
            showError('CPF inválido', new Error('Informe um CPF válido para o participante'));
            return;
        }
        if (!validateCPF(addForm.responsibleCpf)) {
            showError('CPF do responsável inválido', new Error('Informe um CPF válido do responsável'));
            return;
        }
        if (!addForm.districtId || !addForm.churchId) {
            showError('Local inválido', new Error('Selecione distrito e igreja'));
            return;
        }
        const phoneDigits = addForm.responsiblePhone.replace(/\\D/g, '');
        if (phoneDigits.length < 10) {
            showError('Telefone inválido', new Error('Informe o telefone do responsável'));
            return;
        }
        const result = await admin.createAdminRegistration({
            eventId: addForm.eventId,
            buyerCpf: normalizeCPF(addForm.responsibleCpf),
            paymentMethod: addDialog.paymentMethod,
            person: {
                fullName: addForm.fullName.trim(),
                cpf: normalizeCPF(addForm.cpf),
                birthDate: addForm.birthDate,
                gender: addForm.gender || 'OTHER',
                districtId: addForm.districtId,
                churchId: addForm.churchId,
                photoUrl: addForm.photoUrl || null
            }
        });
        if (addDialog.paymentMethod === 'PIX_MP' && result?.orderId) {
            const slug = findEventSlug(addForm.eventId);
            if (slug) {
                const link = window.location.origin + '/evento/' + slug + '/pagamento/' + result.orderId;
                try {
                    await navigator.clipboard.writeText(link);
                }
                catch { }
                window.open(link, '_blank');
            }
        }
        closeAdd();
        scheduleApply(true);
    }
    catch (error) {
        showError('Falha ao criar inscrição', error);
    }
};
// Ações e helpers adicionais
const findEventSlug = (eventId) => admin.events.find((e) => e.id === eventId)?.slug ?? '';
const resolvePhotoUrl = (photoUrl) => {
    if (typeof photoUrl === 'string' && photoUrl.trim().length > 0) {
        return photoUrl;
    }
    return DEFAULT_PHOTO_DATA_URL;
};
const paymentMethodShort = (method) => {
    if (!method)
        return '--';
    if (method === 'PIX_MP')
        return 'Pix';
    if (method === 'CASH')
        return 'Dinheiro';
    if (method === 'CARD_FULL')
        return 'Cartão (à vista)';
    if (method === 'CARD_INSTALLMENTS')
        return 'Cartão (parcelado)';
    return paymentMethodLabel(method);
};
const editDialog = reactive({ open: false, original: null });
const editForm = reactive({ fullName: '', birthDate: '', cpf: '', districtId: '', churchId: '', photoUrl: '' });
const historyLoading = ref(false);
const registrationHistory = ref([]);
const refundedAt = computed(() => {
    const events = registrationHistory.value.filter((e) => e.type === 'PAYMENT_REFUNDED');
    return events.length ? events[events.length - 1].at : null;
});
const humanEvent = (e) => {
    if (e && typeof e.label === 'string' && e.label)
        return e.label;
    const map = {
        REGISTRATION_CREATED: 'Inscrição criada',
        PAYMENT_METHOD_SELECTED: `Forma de pagamento escolhida (${paymentMethodShort(e.details?.paymentMethod)})`,
        PAYMENT_CONFIRMED: `Pagamento confirmado (${paymentMethodShort(e.details?.paymentMethod)})`,
        ORDER_PAID: 'Pedido pago',
        REGISTRATION_UPDATED: 'Inscrição atualizada',
        REGISTRATION_CANCELED: 'Inscrição cancelada',
        REGISTRATION_DELETED: 'Inscrição excluída',
        PAYMENT_REFUNDED: `Estorno realizado${e.details?.reason ? ' - ' + e.details.reason : ''}`,
        CHECKIN_COMPLETED: 'Check-in realizado'
    };
    return map[e.type] || e.type;
};
const formatDetails = (d) => {
    try {
        return JSON.stringify(d, null, 2);
    }
    catch {
        return String(d);
    }
};
const showDetails = (type) => ['REGISTRATION_UPDATED', 'PAYMENT_REFUNDED'].includes(type);
const onCpfInput = (e) => {
    const el = e.target;
    const digits = el.value.replace(/\D/g, '').slice(0, 11);
    let masked = digits;
    if (digits.length > 9) {
        masked = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => `${a}.${b}.${c}${d ? '-' + d : ''}`);
    }
    else if (digits.length > 6) {
        masked = digits.replace(/(\d{3})(\d{3})(\d{0,3})/, (_, a, b, c) => `${a}.${b}.${c}`);
    }
    else if (digits.length > 3) {
        masked = digits.replace(/(\d{3})(\d{0,3})/, (_, a, b) => `${a}.${b}`);
    }
    editForm.cpf = masked;
};
const openEdit = (registration) => {
    if (!registrationPermissions.canEdit.value) {
        showError('Acesso negado', new Error('Você não possui permissão para editar inscrições.'));
        return;
    }
    editDialog.original = { ...registration };
    editForm.fullName = registration.fullName;
    editForm.birthDate = formatDateInputValue(registration.birthDate);
    editForm.cpf = formatCPF(registration.cpf);
    editForm.districtId = registration.districtId;
    editForm.churchId = registration.churchId;
    editForm.photoUrl = registration.photoUrl || '';
    editDialog.open = true;
    historyLoading.value = true;
    registrationHistory.value = [];
    admin.getRegistrationHistory(registration.id).then((res) => {
        registrationHistory.value = (res?.events || []).map((x) => ({ ...x, at: x.at }));
    }).catch(() => { }).finally(() => { historyLoading.value = false; });
};
const closeEdit = () => { editDialog.open = false; editDialog.original = null; };
const onEditPhotoChange = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file)
        return;
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result;
        editForm.photoUrl = result;
    };
    reader.readAsDataURL(file);
};
const previewPhotoUrl = computed(() => {
    return (editForm.photoUrl && editForm.photoUrl.length > 0)
        ? editForm.photoUrl
        : (editDialog.original?.photoUrl || '');
});
const clearEditPhoto = () => {
    editForm.photoUrl = '';
};
const saveRegistration = async () => {
    if (!editDialog.original)
        return;
    if (!registrationPermissions.canEdit.value) {
        showError('Acesso negado', new Error('Você não possui permissão para editar inscrições.'));
        return;
    }
    const original = editDialog.original;
    const payload = {};
    try {
        if (!validateCPF(editForm.cpf)) {
            showError('CPF invalido', new Error('Informe um CPF valido'));
            return;
        }
        if (editForm.fullName.trim() && editForm.fullName.trim() !== original.fullName)
            payload.fullName = editForm.fullName.trim();
        const currentBirth = formatDateInputValue(original.birthDate);
        if (editForm.birthDate && editForm.birthDate !== currentBirth)
            payload.birthDate = editForm.birthDate;
        const sanitized = normalizeCPF(editForm.cpf);
        if (sanitized && sanitized !== original.cpf)
            payload.cpf = sanitized;
        if (editForm.districtId && editForm.districtId !== original.districtId)
            payload.districtId = editForm.districtId;
        if (editForm.churchId && editForm.churchId !== original.churchId)
            payload.churchId = editForm.churchId;
        if (editForm.photoUrl !== undefined && editForm.photoUrl !== (original.photoUrl || ''))
            payload.photoUrl = editForm.photoUrl || null;
        await admin.updateRegistration(original.id, payload);
        closeEdit();
    }
    catch (e) {
        showError('Falha ao atualizar inscrição', e);
    }
};
const isPaymentLinkVisible = (registration) => registration.status === 'PENDING_PAYMENT' && registration.paymentMethod !== 'CASH';
const copyPaymentLink = async (registration) => {
    if (!isPaymentLinkVisible(registration))
        return;
    if (!registrationPermissions.canEdit.value) {
        showError('Acesso negado', new Error('Você não possui permissão para editar inscrições.'));
        return;
    }
    const slug = findEventSlug(registration.eventId);
    if (!slug) {
        showError('Não foi possível gerar link', new Error('Evento sem slug disponível.'));
        return;
    }
    try {
        // Solicitar ao backend um link exclusivo (pode dividir o pedido, se necessário)
        const result = await admin.regenerateRegistrationPaymentLink(registration.id);
        const orderId = result?.orderId ?? registration.orderId;
        if (!orderId) {
            showError('Não foi possível gerar link', new Error('Pedido indisponível.'));
            return;
        }
        const link = `${window.location.origin}/evento/${slug}/pagamento/${orderId}`;
        try {
            await navigator.clipboard.writeText(link);
        }
        catch { }
        window.open(link, '_blank');
    }
    catch (e) {
        showError('Não foi possível gerar link', e);
    }
};
const deletableStatuses = new Set(['PENDING_PAYMENT', 'PAID', 'CHECKED_IN', 'CANCELED', 'REFUNDED']);
const cancellableStatuses = new Set(['PENDING_PAYMENT', 'PAID']);
const canCancelRegistration = (s) => cancellableStatuses.has(s);
const canDeleteRegistration = (s) => deletableStatuses.has(s);
const confirmState = reactive({ open: false, action: null, registration: null, title: '', description: '', confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', type: 'default' });
const resetConfirmState = () => { confirmState.open = false; confirmState.action = null; confirmState.registration = null; confirmState.title = ''; confirmState.description = ''; confirmState.confirmLabel = 'Confirmar'; confirmState.cancelLabel = 'Cancelar'; confirmState.type = 'default'; };
const handleDialogVisibility = (v) => { if (v) {
    confirmState.open = true;
    return;
} resetConfirmState(); };
const canExecuteAction = (action) => {
    if (action === 'delete')
        return registrationPermissions.canDelete.value;
    if (action === 'cancel')
        return registrationPermissions.canDeactivate.value;
    if (action === 'refund' || action === 'confirm-cash')
        return registrationPermissions.canFinancial.value;
    if (action === 'reactivate')
        return registrationPermissions.canApprove.value;
    return true;
};
const openConfirm = (action, registration) => {
    if (!canExecuteAction(action)) {
        showError('Acesso negado', new Error('Você não possui permissão para essa ação.'));
        return;
    }
    confirmState.action = action;
    confirmState.registration = registration;
    confirmState.open = true;
    confirmState.cancelLabel = 'Voltar';
    if (action === 'cancel') {
        confirmState.title = 'Cancelar inscrição';
        confirmState.description = 'Cancelar a inscrição de ' + registration.fullName + '? Esta ação não pode ser desfeita.';
        confirmState.confirmLabel = 'Cancelar';
        confirmState.type = 'danger';
    }
    else if (action === 'refund') {
        confirmState.title = 'Estornar inscrição';
        confirmState.description = 'Confirmar estorno da inscrição de ' + registration.fullName + '?';
        confirmState.confirmLabel = 'Confirmar estorno';
        confirmState.type = 'default';
    }
    else if (action === 'confirm-cash') {
        confirmState.title = 'Confirmar pagamento em dinheiro';
        confirmState.description = 'Confirmar recebimento manual em dinheiro para ' + registration.fullName + '?';
        confirmState.confirmLabel = 'Confirmar pagamento';
        confirmState.type = 'default';
    }
    else if (action === 'reactivate') {
        confirmState.title = 'Reativar inscrição';
        confirmState.description = 'Reativar a inscrição de ' + registration.fullName + ' e gerar um novo link de pagamento?';
        confirmState.confirmLabel = 'Reativar';
        confirmState.type = 'default';
    }
    else {
        confirmState.title = 'Excluir inscrição';
        confirmState.description = 'Excluir a inscrição de ' + registration.fullName + '? O registro será removido permanentemente.';
        confirmState.confirmLabel = 'Excluir';
        confirmState.type = 'danger';
    }
};
const processing = reactive({ open: false, message: 'Processando pagamento...' });
const ensureMinDelay = async (promise, ms = 2000) => {
    const start = Date.now();
    const result = await promise;
    const elapsed = Date.now() - start;
    if (elapsed < ms)
        await new Promise((r) => setTimeout(r, ms - elapsed));
    return result;
};
const formatDateTimeLocalInput = (value) => {
    const source = value ? new Date(value) : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${source.getFullYear()}-${pad(source.getMonth() + 1)}-${pad(source.getDate())}T${pad(source.getHours())}:${pad(source.getMinutes())}`;
};
const generateManualReference = () => `PIX-MANUAL-${Date.now()}`;
const MANUAL_PROOF_MAX_SIZE = 5 * 1024 * 1024;
const manualPayment = reactive({
    open: false,
    registration: null,
    reference: '',
    paidAt: '',
    fileName: '',
    fileType: '',
    filePreview: '',
    fileDataUrl: '',
    submitting: false,
    error: '',
    existingProofUrl: '',
    fileInputKey: 0
});
const executeConfirmAction = async () => {
    if (!confirmState.registration || !confirmState.action) {
        resetConfirmState();
        return;
    }
    const registration = confirmState.registration;
    const action = confirmState.action;
    if (!canExecuteAction(action)) {
        showError('Acesso negado', new Error('Você não possui permissão para essa ação.'));
        resetConfirmState();
        return;
    }
    resetConfirmState();
    try {
        if (action === 'cancel')
            await admin.cancelRegistration(registration.id);
        else if (action === 'refund')
            await admin.refundRegistration(registration.id, {});
        else if (action === 'delete')
            await admin.deleteRegistration(registration.id);
        else if (action === 'reactivate') {
            processing.message = 'Gerando novo pagamento...';
            processing.open = true;
            try {
                const result = await admin.reactivateRegistration(registration.id);
                const slug = findEventSlug(registration.eventId);
                const orderId = result?.orderId ?? registration.orderId;
                if (slug && orderId) {
                    const link = `${window.location.origin}/evento/${slug}/pagamento/${orderId}`;
                    try {
                        await navigator.clipboard.writeText(link);
                    }
                    catch { }
                    window.open(link, '_blank');
                }
                else {
                    showError('Não foi possível gerar link', new Error('Dados insuficientes para gerar pagamento.'));
                }
            }
            finally {
                processing.open = false;
            }
        }
        else if (action === 'confirm-cash') {
            if (!registration.orderId) {
                showError('Não foi possível confirmar pagamento', new Error('Inscrição sem pedido associado.'));
                return;
            }
            processing.message = 'Confirmando pagamento...';
            processing.open = true;
            await ensureMinDelay(admin.confirmOrderPayment(registration.orderId, { manualReference: 'CASH-ADMIN', paidAt: new Date().toISOString() }), 2000);
            processing.open = false;
        }
    }
    catch (e) {
        const titles = {
            cancel: 'Falha ao cancelar inscrição',
            refund: 'Falha ao estornar inscrição',
            delete: 'Falha ao excluir inscrição',
            'confirm-cash': 'Falha ao confirmar pagamento',
            reactivate: 'Falha ao reativar inscrição'
        };
        if (action === 'confirm-cash') {
            showError('Falha ao confirmar pagamento', e);
            return;
        }
        showError(titles[action], e);
    }
};
const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
});
const resetManualPaymentState = (options) => {
    manualPayment.fileDataUrl = '';
    manualPayment.filePreview = '';
    manualPayment.fileName = '';
    manualPayment.fileType = '';
    manualPayment.error = '';
    manualPayment.submitting = false;
    if (!options?.preserveInput) {
        manualPayment.fileInputKey += 1;
    }
};
const openManualPaymentDialog = (registration) => {
    if (!registration.orderId) {
        showError('Pedido indisponível', new Error('Inscrição sem pedido associado.'));
        return;
    }
    manualPayment.registration = registration;
    manualPayment.open = true;
    manualPayment.reference = registration.order?.manualPaymentReference || generateManualReference();
    manualPayment.paidAt = formatDateTimeLocalInput(new Date());
    manualPayment.existingProofUrl = registration.order?.manualPaymentProofUrl || '';
    resetManualPaymentState();
    openedActions.value = null;
};
const closeManualPaymentDialog = () => {
    manualPayment.open = false;
    manualPayment.registration = null;
    manualPayment.existingProofUrl = '';
    resetManualPaymentState();
};
const handleManualProofChange = async (event) => {
    const target = event.target;
    const file = target.files?.[0];
    resetManualPaymentState({ preserveInput: true });
    if (!file)
        return;
    if (file.size > MANUAL_PROOF_MAX_SIZE) {
        manualPayment.error = 'O comprovante deve ter no máximo 5 MB.';
        return;
    }
    if (!file.type || (!file.type.startsWith('image/') && file.type !== 'application/pdf')) {
        manualPayment.error = 'Envie um arquivo de imagem ou PDF.';
        return;
    }
    try {
        const dataUrl = await readFileAsDataUrl(file);
        manualPayment.fileDataUrl = dataUrl;
        manualPayment.fileName = file.name;
        manualPayment.fileType = file.type;
        manualPayment.filePreview = file.type.startsWith('image/') ? dataUrl : '';
    }
    catch (error) {
        manualPayment.error = 'Não foi possível processar o arquivo selecionado.';
    }
};
const submitManualPayment = async () => {
    if (!manualPayment.registration?.orderId) {
        showError('Não foi possível confirmar pagamento', new Error('Inscrição sem pedido associado.'));
        return;
    }
    if (!manualPayment.fileDataUrl) {
        manualPayment.error = 'Anexe o comprovante antes de confirmar.';
        return;
    }
    manualPayment.submitting = true;
    try {
        await ensureMinDelay(admin.confirmOrderPayment(manualPayment.registration.orderId, {
            manualReference: manualPayment.reference?.trim() || undefined,
            paidAt: manualPayment.paidAt ? new Date(manualPayment.paidAt).toISOString() : undefined,
            proofFile: manualPayment.fileDataUrl
        }), 1000);
        closeManualPaymentDialog();
    }
    catch (error) {
        manualPayment.error = extractErrorInfo(error).message;
    }
    finally {
        manualPayment.submitting = false;
    }
};
const canConfirmManualPix = (registration) => registration.status === 'PENDING_PAYMENT' &&
    registration.paymentMethod === 'PIX_MP' &&
    Boolean(registration.orderId) &&
    registrationPermissions.canFinancial.value;
const canViewManualProof = (registration) => Boolean(registration.order?.manualPaymentProofUrl) && registrationPermissions.canFinancial.value;
const viewManualProof = (registration) => {
    const url = registration.order?.manualPaymentProofUrl;
    if (url)
        window.open(url, '_blank', 'noopener,noreferrer');
};
const openExistingManualProof = () => {
    if (manualPayment.existingProofUrl) {
        window.open(manualPayment.existingProofUrl, '_blank', 'noopener,noreferrer');
    }
};
const receiptDownloadState = reactive({ downloadingId: '' });
const receivableStatuses = new Set(['PAID', 'CHECKED_IN', 'REFUNDED']);
const canEmitReceipt = (registration) => receivableStatuses.has(registration.status) && registrationPermissions.canReports.value;
const downloadReceipt = async (registration) => {
    if (!canEmitReceipt(registration))
        return;
    receiptDownloadState.downloadingId = registration.id;
    try {
        const response = await admin.getRegistrationReceiptLink(registration.id);
        const url = response?.url;
        if (!url) {
            showError('Comprovante indisponivel', new Error('Nao foi possivel gerar o link do comprovante.'));
            return;
        }
        await createPreviewSession([
            {
                id: registration.id,
                title: registration.fullName || "Inscricao " + registration.id,
                fileName: "comprovante-" + registration.id + ".pdf",
                sourceUrl: url,
                mimeType: 'application/pdf'
            }
        ], { context: 'Comprovante de inscricao' });
    }
    catch (error) {
        showError('Falha ao gerar comprovante', error);
    }
    finally {
        receiptDownloadState.downloadingId = '';
    }
};
const sanitizeFilePart = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);
const generateRegistrationListPdf = async () => {
    if (!canGenerateListPdf.value || listPdfState.loading)
        return;
    listPdfState.loading = true;
    try {
        const params = buildFilterParams();
        const response = await admin.downloadRegistrationListPdf(params);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const eventLabel = filters.eventId ? findEventTitle(filters.eventId) : 'inscricoes';
        const churchLabel = filters.churchId ? findChurchName(filters.churchId) : '';
        const lotLabel = filters.lotId ? selectedLotName.value : '';
        const parts = ['lista', eventLabel, churchLabel, lotLabel].filter(Boolean).map(sanitizeFilePart);
        const fileName = `${parts.filter(Boolean).join('-') || 'lista-inscricoes'}.pdf`;
        await createPreviewSession([
            {
                title: 'Lista de inscricoes',
                fileName,
                blob,
                mimeType: 'application/pdf'
            }
        ], { context: 'Lista de inscricoes' });
    }
    catch (error) {
        showError('Falha ao gerar lista em PDF', error);
    }
    finally {
        listPdfState.loading = false;
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.registrationPermissions.canList) {
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
            if (!(__VLS_ctx.registrationPermissions.canList))
                return;
            __VLS_ctx.errorDialog.open = $event;
        }
    };
    var __VLS_2;
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30" },
    }));
    const __VLS_8 = __VLS_7({
        ...{ class: "bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_9.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "max-w-2xl" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "text-3xl font-semibold text-neutral-900 dark:text-white" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-1 text-sm text-neutral-600 dark:text-neutral-400" },
    });
    (__VLS_ctx.hideFilters ? 'Visualize apenas as inscrições da sua igreja.' : 'Filtre e gerencie inscrições por evento, distrito, igreja ou status.');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-800 shadow-md shadow-neutral-200/60 dark:border-white/10 dark:bg-white/10 dark:text-white" },
        'aria-live': "polite",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm font-bold" },
    });
    (__VLS_ctx.registrationCount.displayed);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-[11px] font-medium" },
    });
    (__VLS_ctx.registrationCount.displayed === 1 ? '' : 's');
    if (__VLS_ctx.registrationCount.hasDifference) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-[11px] font-medium text-neutral-600 dark:text-neutral-200" },
        });
        (__VLS_ctx.registrationCount.total);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3" },
    });
    const __VLS_10 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
        to: "/admin/dashboard",
        ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
    }));
    const __VLS_12 = __VLS_11({
        to: "/admin/dashboard",
        ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    __VLS_13.slots.default;
    var __VLS_13;
    if (__VLS_ctx.canGenerateListPdf) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.generateRegistrationListPdf) },
            type: "button",
            ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-primary-200/70 bg-white/90 px-5 py-2.5 text-sm font-semibold text-primary-700 shadow-sm shadow-primary-200/40 transition hover:-translate-y-0.5 hover:border-primary-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100" },
            disabled: (__VLS_ctx.listPdfState.loading || __VLS_ctx.displayedRegistrations.length === 0),
        });
        if (__VLS_ctx.listPdfState.loading) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent dark:border-primary-200" },
            });
        }
    }
    if (__VLS_ctx.registrationPermissions.canCreate) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.openAddDialog) },
            type: "button",
            ...{ class: "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/50 transition hover:translate-y-0.5" },
        });
    }
    var __VLS_9;
    if (!__VLS_ctx.hideFilters) {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }));
        const __VLS_15 = __VLS_14({
            ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_14));
        __VLS_16.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.applyFilters) },
            ...{ class: "grid gap-5 md:grid-cols-12" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2 md:col-span-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.filters.eventId),
            disabled: (__VLS_ctx.isEventFilterLocked),
            ...{ class: "w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        (__VLS_ctx.isEventFilterLocked ? 'Evento vinculado' : 'Todos');
        for (const [event] of __VLS_getVForSourceType((__VLS_ctx.admin.events))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (event.id),
                value: (event.id),
            });
            (event.title);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2 md:col-span-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.filters.lotId),
            disabled: (!__VLS_ctx.filters.eventId || !__VLS_ctx.lotsForSelectedEvent.length),
            ...{ class: "w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        (!__VLS_ctx.filters.eventId ? 'Selecione o evento' : 'Todos os lotes');
        for (const [lot] of __VLS_getVForSourceType((__VLS_ctx.lotsForSelectedEvent))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (lot.id),
                value: (lot.id),
            });
            (lot.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2 md:col-span-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.filters.districtId),
            disabled: (__VLS_ctx.isDistrictFilterLocked),
            ...{ class: "w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        (__VLS_ctx.isDistrictFilterLocked ? 'Distrito vinculado' : 'Todos');
        for (const [district] of __VLS_getVForSourceType((__VLS_ctx.catalog.districts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (district.id),
                value: (district.id),
            });
            (district.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2 md:col-span-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.filters.churchId),
            disabled: (__VLS_ctx.isChurchFilterLocked || !__VLS_ctx.filters.districtId),
            ...{ class: "w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        (__VLS_ctx.isChurchFilterLocked ? 'Igreja vinculada' : (__VLS_ctx.filters.districtId ? 'Todas' : 'Selecione o distrito'));
        for (const [church] of __VLS_getVForSourceType((__VLS_ctx.churchesByDistrict(__VLS_ctx.filters.districtId)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (church.id),
                value: (church.id),
            });
            (church.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2 md:col-span-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.filters.status),
            ...{ class: "w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.registrationStatusOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (option.value),
                value: (option.value),
            });
            (option.label);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2 md:col-span-9" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.filters.search),
            type: "text",
            placeholder: "Digite nome ou CPF",
            ...{ class: "w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
            autocomplete: "off",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-12 flex flex-wrap items-center justify-end gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.resetFilters) },
            type: "button",
            ...{ class: "inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: "submit",
            ...{ class: "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" },
            disabled: (__VLS_ctx.isApplying),
        });
        if (__VLS_ctx.isApplying) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.isApplying ? "Aplicando..." : "Aplicar filtro");
        var __VLS_16;
    }
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
    }));
    const __VLS_18 = __VLS_17({
        ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm text-neutral-600 dark:text-neutral-400 text-center md:text-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hidden flex-wrap items-center gap-2 md:flex" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openPaymentDialog) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" },
        disabled: (!__VLS_ctx.registrationPermissions.canFinancial || __VLS_ctx.selectedRegistrations.length === 0),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.registrationPermissions.canList))
                    return;
                __VLS_ctx.openManualConfirmDialog(__VLS_ctx.selectedRegistrations);
            } },
        type: "button",
        ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-6 py-2.5 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
        disabled: (!__VLS_ctx.registrationPermissions.canFinancial || __VLS_ctx.selectedRegistrations.length === 0),
    });
    if (__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0) {
        /** @type {[typeof TableSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
            helperText: "?? Buscando inscrições...",
        }));
        const __VLS_21 = __VLS_20({
            helperText: "?? Buscando inscrições...",
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    }
    else if (__VLS_ctx.displayedRegistrations.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "p-6 text-sm text-neutral-500 dark:text-neutral-400" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "overflow-hidden rounded-sm border-0 bg-transparent shadow-none md:rounded-sm md:border md:border-white/40 md:bg-white/70 md:shadow-lg md:shadow-neutral-200/40 dark:md:border-white/10 dark:md:bg-neutral-950/40 dark:md:shadow-black/30" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hidden md:block overflow-x-auto" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "min-w-[900px] w-full table-auto text-sm text-neutral-700 dark:text-neutral-200" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
            ...{ class: "bg-white/60 text-left text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "w-10 px-5 py-3 text-center whitespace-nowrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.registrationPermissions.canList))
                        return;
                    if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                        return;
                    if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                        return;
                    __VLS_ctx.toggleSelectAllDisplayed($event.target?.checked ?? false);
                } },
            type: "checkbox",
            ...{ class: "h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" },
            checked: (__VLS_ctx.allDisplayedSelected),
            indeterminate: (__VLS_ctx.someDisplayedSelected && !__VLS_ctx.allDisplayedSelected),
            'aria-label': "Selecionar todas as inscrições exibidas",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "w-20 min-w-[64px] px-4 py-3 whitespace-nowrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "min-w-[300px] px-4 py-3 whitespace-nowrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "min-w-[200px] px-4 py-3 whitespace-nowrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "min-w-[150px] px-4 py-3 whitespace-nowrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "min-w-[120px] px-4 py-3 whitespace-nowrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "min-w-[170px] px-4 py-3 whitespace-nowrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "min-w-[75x] px-4 py-3 text-right whitespace-nowrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({
            ...{ class: "divide-y divide-neutral-100 dark:divide-white/5" },
        });
        for (const [registration] of __VLS_getVForSourceType((__VLS_ctx.displayedRegistrations))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (registration.id),
                ...{ class: "transition hover:bg-white/80 dark:hover:bg-white/5" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-2.5 align-top text-center" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (...[$event]) => {
                        if (!(__VLS_ctx.registrationPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                            return;
                        if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                            return;
                        __VLS_ctx.toggleRegistrationSelection(registration, $event.target?.checked ?? false);
                    } },
                type: "checkbox",
                ...{ class: "h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:opacity-40" },
                disabled: (!__VLS_ctx.isRegistrationSelectable(registration)),
                checked: (__VLS_ctx.isRegistrationSelected(registration.id)),
                'aria-label': (`Selecionar inscrição ${registration.fullName}`),
            });
            if (__VLS_ctx.selectionDisabledReason(registration)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-1 text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500" },
                });
                (__VLS_ctx.selectionDisabledReason(registration));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-2.5 align-top" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.resolvePhotoUrl(registration.photoUrl)),
                ...{ class: "h-12 w-12 rounded-full border border-white/70 object-cover dark:border-white/10" },
                alt: (`Foto de ${registration.fullName}`),
                loading: "lazy",
                decoding: "async",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-2.5 align-top" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "font-semibold text-neutral-900 dark:text-white leading-snug" },
            });
            (registration.fullName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 leading-tight" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatCPF(registration.cpf));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "hidden sm:inline" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.registrationCode(registration));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-[11px] text-neutral-500 dark:text-neutral-500 leading-tight" },
            });
            (__VLS_ctx.formatDateTime(registration.createdAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-2.5 align-top" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "font-medium text-neutral-800 dark:text-neutral-200 leading-snug" },
            });
            (__VLS_ctx.findEventTitle(registration.eventId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 leading-tight" },
            });
            if (__VLS_ctx.findRegistrationLotLabel(registration)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.findRegistrationLotLabel(registration));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatCurrency(registration.priceCents ?? __VLS_ctx.findEventPriceCents(registration.eventId)));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "hidden sm:inline" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.paymentMethodShort(registration.paymentMethod));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-2.5 align-top" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-sm text-neutral-700 dark:text-neutral-300 leading-snug" },
            });
            (__VLS_ctx.findDistrictName(registration.districtId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-neutral-500 dark:text-neutral-400 leading-tight" },
            });
            (__VLS_ctx.findChurchName(registration.churchId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-2.5 align-top" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-sm text-neutral-700 dark:text-neutral-300 leading-snug" },
            });
            (__VLS_ctx.formatBirthDate(registration.birthDate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-neutral-500 dark:text-neutral-400 leading-tight" },
            });
            (__VLS_ctx.calculateAge(registration.birthDate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-3 align-top" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase" },
                ...{ class: (__VLS_ctx.statusBadgeClass(registration.status)) },
            });
            (__VLS_ctx.translateStatus(registration.status));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-1 text-[11px] text-neutral-500 dark:text-neutral-500 leading-tight space-y-0.5" },
            });
            if (registration.paymentMethod || registration.paidAt) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex flex-wrap items-center gap-2" },
                });
                if (registration.paymentMethod) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (__VLS_ctx.paymentMethodShort(registration.paymentMethod));
                }
                if (registration.paymentMethod && registration.paidAt) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "hidden sm:inline" },
                    });
                }
                if (registration.paidAt) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (new Date(registration.paidAt).toLocaleString("pt-BR"));
                }
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-2.5 align-top text-right" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex flex-nowrap items-center justify-end gap-2 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" },
            });
            if (__VLS_ctx.registrationPermissions.canEdit) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.registrationPermissions.canList))
                                return;
                            if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                return;
                            if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                return;
                            if (!(__VLS_ctx.registrationPermissions.canEdit))
                                return;
                            __VLS_ctx.openEdit(registration);
                        } },
                    ...{ class: "action-btn" },
                });
            }
            if (__VLS_ctx.canEmitReceipt(registration)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.registrationPermissions.canList))
                                return;
                            if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                return;
                            if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                return;
                            if (!(__VLS_ctx.canEmitReceipt(registration)))
                                return;
                            __VLS_ctx.downloadReceipt(registration);
                        } },
                    ...{ class: "action-btn" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "relative" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.registrationPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                            return;
                        if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                            return;
                        __VLS_ctx.toggleActions(registration.id);
                    } },
                ...{ class: "action-btn" },
            });
            if (__VLS_ctx.openedActions === registration.id) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "dropdown-panel" },
                });
                if (__VLS_ctx.isPaymentLinkVisible(registration) && __VLS_ctx.registrationPermissions.canEdit) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.isPaymentLinkVisible(registration) && __VLS_ctx.registrationPermissions.canEdit))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.copyPaymentLink(registration);
                            } },
                        ...{ class: "dropdown-item" },
                    });
                }
                if (registration.status === 'PENDING_PAYMENT' && __VLS_ctx.registrationPermissions.canFinancial) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(registration.status === 'PENDING_PAYMENT' && __VLS_ctx.registrationPermissions.canFinancial))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openPaymentDialog([registration]);
                            } },
                        ...{ class: "dropdown-item" },
                    });
                }
                if (registration.status === 'PENDING_PAYMENT' && __VLS_ctx.registrationPermissions.canFinancial) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(registration.status === 'PENDING_PAYMENT' && __VLS_ctx.registrationPermissions.canFinancial))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openManualConfirmDialog([registration]);
                            } },
                        ...{ class: "dropdown-item" },
                    });
                }
                if (__VLS_ctx.canConfirmManualPix(registration)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.canConfirmManualPix(registration)))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openManualPaymentDialog(registration);
                            } },
                        ...{ class: "dropdown-item" },
                    });
                }
                if (__VLS_ctx.canViewManualProof(registration)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.canViewManualProof(registration)))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.viewManualProof(registration);
                            } },
                        ...{ class: "dropdown-item" },
                    });
                }
                if (__VLS_ctx.canCancelRegistration(registration.status) &&
                    registration.status === 'PENDING_PAYMENT' &&
                    __VLS_ctx.registrationPermissions.canDeactivate) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.canCancelRegistration(registration.status) &&
                                    registration.status === 'PENDING_PAYMENT' &&
                                    __VLS_ctx.registrationPermissions.canDeactivate))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openConfirm('cancel', registration);
                            } },
                        ...{ class: "dropdown-item text-red-600 hover:text-red-500 dark:text-red-400" },
                    });
                }
                if (registration.status === 'PAID' && __VLS_ctx.registrationPermissions.canFinancial) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(registration.status === 'PAID' && __VLS_ctx.registrationPermissions.canFinancial))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openConfirm('refund', registration);
                            } },
                        ...{ class: "dropdown-item" },
                    });
                }
                if (registration.status === 'CANCELED' && __VLS_ctx.registrationPermissions.canApprove) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(registration.status === 'CANCELED' && __VLS_ctx.registrationPermissions.canApprove))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openConfirm('reactivate', registration);
                            } },
                        ...{ class: "dropdown-item" },
                    });
                }
                if (__VLS_ctx.canDeleteRegistration(registration.status) && __VLS_ctx.registrationPermissions.canDelete) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.canDeleteRegistration(registration.status) && __VLS_ctx.registrationPermissions.canDelete))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openConfirm('delete', registration);
                            } },
                        ...{ class: "dropdown-item text-red-600 hover:text-red-500 dark:text-red-400" },
                    });
                }
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:hidden space-y-5 p-4" },
        });
        if (__VLS_ctx.registrationPermissions.canFinancial) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                ...{ class: "space-y-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.openPaymentDialog) },
                type: "button",
                ...{ class: "w-full rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60" },
                disabled: (__VLS_ctx.selectedRegistrations.length === 0),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.registrationPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                            return;
                        if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                            return;
                        if (!(__VLS_ctx.registrationPermissions.canFinancial))
                            return;
                        __VLS_ctx.openManualConfirmDialog(__VLS_ctx.selectedRegistrations);
                    } },
                type: "button",
                ...{ class: "w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-100" },
                disabled: (__VLS_ctx.selectedRegistrations.length === 0),
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-semibold" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-bold text-slate-900 dark:text-white" },
        });
        (__VLS_ctx.selectedRegistrations.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-bold text-slate-900 dark:text-white" },
        });
        (__VLS_ctx.formatCurrency(__VLS_ctx.selectionTotalCents));
        if (__VLS_ctx.registrationPermissions.canFinancial) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-3 grid grid-cols-2 gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.openPaymentDialog) },
                type: "button",
                ...{ class: "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-primary-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-blue-300" },
                disabled: (__VLS_ctx.selectedRegistrations.length === 0),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.registrationPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                            return;
                        if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                            return;
                        if (!(__VLS_ctx.registrationPermissions.canFinancial))
                            return;
                        __VLS_ctx.openManualConfirmDialog(__VLS_ctx.selectedRegistrations);
                    } },
                type: "button",
                ...{ class: "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" },
                disabled: (__VLS_ctx.selectedRegistrations.length === 0),
            });
        }
        if (__VLS_ctx.canGenerateListPdf) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.generateRegistrationListPdf) },
                type: "button",
                ...{ class: "mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200/80 bg-white px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-primary-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100" },
                disabled: (__VLS_ctx.listPdfState.loading || __VLS_ctx.displayedRegistrations.length === 0),
            });
            if (__VLS_ctx.listPdfState.loading) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                    ...{ class: "h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent dark:border-primary-200" },
                });
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-4" },
        });
        for (const [registration] of __VLS_getVForSourceType((__VLS_ctx.displayedRegistrations))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (registration.id),
                ...{ class: "group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-700 dark:bg-slate-800" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "absolute left-0 top-0 h-full w-1.5" },
                ...{ class: (__VLS_ctx.statusAccentClass(registration.status)) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "p-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mb-3 flex items-start gap-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "pt-1 pl-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (...[$event]) => {
                        if (!(__VLS_ctx.registrationPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                            return;
                        if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                            return;
                        __VLS_ctx.toggleRegistrationSelection(registration, $event.target?.checked ?? false);
                    } },
                type: "checkbox",
                ...{ class: "h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:opacity-40 dark:border-slate-600" },
                disabled: (!__VLS_ctx.isRegistrationSelectable(registration)),
                checked: (__VLS_ctx.isRegistrationSelected(registration.id)),
                'aria-label': (`Selecionar inscricao ${registration.fullName}`),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "relative" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.resolvePhotoUrl(registration.photoUrl)),
                ...{ class: "h-12 w-12 rounded-full border border-slate-200 object-cover dark:border-slate-700" },
                alt: (`Foto de ${registration.fullName}`),
                loading: "lazy",
                decoding: "async",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "min-w-0 flex-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
                ...{ class: "truncate text-sm font-bold text-slate-900 dark:text-white" },
            });
            (registration.fullName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "mt-1 text-xs font-mono text-slate-500 dark:text-slate-400" },
            });
            (__VLS_ctx.formatCPF(registration.cpf));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 flex flex-wrap items-center gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" },
                ...{ class: (__VLS_ctx.statusBadgeClass(registration.status)) },
            });
            (__VLS_ctx.translateStatus(registration.status));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-[10px] text-slate-400 dark:text-slate-500" },
            });
            (__VLS_ctx.paymentMethodShort(registration.paymentMethod || registration.order?.paymentMethod || ''));
            (__VLS_ctx.formatDateTime(registration.paidAt || registration.createdAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.registrationPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                            return;
                        if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                            return;
                        __VLS_ctx.toggleActions(registration.id);
                    } },
                ...{ class: "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" },
                'aria-expanded': (__VLS_ctx.openedActions === registration.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ml-9 space-y-3 border-l-2 border-slate-100 pl-4 pt-1 dark:border-slate-700/50" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-[10px] font-bold uppercase tracking-wide text-slate-400" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-sm font-semibold text-slate-700 dark:text-slate-200" },
            });
            (__VLS_ctx.findEventTitle(registration.eventId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-slate-500 dark:text-slate-400" },
            });
            if (__VLS_ctx.findRegistrationLotLabel(registration)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.findRegistrationLotLabel(registration));
            }
            (__VLS_ctx.formatCurrency(registration.priceCents ?? __VLS_ctx.findEventPriceCents(registration.eventId)));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex items-end justify-between gap-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-[10px] font-bold uppercase tracking-wide text-slate-400" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-slate-700 dark:text-slate-200" },
            });
            (__VLS_ctx.findChurchName(registration.churchId));
            (__VLS_ctx.findDistrictName(registration.districtId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex gap-1" },
            });
            if (__VLS_ctx.registrationPermissions.canEdit) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.registrationPermissions.canList))
                                return;
                            if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                return;
                            if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                return;
                            if (!(__VLS_ctx.registrationPermissions.canEdit))
                                return;
                            __VLS_ctx.openEdit(registration);
                        } },
                    ...{ class: "rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700" },
                    title: "Editar",
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.registrationPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                            return;
                        if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                            return;
                        __VLS_ctx.toggleActions(registration.id);
                    } },
                ...{ class: "rounded-lg p-2 text-primary-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20" },
                title: "Acoes",
            });
            if (__VLS_ctx.openedActions === registration.id) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-3 rounded-xl border border-white/10 bg-neutral-900/95 p-2 text-[11px] dark:border-white/10" },
                });
                if (__VLS_ctx.canEmitReceipt(registration)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.canEmitReceipt(registration)))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.downloadReceipt(registration);
                            } },
                        ...{ class: "dropdown-item w-full" },
                    });
                }
                if (__VLS_ctx.isPaymentLinkVisible(registration) && __VLS_ctx.registrationPermissions.canEdit) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.isPaymentLinkVisible(registration) && __VLS_ctx.registrationPermissions.canEdit))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.copyPaymentLink(registration);
                            } },
                        ...{ class: "dropdown-item w-full" },
                    });
                }
                if (registration.status === 'PENDING_PAYMENT' && __VLS_ctx.registrationPermissions.canFinancial) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(registration.status === 'PENDING_PAYMENT' && __VLS_ctx.registrationPermissions.canFinancial))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openPaymentDialog([registration]);
                            } },
                        ...{ class: "dropdown-item w-full" },
                    });
                }
                if (registration.status === 'PENDING_PAYMENT' && __VLS_ctx.registrationPermissions.canFinancial) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(registration.status === 'PENDING_PAYMENT' && __VLS_ctx.registrationPermissions.canFinancial))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openManualConfirmDialog([registration]);
                            } },
                        ...{ class: "dropdown-item w-full" },
                    });
                }
                if (__VLS_ctx.canConfirmManualPix(registration)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.canConfirmManualPix(registration)))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openManualPaymentDialog(registration);
                            } },
                        ...{ class: "dropdown-item w-full" },
                    });
                }
                if (__VLS_ctx.canViewManualProof(registration)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.canViewManualProof(registration)))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.viewManualProof(registration);
                            } },
                        ...{ class: "dropdown-item w-full" },
                    });
                }
                if (__VLS_ctx.canCancelRegistration(registration.status) &&
                    registration.status === 'PENDING_PAYMENT' &&
                    __VLS_ctx.registrationPermissions.canDeactivate) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.canCancelRegistration(registration.status) &&
                                    registration.status === 'PENDING_PAYMENT' &&
                                    __VLS_ctx.registrationPermissions.canDeactivate))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openConfirm('cancel', registration);
                            } },
                        ...{ class: "dropdown-item w-full text-red-400 hover:text-red-300" },
                    });
                }
                if (registration.status === 'PAID' && __VLS_ctx.registrationPermissions.canFinancial) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(registration.status === 'PAID' && __VLS_ctx.registrationPermissions.canFinancial))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openConfirm('refund', registration);
                            } },
                        ...{ class: "dropdown-item w-full" },
                    });
                }
                if (registration.status === 'CANCELED' && __VLS_ctx.registrationPermissions.canApprove) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(registration.status === 'CANCELED' && __VLS_ctx.registrationPermissions.canApprove))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openConfirm('reactivate', registration);
                            } },
                        ...{ class: "dropdown-item w-full" },
                    });
                }
                if (__VLS_ctx.canDeleteRegistration(registration.status) && __VLS_ctx.registrationPermissions.canDelete) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.registrationPermissions.canList))
                                    return;
                                if (!!(__VLS_ctx.isApplying && __VLS_ctx.admin.registrations.length === 0))
                                    return;
                                if (!!(__VLS_ctx.displayedRegistrations.length === 0))
                                    return;
                                if (!(__VLS_ctx.openedActions === registration.id))
                                    return;
                                if (!(__VLS_ctx.canDeleteRegistration(registration.status) && __VLS_ctx.registrationPermissions.canDelete))
                                    return;
                                __VLS_ctx.openedActions = null;
                                __VLS_ctx.openConfirm('delete', registration);
                            } },
                        ...{ class: "dropdown-item w-full text-red-400 hover:text-red-300" },
                    });
                }
            }
        }
    }
    var __VLS_19;
    if (__VLS_ctx.manualConfirmDialog.open) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "w-full max-w-2xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-start justify-between gap-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeManualConfirmDialog) },
            type: "button",
            ...{ class: "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white" },
            'aria-label': "Fechar confirmacao manual",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 space-y-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.manualConfirmDialog.items.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.findEventTitle(__VLS_ctx.manualConfirmDialog.items[0]?.eventId ?? ''));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-200" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "grid gap-2 sm:grid-cols-2" },
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.manualConfirmPaymentOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                key: (option.value),
                ...{ class: "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm shadow-sm transition hover:border-primary-400 dark:border-neutral-700 dark:hover:border-primary-400" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex items-center gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "radio",
                ...{ class: "h-4 w-4 text-primary-600 focus:ring-primary-500" },
                value: (option.value),
            });
            (__VLS_ctx.manualConfirmDialog.paymentMethod);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "font-semibold text-neutral-800 dark:text-neutral-100" },
            });
            (__VLS_ctx.paymentMethodLabel(option.value));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
            });
            (option.description ?? '');
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeManualConfirmDialog) },
            type: "button",
            ...{ class: "rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800" },
            disabled: (__VLS_ctx.manualConfirmDialog.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.confirmManualPayment) },
            type: "button",
            ...{ class: "rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60" },
            disabled: (__VLS_ctx.manualConfirmDialog.loading || !__VLS_ctx.manualConfirmDialog.paymentMethod),
        });
        (__VLS_ctx.manualConfirmDialog.loading ? "Confirmando..." : "Confirmar pagamento");
        if (__VLS_ctx.manualConfirmDialog.error) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "mt-2 text-sm text-red-600 dark:text-red-400" },
            });
            (__VLS_ctx.manualConfirmDialog.error);
        }
    }
    if (__VLS_ctx.paymentDialog.open) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "w-full max-w-3xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-start justify-between gap-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closePaymentDialog) },
            type: "button",
            ...{ class: "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white" },
            'aria-label': "Fechar resumo de pagamento",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 max-h-[60vh] space-y-3 overflow-auto" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.paymentDialog.items))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (item.id),
                ...{ class: "flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "font-semibold text-neutral-900 dark:text-white" },
            });
            (item.fullName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
            });
            (__VLS_ctx.formatCPF(item.cpf));
            (__VLS_ctx.formatCurrency(item.priceCents ?? __VLS_ctx.findEventPriceCents(item.eventId)));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.registrationPermissions.canList))
                            return;
                        if (!(__VLS_ctx.paymentDialog.open))
                            return;
                        __VLS_ctx.removeFromPaymentDialog(item.id);
                    } },
                type: "button",
                ...{ class: "text-xs font-semibold text-red-600 hover:text-red-500 disabled:opacity-50" },
                disabled: (__VLS_ctx.paymentDialog.loading),
            });
        }
        if (!__VLS_ctx.paymentDialog.items.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
            });
        }
        if (__VLS_ctx.paymentDialogAllowedMethods.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 space-y-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-200" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "grid gap-2 sm:grid-cols-2" },
            });
            for (const [option] of __VLS_getVForSourceType((__VLS_ctx.paymentDialogAllowedMethods))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    key: (option.value),
                    ...{ class: "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm shadow-sm transition hover:border-primary-400 dark:border-neutral-700 dark:hover:border-primary-400" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center gap-2" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    type: "radio",
                    ...{ class: "h-4 w-4 text-primary-600 focus:ring-primary-500" },
                    value: (option.value),
                });
                (__VLS_ctx.paymentDialog.paymentMethod);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "font-semibold text-neutral-800 dark:text-neutral-100" },
                });
                (__VLS_ctx.paymentMethodLabel(option.value));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                });
                (option.description ?? '');
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-sm text-neutral-600 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-semibold text-neutral-900 dark:text-white" },
        });
        (__VLS_ctx.selectedRegistrations.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-semibold text-neutral-900 dark:text-white" },
        });
        (__VLS_ctx.formatCurrency(__VLS_ctx.selectionTotalCents));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closePaymentDialog) },
            type: "button",
            ...{ class: "rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800" },
            disabled: (__VLS_ctx.paymentDialog.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.confirmPaymentGeneration) },
            type: "button",
            ...{ class: "rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60" },
            disabled: (__VLS_ctx.paymentDialog.loading || !__VLS_ctx.paymentDialog.items.length),
        });
        (__VLS_ctx.paymentDialog.loading ? "Gerando..." : "Confirmar pagamento");
        if (__VLS_ctx.paymentDialog.successOrderId) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "font-semibold" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-1 text-xs text-primary-800 dark:text-primary-100" },
            });
            (__VLS_ctx.paymentDialog.successOrderId);
            if (__VLS_ctx.paymentDialog.successLink) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-2 flex flex-wrap items-center gap-2" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({
                    ...{ class: "rounded bg-white/80 px-2 py-1 text-xs text-neutral-800 shadow-sm dark:bg-neutral-900 dark:text-neutral-100" },
                });
                (__VLS_ctx.paymentDialog.successLink);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.registrationPermissions.canList))
                                return;
                            if (!(__VLS_ctx.paymentDialog.open))
                                return;
                            if (!(__VLS_ctx.paymentDialog.successOrderId))
                                return;
                            if (!(__VLS_ctx.paymentDialog.successLink))
                                return;
                            __VLS_ctx.copyPaymentUrl(__VLS_ctx.paymentDialog.successLink);
                        } },
                    type: "button",
                    ...{ class: "rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-500" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    href: (__VLS_ctx.paymentDialog.successLink),
                    target: "_blank",
                    rel: "noopener noreferrer",
                    ...{ class: "rounded-full border border-primary-500 px-3 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-300 dark:text-primary-100 dark:hover:bg-primary-500/10" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-1 text-xs text-primary-800 dark:text-primary-100" },
                });
            }
        }
        if (__VLS_ctx.paymentDialog.error) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "mt-2 text-sm text-red-600 dark:text-red-400" },
            });
            (__VLS_ctx.paymentDialog.error);
        }
    }
    if (__VLS_ctx.addDialog.open) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "w-full max-w-4xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 text-sm text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.saveNewRegistration) },
            ...{ class: "mt-4 grid gap-4 md:grid-cols-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (__VLS_ctx.onResponsibleCpfInput) },
            ...{ onBlur: (__VLS_ctx.handleResponsibleCpfLookup) },
            value: (__VLS_ctx.addForm.responsibleCpf),
            inputmode: "numeric",
            autocomplete: "off",
            maxlength: "14",
            placeholder: "000.000.000-00",
            required: true,
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800" },
        });
        if (__VLS_ctx.responsibleLookup.message) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: (['mt-2 text-xs', __VLS_ctx.responsibleLookup.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-300']) },
            });
            (__VLS_ctx.responsibleLookup.message);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (__VLS_ctx.onResponsiblePhoneInput) },
            value: (__VLS_ctx.addForm.responsiblePhone),
            inputmode: "numeric",
            placeholder: "(91) 99999-9999",
            required: true,
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.addForm.eventId),
            required: true,
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        for (const [event] of __VLS_getVForSourceType((__VLS_ctx.admin.events))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (event.id),
                value: (event.id),
            });
            (event.title);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 flex flex-wrap gap-4 text-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "inline-flex items-center gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "radio",
            value: "PIX_MP",
        });
        (__VLS_ctx.addDialog.paymentMethod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "inline-flex items-center gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "radio",
            value: "CASH",
        });
        (__VLS_ctx.addDialog.paymentMethod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "inline-flex items-center gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "radio",
            value: "FREE_PREVIOUS_YEAR",
        });
        (__VLS_ctx.addDialog.paymentMethod);
        if (__VLS_ctx.addDialog.paymentMethod === 'PIX_MP') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "md:col-span-2 rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:bg-primary-500/10 dark:text-primary-200" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2 mt-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.addForm.fullName),
            type: "text",
            required: true,
            minlength: "3",
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        /** @type {[typeof DateField, ]} */ ;
        // @ts-ignore
        const __VLS_23 = __VLS_asFunctionalComponent(DateField, new DateField({
            modelValue: (__VLS_ctx.addForm.birthDate),
            required: true,
            ...{ class: "mt-1" },
        }));
        const __VLS_24 = __VLS_23({
            modelValue: (__VLS_ctx.addForm.birthDate),
            required: true,
            ...{ class: "mt-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_23));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (__VLS_ctx.onAddCpfInput) },
            value: (__VLS_ctx.addForm.cpf),
            inputmode: "numeric",
            autocomplete: "off",
            maxlength: "14",
            placeholder: "000.000.000-00",
            required: true,
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.addForm.gender),
            required: true,
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
            disabled: true,
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.genderOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (option.value),
                value: (option.value),
            });
            (option.label);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.addForm.districtId),
            required: true,
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
            disabled: true,
        });
        for (const [district] of __VLS_getVForSourceType((__VLS_ctx.catalog.districts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (district.id),
                value: (district.id),
            });
            (district.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.addForm.churchId),
            required: true,
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
            disabled: true,
        });
        for (const [church] of __VLS_getVForSourceType((__VLS_ctx.churchesByDistrict(__VLS_ctx.addForm.districtId)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (church.id),
                value: (church.id),
            });
            (church.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-1 flex flex-wrap items-center gap-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.handleAddPhotoChange) },
            type: "file",
            accept: "image/*",
            ...{ class: "block w-full max-w-xs text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 hover:file:bg-primary-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.addPhotoPreview || __VLS_ctx.DEFAULT_PHOTO_DATA_URL),
            alt: "Pré-visualização",
            ...{ class: "h-20 w-20 rounded-lg object-cover" },
        });
        if (__VLS_ctx.addPhotoPreview) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.clearAddPhoto) },
                type: "button",
                ...{ class: "text-xs font-medium text-red-600 hover:text-red-500" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2 flex flex-col gap-2 text-xs text-neutral-500 dark:text-neutral-400" },
        });
        if (__VLS_ctx.responsibleLookup.status === 'success') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2 flex justify-end gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeAdd) },
            type: "button",
            ...{ class: "rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: "submit",
            ...{ class: "rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500" },
        });
    }
    if (__VLS_ctx.editDialog.open) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "w-full max-w-2xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.saveRegistration) },
            ...{ class: "mt-4 grid gap-4 md:grid-cols-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.editForm.fullName),
            type: "text",
            required: true,
            minlength: "3",
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2 grid gap-2 md:grid-cols-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 text-sm text-neutral-700 dark:text-neutral-200" },
        });
        (__VLS_ctx.paymentMethodShort(__VLS_ctx.editDialog.original?.paymentMethod || ''));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 text-sm text-neutral-700 dark:text-neutral-200" },
        });
        (__VLS_ctx.editDialog.original?.paidAt ? new Date(__VLS_ctx.editDialog.original.paidAt).toLocaleString('pt-BR') : '--');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 text-sm text-neutral-700 dark:text-neutral-200" },
        });
        (__VLS_ctx.refundedAt ? new Date(__VLS_ctx.refundedAt).toLocaleString('pt-BR') : '--');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 flex items-center gap-4" },
        });
        if (__VLS_ctx.previewPhotoUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.previewPhotoUrl),
                alt: "Foto do participante",
                ...{ class: "h-16 w-16 rounded-full object-cover ring-1 ring-neutral-300 dark:ring-neutral-700" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.onEditPhotoChange) },
            type: "file",
            accept: "image/*",
            ...{ class: "block w-full text-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 flex items-center gap-3" },
        });
        if (__VLS_ctx.previewPhotoUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.clearEditPhoto) },
                type: "button",
                ...{ class: "text-xs text-neutral-600 underline dark:text-neutral-400" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
        });
        /** @type {[typeof DateField, ]} */ ;
        // @ts-ignore
        const __VLS_26 = __VLS_asFunctionalComponent(DateField, new DateField({
            modelValue: (__VLS_ctx.editForm.birthDate),
            required: true,
            ...{ class: "mt-1" },
        }));
        const __VLS_27 = __VLS_26({
            modelValue: (__VLS_ctx.editForm.birthDate),
            required: true,
            ...{ class: "mt-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_26));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (__VLS_ctx.onCpfInput) },
            value: (__VLS_ctx.editForm.cpf),
            inputmode: "numeric",
            autocomplete: "off",
            maxlength: "14",
            placeholder: "000.000.000-00",
            required: true,
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.editForm.districtId),
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        for (const [district] of __VLS_getVForSourceType((__VLS_ctx.catalog.districts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (district.id),
                value: (district.id),
            });
            (district.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.editForm.churchId),
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
        });
        for (const [church] of __VLS_getVForSourceType((__VLS_ctx.churchesByDistrict(__VLS_ctx.editForm.districtId)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (church.id),
                value: (church.id),
            });
            (church.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2 flex justify-end gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeEdit) },
            type: "button",
            ...{ class: "rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: "submit",
            ...{ class: "rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: "mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
        });
        if (__VLS_ctx.historyLoading) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "py-2 text-sm text-neutral-500" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "max-h-60 space-y-2 overflow-y-auto pr-2 text-sm" },
            });
            for (const [e, idx] of __VLS_getVForSourceType((__VLS_ctx.registrationHistory))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (idx),
                    ...{ class: "rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/40" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center justify-between" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "font-medium text-neutral-700 dark:text-neutral-100" },
                });
                (__VLS_ctx.humanEvent(e));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "text-xs text-neutral-500" },
                });
                (new Date(e.at).toLocaleString('pt-BR'));
                if (e.actor && (e.actor.name || e.actor.id)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "mt-1 text-xs text-neutral-500" },
                    });
                    (e.actor.name || e.actor.id);
                }
                if (e.details && __VLS_ctx.showDetails(e.type)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
                        ...{ class: "mt-2 overflow-x-auto text-xs text-neutral-500" },
                    });
                    (__VLS_ctx.formatDetails(e.details));
                }
            }
            if (__VLS_ctx.registrationHistory.length === 0) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    ...{ class: "rounded-md border border-neutral-200 p-3 text-sm text-neutral-500 dark:border-neutral-800" },
                });
            }
        }
    }
    /** @type {[typeof ConfirmDialog, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(ConfirmDialog, new ConfirmDialog({
        ...{ 'onUpdate:modelValue': {} },
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        modelValue: (__VLS_ctx.confirmState.open),
        title: (__VLS_ctx.confirmState.title),
        description: (__VLS_ctx.confirmState.description),
        confirmLabel: (__VLS_ctx.confirmState.confirmLabel),
        cancelLabel: (__VLS_ctx.confirmState.cancelLabel),
        type: (__VLS_ctx.confirmState.type),
    }));
    const __VLS_30 = __VLS_29({
        ...{ 'onUpdate:modelValue': {} },
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        modelValue: (__VLS_ctx.confirmState.open),
        title: (__VLS_ctx.confirmState.title),
        description: (__VLS_ctx.confirmState.description),
        confirmLabel: (__VLS_ctx.confirmState.confirmLabel),
        cancelLabel: (__VLS_ctx.confirmState.cancelLabel),
        type: (__VLS_ctx.confirmState.type),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    let __VLS_32;
    let __VLS_33;
    let __VLS_34;
    const __VLS_35 = {
        'onUpdate:modelValue': (__VLS_ctx.handleDialogVisibility)
    };
    const __VLS_36 = {
        onConfirm: (__VLS_ctx.executeConfirmAction)
    };
    const __VLS_37 = {
        onCancel: (__VLS_ctx.resetConfirmState)
    };
    var __VLS_31;
    if (__VLS_ctx.manualPayment.open) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fixed inset-0 z-[65] flex items-center justify-center bg-black/60 px-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold text-neutral-900 dark:text-white" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 space-y-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.manualPayment.reference),
            type: "text",
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800" },
            placeholder: "PIX-MANUAL-...",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "datetime-local",
            ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800" },
        });
        (__VLS_ctx.manualPayment.paidAt);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase text-neutral-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.handleManualProofChange) },
            key: (__VLS_ctx.manualPayment.fileInputKey),
            type: "file",
            accept: "image/*,application/pdf",
            ...{ class: "mt-2 block w-full text-sm text-neutral-600 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 hover:file:bg-primary-100 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 text-xs text-neutral-500 dark:text-neutral-400" },
        });
        if (__VLS_ctx.manualPayment.filePreview) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-3 overflow-hidden rounded-xl border border-neutral-200 shadow-inner dark:border-neutral-700" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.manualPayment.filePreview),
                alt: "Pré-visualização do comprovante",
                ...{ class: "max-h-52 w-full bg-neutral-50 object-contain dark:bg-neutral-900" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "border-t border-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-300" },
            });
            (__VLS_ctx.manualPayment.fileName);
        }
        else if (__VLS_ctx.manualPayment.fileName) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-3 rounded-xl border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300" },
            });
            (__VLS_ctx.manualPayment.fileName);
            (__VLS_ctx.manualPayment.fileType || 'arquivo');
        }
        if (__VLS_ctx.manualPayment.existingProofUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.openExistingManualProof) },
                type: "button",
                ...{ class: "mt-3 text-xs font-semibold text-primary-600 hover:text-primary-500" },
            });
        }
        if (__VLS_ctx.manualPayment.error) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-sm text-red-500" },
            });
            (__VLS_ctx.manualPayment.error);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-6 flex justify-end gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeManualPaymentDialog) },
            type: "button",
            ...{ class: "rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800" },
            disabled: (__VLS_ctx.manualPayment.submitting),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.submitManualPayment) },
            type: "button",
            ...{ class: "inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60" },
            disabled: (__VLS_ctx.manualPayment.submitting),
        });
        if (__VLS_ctx.manualPayment.submitting) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "mr-2 h-4 w-4 animate-spin rounded-full border border-white border-b-transparent" },
            });
        }
    }
    if (__VLS_ctx.processing.open) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fixed inset-0 z-[60] flex items-center justify-center bg-black/60" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg bg-white px-6 py-4 text-sm shadow dark:bg-neutral-900" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            ...{ class: "h-5 w-5 animate-spin text-primary-600" },
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle, __VLS_intrinsicElements.circle)({
            ...{ class: "opacity-25" },
            cx: "12",
            cy: "12",
            r: "10",
            stroke: "currentColor",
            'stroke-width': "4",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            ...{ class: "opacity-75" },
            fill: "currentColor",
            d: "M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-neutral-700 dark:text-neutral-100" },
        });
        (__VLS_ctx.processing.message);
    }
}
else {
    /** @type {[typeof AccessDeniedNotice, ]} */ ;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent(AccessDeniedNotice, new AccessDeniedNotice({
        module: "registrations",
        action: "view",
    }));
    const __VLS_39 = __VLS_38({
        module: "registrations",
        action: "view",
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    var __VLS_41 = {};
    var __VLS_40;
}
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-primary-50/40']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-100/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-neutral-900/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-primary-950/30']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
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
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-200/40']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/50']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-neutral-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['to-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-12']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-9']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:placeholder-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-12']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
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
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-neutral-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['to-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['md:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['md:text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-none']} */ ;
/** @type {__VLS_StyleScopedClasses['md:rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['md:border']} */ ;
/** @type {__VLS_StyleScopedClasses['md:border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['md:bg-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['md:shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['md:shadow-neutral-200/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:md:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:md:bg-neutral-950/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:md:shadow-black/30']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['md:block']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-[900px]']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['table-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['w-20']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-[64px]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-[300px]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-[200px]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-[150px]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-[120px]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-[170px]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-[75x]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['align-top']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['align-top']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['align-top']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-snug']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['align-top']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-snug']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['align-top']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-snug']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['align-top']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-snug']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['align-top']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['align-top']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/30']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['active:scale-[0.98]']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['active:scale-[0.98]']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-blue-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800/50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-slate-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-blue-300']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-slate-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['h-3.5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-3.5']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['group']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary/30']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:shadow-md']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['left-0']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['pl-1']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-9']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-l-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['pl-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700/50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-blue-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-blue-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-blue-900/20']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-900/95']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-red-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-red-300']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/30']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-[60vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/30']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-primary-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['file:mr-4']} */ ;
/** @type {__VLS_StyleScopedClasses['file:rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['file:border-0']} */ ;
/** @type {__VLS_StyleScopedClasses['file:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['file:px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['file:py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['file:text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:file:bg-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-20']} */ ;
/** @type {__VLS_StyleScopedClasses['w-20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-16']} */ ;
/** @type {__VLS_StyleScopedClasses['w-16']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['ring-1']} */ ;
/** @type {__VLS_StyleScopedClasses['ring-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:ring-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-16']} */ ;
/** @type {__VLS_StyleScopedClasses['w-16']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['underline']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['pr-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-[65]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['file:mr-4']} */ ;
/** @type {__VLS_StyleScopedClasses['file:rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['file:border-0']} */ ;
/** @type {__VLS_StyleScopedClasses['file:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['file:px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['file:py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['file:text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:file:bg-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-52']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['object-contain']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-[60]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-25']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-75']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            DateField: DateField,
            BaseCard: BaseCard,
            ErrorDialog: ErrorDialog,
            AccessDeniedNotice: AccessDeniedNotice,
            TableSkeleton: TableSkeleton,
            formatCurrency: formatCurrency,
            ConfirmDialog: ConfirmDialog,
            formatCPF: formatCPF,
            paymentMethodLabel: paymentMethodLabel,
            DEFAULT_PHOTO_DATA_URL: DEFAULT_PHOTO_DATA_URL,
            admin: admin,
            catalog: catalog,
            registrationPermissions: registrationPermissions,
            canGenerateListPdf: canGenerateListPdf,
            filters: filters,
            hideFilters: hideFilters,
            isDistrictFilterLocked: isDistrictFilterLocked,
            isChurchFilterLocked: isChurchFilterLocked,
            isEventFilterLocked: isEventFilterLocked,
            registrationStatusOptions: registrationStatusOptions,
            lotsForSelectedEvent: lotsForSelectedEvent,
            paymentDialog: paymentDialog,
            manualConfirmDialog: manualConfirmDialog,
            manualConfirmPaymentOptions: manualConfirmPaymentOptions,
            paymentDialogAllowedMethods: paymentDialogAllowedMethods,
            genderOptions: genderOptions,
            isApplying: isApplying,
            listPdfState: listPdfState,
            errorDialog: errorDialog,
            applyFilters: applyFilters,
            resetFilters: resetFilters,
            churchesByDistrict: churchesByDistrict,
            findEventTitle: findEventTitle,
            findEventPriceCents: findEventPriceCents,
            findRegistrationLotLabel: findRegistrationLotLabel,
            findDistrictName: findDistrictName,
            findChurchName: findChurchName,
            formatBirthDate: formatBirthDate,
            calculateAge: calculateAge,
            formatDateTime: formatDateTime,
            translateStatus: translateStatus,
            statusBadgeClass: statusBadgeClass,
            statusAccentClass: statusAccentClass,
            displayedRegistrations: displayedRegistrations,
            registrationCount: registrationCount,
            isRegistrationSelectable: isRegistrationSelectable,
            openedActions: openedActions,
            toggleActions: toggleActions,
            selectionDisabledReason: selectionDisabledReason,
            isRegistrationSelected: isRegistrationSelected,
            selectedRegistrations: selectedRegistrations,
            selectionTotalCents: selectionTotalCents,
            allDisplayedSelected: allDisplayedSelected,
            someDisplayedSelected: someDisplayedSelected,
            toggleRegistrationSelection: toggleRegistrationSelection,
            toggleSelectAllDisplayed: toggleSelectAllDisplayed,
            closePaymentDialog: closePaymentDialog,
            openPaymentDialog: openPaymentDialog,
            removeFromPaymentDialog: removeFromPaymentDialog,
            confirmPaymentGeneration: confirmPaymentGeneration,
            copyPaymentUrl: copyPaymentUrl,
            openManualConfirmDialog: openManualConfirmDialog,
            closeManualConfirmDialog: closeManualConfirmDialog,
            confirmManualPayment: confirmManualPayment,
            registrationCode: registrationCode,
            addDialog: addDialog,
            addForm: addForm,
            addPhotoPreview: addPhotoPreview,
            responsibleLookup: responsibleLookup,
            openAddDialog: openAddDialog,
            closeAdd: closeAdd,
            onAddCpfInput: onAddCpfInput,
            onResponsibleCpfInput: onResponsibleCpfInput,
            onResponsiblePhoneInput: onResponsiblePhoneInput,
            handleResponsibleCpfLookup: handleResponsibleCpfLookup,
            handleAddPhotoChange: handleAddPhotoChange,
            clearAddPhoto: clearAddPhoto,
            saveNewRegistration: saveNewRegistration,
            resolvePhotoUrl: resolvePhotoUrl,
            paymentMethodShort: paymentMethodShort,
            editDialog: editDialog,
            editForm: editForm,
            historyLoading: historyLoading,
            registrationHistory: registrationHistory,
            refundedAt: refundedAt,
            humanEvent: humanEvent,
            formatDetails: formatDetails,
            showDetails: showDetails,
            onCpfInput: onCpfInput,
            openEdit: openEdit,
            closeEdit: closeEdit,
            onEditPhotoChange: onEditPhotoChange,
            previewPhotoUrl: previewPhotoUrl,
            clearEditPhoto: clearEditPhoto,
            saveRegistration: saveRegistration,
            isPaymentLinkVisible: isPaymentLinkVisible,
            copyPaymentLink: copyPaymentLink,
            canCancelRegistration: canCancelRegistration,
            canDeleteRegistration: canDeleteRegistration,
            confirmState: confirmState,
            resetConfirmState: resetConfirmState,
            handleDialogVisibility: handleDialogVisibility,
            openConfirm: openConfirm,
            processing: processing,
            manualPayment: manualPayment,
            executeConfirmAction: executeConfirmAction,
            openManualPaymentDialog: openManualPaymentDialog,
            closeManualPaymentDialog: closeManualPaymentDialog,
            handleManualProofChange: handleManualProofChange,
            submitManualPayment: submitManualPayment,
            canConfirmManualPix: canConfirmManualPix,
            canViewManualProof: canViewManualProof,
            viewManualProof: viewManualProof,
            openExistingManualProof: openExistingManualProof,
            canEmitReceipt: canEmitReceipt,
            downloadReceipt: downloadReceipt,
            generateRegistrationListPdf: generateRegistrationListPdf,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=AdminRegistrations.vue.js.map