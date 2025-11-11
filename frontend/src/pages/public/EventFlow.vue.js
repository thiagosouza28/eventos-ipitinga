/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import ResponsibleCpfForm from "../../components/forms/ResponsibleCpfForm.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import LoadingSpinner from "../../components/ui/LoadingSpinner.vue";
import StepWizard from "../../components/ui/StepWizard.vue";
import IconArrowRight from "../../components/ui/IconArrowRight.vue";
import { useCatalogStore } from "../../stores/catalog";
import { useEventStore } from "../../stores/event";
import { useApi } from "../../composables/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatCurrency, formatDate } from "../../utils/format";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/defaultPhoto";
import { REGISTRATION_STORAGE_KEY } from "../../config/storageKeys";
import { paymentMethodLabel, PAYMENT_METHODS, MANUAL_PAYMENT_METHODS, ADMIN_ONLY_PAYMENT_METHODS, FREE_PAYMENT_METHODS } from "../../config/paymentMethods";
import { useAuthStore } from "../../stores/auth";
import { formatCPF, normalizeCPF, validateCPF } from "../../utils/cpf";
const props = defineProps();
const router = useRouter();
const eventStore = useEventStore();
const catalog = useCatalogStore();
const { api } = useApi();
const auth = useAuthStore();
const isFreeEvent = computed(() => Boolean(eventStore.event?.isFree));
const ticketPriceCents = computed(() => (isFreeEvent.value ? 0 : eventStore.event?.currentPriceCents ?? eventStore.event?.priceCents ?? 0));
const formatDateTimeBr = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "--";
    }
    return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};
const nextLot = computed(() => {
    if (isFreeEvent.value)
        return null;
    const lots = eventStore.event?.lots ?? [];
    const now = Date.now();
    return (lots
        .filter((lot) => new Date(lot.startsAt).getTime() > now)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null);
});
const priceInfo = computed(() => {
    if (isFreeEvent.value) {
        return { title: "Evento gratuito", value: "Gratuito", helper: null, pending: false };
    }
    if (eventStore.event?.currentLot) {
        const lot = eventStore.event.currentLot;
        return {
            title: "Valor por inscrição",
            value: formatCurrency(lot.priceCents ?? ticketPriceCents.value),
            helper: lot.name ? `Lote vigente: ${lot.name}` : null,
            pending: false
        };
    }
    if (nextLot.value) {
        return {
            title: "Próximo lote",
            value: formatCurrency(nextLot.value.priceCents),
            helper: `Inicia em ${formatDateTimeBr(nextLot.value.startsAt)}`,
            pending: true
        };
    }
    return {
        title: "Valor por inscrição",
        value: "Aguardando liberação do lote",
        helper: null,
        pending: true
    };
});
const currentLotName = computed(() => isFreeEvent.value ? null : eventStore.event?.currentLot?.name ?? null);
const nextLotInfo = computed(() => {
    if (!nextLot.value)
        return null;
    return {
        name: nextLot.value.name,
        startsAt: formatDateTimeBr(nextLot.value.startsAt),
        price: formatCurrency(nextLot.value.priceCents)
    };
});
const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
const uploadsBaseUrl = `${apiOrigin.replace(/\/$/, "")}/uploads`;
const eventBannerError = ref(false);
const resolveBannerUrl = (value) => {
    if (!value)
        return "";
    if (/^(https?:|data:|blob:)/i.test(value)) {
        return value;
    }
    const sanitized = value.replace(/^\/+/, "");
    if (!sanitized)
        return "";
    if (sanitized.startsWith("uploads/")) {
        return `${apiOrigin.replace(/\/$/, "")}/${sanitized}`;
    }
    return `${uploadsBaseUrl}/${sanitized}`;
};
const resolvedBannerUrl = computed(() => resolveBannerUrl(eventStore.event?.bannerUrl));
const eventHasBanner = computed(() => Boolean(resolvedBannerUrl.value) && !eventBannerError.value);
const registrationOpen = computed(() => {
    if (!eventStore.event)
        return false;
    if (isFreeEvent.value)
        return true;
    return Boolean(eventStore.event.currentLot);
});
const currentStep = ref(0);
const buyerCpf = ref("");
const responsibleProfile = ref(null);
const quantity = ref(1);
const shouldPersistState = ref(true);
const STORAGE_KEY = REGISTRATION_STORAGE_KEY;
const canUseStorage = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const loadPersistedState = () => {
    if (!canUseStorage)
        return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return;
        const saved = JSON.parse(raw);
        if (typeof saved.buyerCpf === "string")
            buyerCpf.value = saved.buyerCpf;
        if (typeof saved.selectedDistrictId === "string")
            selectedDistrictId.value = saved.selectedDistrictId;
        if (typeof saved.selectedChurchId === "string")
            selectedChurchId.value = saved.selectedChurchId;
        if (typeof saved.quantity === "number")
            quantity.value = saved.quantity;
        if (Array.isArray(saved.people) && saved.people.length) {
            people.splice(0, people.length, ...saved.people.map((person) => ({
                fullName: person.fullName || "",
                cpf: person.cpf || "",
                birthDate: person.birthDate || "",
                gender: person.gender || "",
                districtId: person.districtId || "",
                churchId: person.churchId || "",
                photoUrl: person.photoUrl || null
            })));
            resetParticipantCpfState(people.length);
        }
        if (typeof saved.currentStep === "number")
            currentStep.value = saved.currentStep;
    }
    catch (error) {
        console.warn("Nao foi possivel carregar o estado salvo do formulario", error);
    }
};
const persistState = () => {
    if (!canUseStorage)
        return;
    if (!shouldPersistState.value) {
        clearPersistedState();
        return;
    }
    try {
        const payload = {
            buyerCpf: buyerCpf.value,
            selectedDistrictId: selectedDistrictId.value,
            selectedChurchId: selectedChurchId.value,
            quantity: quantity.value,
            people: people.map((person) => ({ ...person })),
            currentStep: currentStep.value
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
    catch (error) {
        console.warn("Nao foi possivel salvar o estado local do formulario", error);
    }
};
const clearPersistedState = () => {
    if (!canUseStorage)
        return;
    localStorage.removeItem(STORAGE_KEY);
};
const disableStatePersistence = () => {
    shouldPersistState.value = false;
    clearPersistedState();
};
const MIN_PARTICIPANTS = 1;
const MAX_PARTICIPANTS = 10;
const canDecreaseQuantity = computed(() => quantity.value > MIN_PARTICIPANTS);
const canIncreaseQuantity = computed(() => quantity.value < MAX_PARTICIPANTS);
const decreaseQuantity = () => {
    if (canDecreaseQuantity.value) {
        quantity.value -= 1;
    }
};
const increaseQuantity = () => {
    if (canIncreaseQuantity.value) {
        quantity.value += 1;
    }
};
const pendingOrders = ref([]);
const selectedDistrictId = ref("");
const selectedChurchId = ref("");
const selectedPaymentMethod = ref("PIX_MP");
const pendingOrder = ref(null);
const people = reactive([]);
const participantCpfErrors = reactive([]);
const participantCpfRefs = ref([]);
const submitting = ref(false);
const checkingCpf = ref(false);
const errorMessage = ref("");
const inscricaoFormRef = ref(null);
const cpfAvailabilityCache = new Map();
const DUPLICATE_ERROR = "CPF duplicado entre os participantes";
const REGISTERED_ERROR = "CPF ja possui inscricao confirmada para este evento";
const DUPLICATE_GLOBAL_ERROR = "Existem CPFs duplicados entre os participantes. Ajuste antes de prosseguir.";
const REGISTERED_GLOBAL_ERROR = "Um ou mais CPFs ja possuem inscricao confirmada neste evento.";
const REMOTE_ERROR_MESSAGE = "Nao foi possivel verificar CPF agora. Tente novamente.";
const CPF_GLOBAL_MESSAGES = [
    DUPLICATE_GLOBAL_ERROR,
    REGISTERED_GLOBAL_ERROR,
    REMOTE_ERROR_MESSAGE
];
const generalErrors = reactive({
    district: "",
    church: "",
    quantity: ""
});
const steps = computed(() => {
    const base = [
        { title: "CPF", description: "Verifique pedidos pendentes" },
        { title: "Unidade", description: "Escolha distrito e igreja" },
        { title: "Participantes", description: "Dados individuais" },
        { title: "Revisao", description: isFreeEvent.value ? "Revise os dados e confirme" : "Revise os dados" }
    ];
    if (!isFreeEvent.value) {
        base.push({ title: "Pagamento", description: "Pix com QR Code" });
    }
    return base;
});
const genderOptions = [
    { value: "MALE", label: "Masculino" },
    { value: "FEMALE", label: "Feminino" },
    { value: "OTHER", label: "Outro" }
];
const paymentOptions = computed(() => {
    const allowed = eventStore.event?.paymentMethods && eventStore.event.paymentMethods.length > 0
        ? eventStore.event.paymentMethods
        : PAYMENT_METHODS.map((option) => option.value);
    // Filtrar mÃ©todos exclusivos de admin se nÃ£o for admin
    const isAdmin = auth.user?.role === "AdminGeral" || auth.user?.role === "AdminDistrital";
    return PAYMENT_METHODS.filter((option) => {
        if (!allowed.includes(option.value))
            return false;
        // Se for mÃ©todo exclusivo de admin e usuÃ¡rio nÃ£o for admin, nÃ£o mostrar
        if (ADMIN_ONLY_PAYMENT_METHODS.includes(option.value) && !isAdmin) {
            return false;
        }
        return true;
    });
});
const isManualPaymentSelected = computed(() => MANUAL_PAYMENT_METHODS.includes(selectedPaymentMethod.value));
const isFreePaymentSelected = computed(() => FREE_PAYMENT_METHODS.includes(selectedPaymentMethod.value));
const selectedPaymentLabel = computed(() => paymentMethodLabel(selectedPaymentMethod.value));
const selectedDistrict = computed(() => catalog.districts.find((district) => district.id === selectedDistrictId.value));
const churchOptions = computed(() => catalog.churches.filter((church) => selectedDistrictId.value ? church.districtId === selectedDistrictId.value : true));
const selectedChurch = computed(() => churchOptions.value.find((church) => church.id === selectedChurchId.value));
const churchesByDistrict = computed(() => {
    const map = new Map();
    catalog.churches.forEach((church) => {
        const list = map.get(church.districtId) ?? [];
        list.push(church);
        map.set(church.districtId, list);
    });
    return map;
});
const getPersonChurchOptions = (districtId) => churchesByDistrict.value.get(districtId) ?? [];
const getDistrictName = (id) => catalog.districts.find((district) => district.id === id)?.name ?? "Nao informado";
const getChurchName = (id) => catalog.churches.find((church) => church.id === id)?.name ?? "Nao informado";
const getGenderLabel = (value) => genderOptions.find((option) => option.value === value)?.label ?? value;
const calculateAgeYears = (birthDate) => {
    if (!birthDate)
        return null;
    const parts = birthDate.split("-");
    if (parts.length !== 3)
        return null;
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day))
        return null;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime()))
        return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
        age -= 1;
    }
    return age >= 0 ? age : null;
};
const createEmptyPerson = () => ({
    fullName: "",
    cpf: "",
    birthDate: "",
    gender: "",
    districtId: selectedDistrictId.value || "",
    churchId: selectedChurchId.value || "",
    photoUrl: null
});
const ensurePersonChurch = (index) => {
    const person = people[index];
    if (!person)
        return;
    if (!person.districtId && selectedDistrictId.value) {
        person.districtId = selectedDistrictId.value;
    }
    if (!person.districtId) {
        person.churchId = "";
        return;
    }
    const availableChurches = getPersonChurchOptions(person.districtId);
    if (!availableChurches.length) {
        person.churchId = "";
        return;
    }
    if (person.churchId && availableChurches.some((church) => church.id === person.churchId)) {
        return;
    }
    const preferredChurch = selectedChurchId.value &&
        availableChurches.some((church) => church.id === selectedChurchId.value)
        ? selectedChurchId.value
        : availableChurches[0].id;
    person.churchId = preferredChurch;
};
const applyProfileToPerson = (index, profile) => {
    const person = people[index];
    if (!person)
        return;
    person.fullName = profile.fullName;
    person.birthDate = profile.birthDate;
    if (profile.gender && genderOptions.some((option) => option.value === profile.gender)) {
        person.gender = profile.gender;
    }
    if (profile.districtId &&
        catalog.districts.some((district) => district.id === profile.districtId)) {
        person.districtId = profile.districtId;
    }
    if (profile.churchId &&
        catalog.churches.some((church) => church.id === profile.churchId)) {
        person.churchId = profile.churchId;
    }
    if (profile.photoUrl) {
        person.photoUrl = profile.photoUrl;
    }
    ensurePersonChurch(index);
};
const applyCpfCheckResult = (index, result) => {
    if (result.existsInEvent) {
        // Se já existe inscrição, exibir o nome do cadastro quando disponível
        if (result.profile?.fullName) {
            participantCpfErrors[index] = `${REGISTERED_ERROR} (${result.profile.fullName})`;
        }
        else {
            participantCpfErrors[index] = REGISTERED_ERROR;
        }
    }
    else if (participantCpfErrors[index] === REGISTERED_ERROR ||
        participantCpfErrors[index] === REMOTE_ERROR_MESSAGE) {
        participantCpfErrors[index] = "";
    }
    if (!result.existsInEvent && result.profile) {
        applyProfileToPerson(index, result.profile);
    }
    updateParticipantGlobalError();
};
const getCpfError = (value) => {
    const digits = normalizeCPF(value);
    if (!digits.length)
        return "";
    return validateCPF(value) ? "" : "CPF invalido";
};
const updateParticipantGlobalError = () => {
    if (currentStep.value !== 2)
        return;
    let nextMessage = null;
    if (participantCpfErrors.some((error) => error === DUPLICATE_ERROR)) {
        nextMessage = DUPLICATE_GLOBAL_ERROR;
    }
    else if (participantCpfErrors.some((error) => error === REGISTERED_ERROR)) {
        nextMessage = REGISTERED_GLOBAL_ERROR;
    }
    else if (participantCpfErrors.some((error) => error === REMOTE_ERROR_MESSAGE)) {
        nextMessage = REMOTE_ERROR_MESSAGE;
    }
    if (nextMessage) {
        if (!errorMessage.value || CPF_GLOBAL_MESSAGES.includes(errorMessage.value)) {
            errorMessage.value = nextMessage;
        }
        return;
    }
    if (CPF_GLOBAL_MESSAGES.includes(errorMessage.value)) {
        errorMessage.value = "";
    }
};
const updateDuplicateErrors = () => {
    const duplicates = new Set();
    const occurrences = new Map();
    people.forEach((person, index) => {
        const digits = normalizeCPF(person.cpf);
        if (digits.length === 11) {
            const list = occurrences.get(digits) ?? [];
            list.push(index);
            occurrences.set(digits, list);
        }
    });
    occurrences.forEach((indexes) => {
        if (indexes.length > 1) {
            indexes.forEach((index) => duplicates.add(index));
        }
    });
    for (let index = 0; index < participantCpfErrors.length; index += 1) {
        if (duplicates.has(index)) {
            participantCpfErrors[index] = DUPLICATE_ERROR;
        }
        else if (participantCpfErrors[index] === DUPLICATE_ERROR) {
            participantCpfErrors[index] = "";
        }
    }
    updateParticipantGlobalError();
    return duplicates;
};
const setParticipantCpfRef = (element, index) => {
    participantCpfRefs.value[index] = element;
};
const onPersonDistrictChange = (index) => {
    ensurePersonChurch(index);
};
const checkParticipantCpfRemote = async (index) => {
    if (!eventStore.event)
        return;
    const digits = normalizeCPF(people[index].cpf);
    if (digits.length !== 11)
        return;
    const cacheKey = `${eventStore.event.id}:${digits}`;
    const cached = cpfAvailabilityCache.get(cacheKey);
    if (cached) {
        applyCpfCheckResult(index, cached);
        return;
    }
    try {
        const response = await api.post("/inscriptions/check", {
            eventId: eventStore.event.id,
            cpf: digits
        });
        const result = {
            existsInEvent: Boolean(response.data.existsInEvent ?? response.data.exists),
            profile: response.data.profile ?? null
        };
        cpfAvailabilityCache.set(cacheKey, result);
        applyCpfCheckResult(index, result);
    }
    catch (error) {
        console.error("Falha ao verificar CPF remoto", error);
        participantCpfErrors[index] = REMOTE_ERROR_MESSAGE;
        updateParticipantGlobalError();
    }
};
const handleConflictError = async (message) => {
    currentStep.value = 2;
    const digitsInMessage = message.replace(/\D/g, "");
    if (digitsInMessage.length < 11)
        return;
    const targetDigits = digitsInMessage.slice(-11);
    if (eventStore.event) {
        cpfAvailabilityCache.set(`${eventStore.event.id}:${targetDigits}`, {
            existsInEvent: true,
            profile: null
        });
    }
    const index = people.findIndex((person) => normalizeCPF(person.cpf) === targetDigits);
    if (index >= 0) {
        participantCpfErrors[index] = REGISTERED_ERROR;
        await nextTick();
        participantCpfRefs.value[index]?.focus();
    }
    updateDuplicateErrors();
};
const onParticipantCpfInput = (index, event) => {
    const input = event.target;
    if (!input)
        return;
    const previousDigits = normalizeCPF(people[index].cpf);
    const formatted = formatCPF(input.value);
    people[index].cpf = formatted;
    const digits = normalizeCPF(formatted);
    if (eventStore.event) {
        if (previousDigits.length === 11) {
            cpfAvailabilityCache.delete(`${eventStore.event.id}:${previousDigits}`);
        }
        if (digits.length === 11) {
            cpfAvailabilityCache.delete(`${eventStore.event.id}:${digits}`);
        }
    }
    participantCpfErrors[index] = getCpfError(formatted);
    updateDuplicateErrors();
};
const onParticipantCpfBlur = async (index) => {
    participantCpfErrors[index] = getCpfError(people[index].cpf);
    if (participantCpfErrors[index])
        return;
    const duplicates = updateDuplicateErrors();
    if (duplicates.has(index))
        return;
    await checkParticipantCpfRemote(index);
};
const resetParticipantCpfState = (count) => {
    participantCpfErrors.splice(0, participantCpfErrors.length);
    for (let index = 0; index < count; index += 1) {
        participantCpfErrors.push("");
    }
    participantCpfRefs.value = new Array(count).fill(null);
};
const ensureParticipantCpfsValid = async () => {
    let firstInvalidIndex = -1;
    people.forEach((person, index) => {
        const error = getCpfError(person.cpf);
        participantCpfErrors[index] = error;
        if (error && firstInvalidIndex === -1) {
            firstInvalidIndex = index;
        }
    });
    const duplicates = updateDuplicateErrors();
    if (duplicates.size > 0 && firstInvalidIndex === -1) {
        firstInvalidIndex = duplicates.values().next().value ?? -1;
    }
    if (firstInvalidIndex === -1) {
        for (let index = 0; index < people.length; index += 1) {
            if (duplicates.has(index))
                continue;
            await checkParticipantCpfRemote(index);
            if ([REGISTERED_ERROR, REMOTE_ERROR_MESSAGE].includes(participantCpfErrors[index]) &&
                firstInvalidIndex === -1) {
                firstInvalidIndex = index;
            }
        }
    }
    if (firstInvalidIndex === -1) {
        return true;
    }
    currentStep.value = 2;
    await nextTick();
    participantCpfRefs.value[firstInvalidIndex]?.focus();
    return false;
};
// Bloqueia edição dos campos até CPF estar válido e disponível
const isPersonLocked = (index) => {
    const cpf = people[index]?.cpf ?? "";
    const digits = normalizeCPF(cpf);
    if (digits.length < 11)
        return true;
    // Se houver erro (inválido/duplicado/registrado/erro remoto), mantém bloqueado
    return Boolean(participantCpfErrors[index]);
};
onMounted(async () => {
    await eventStore.fetchEvent(props.slug);
    await catalog.loadDistricts();
    await catalog.loadChurches();
    loadPersistedState();
});
watch(() => eventStore.event?.bannerUrl, () => {
    eventBannerError.value = false;
});
watch(currentStep, (step) => {
    if (step !== 2 &&
        CPF_GLOBAL_MESSAGES.includes(errorMessage.value)) {
        errorMessage.value = "";
    }
    persistState();
});
watch(buyerCpf, () => {
    if (currentStep.value === 0 && errorMessage.value) {
        errorMessage.value = "";
    }
    persistState();
});
watch(selectedDistrictId, (districtId) => {
    generalErrors.district = "";
    if (selectedChurchId.value &&
        !catalog.churches.some((church) => church.id === selectedChurchId.value && church.districtId === districtId)) {
        selectedChurchId.value = "";
    }
    if (currentStep.value >= 2) {
        people.forEach((person, index) => {
            if (!person.districtId && districtId) {
                person.districtId = districtId;
            }
            ensurePersonChurch(index);
        });
    }
    persistState();
});
watch(selectedChurchId, (churchId) => {
    generalErrors.church = "";
    if (!churchId || currentStep.value < 2)
        return;
    people.forEach((person, index) => {
        if (!person.churchId &&
            person.districtId &&
            catalog.churches.some((church) => church.id === churchId && church.districtId === person.districtId)) {
            person.churchId = churchId;
        }
        ensurePersonChurch(index);
    });
});
watch(quantity, () => {
    generalErrors.quantity = "";
});
watch(() => eventStore.event?.paymentMethods, (methods) => {
    if (methods && methods.length > 0) {
        selectedPaymentMethod.value = methods[0];
    }
    else {
        selectedPaymentMethod.value = "PIX_MP";
    }
}, { immediate: true });
watch(paymentOptions, (options) => {
    if (!options.length)
        return;
    if (!options.some((option) => option.value === selectedPaymentMethod.value)) {
        selectedPaymentMethod.value = options[0].value;
    }
}, { immediate: true });
const handleCpfSubmit = async (cpfDigits) => {
    checkingCpf.value = true;
    errorMessage.value = "";
    if (!cpfDigits || !validateCPF(cpfDigits)) {
        errorMessage.value = "CPF invÃ¡lido";
        checkingCpf.value = false;
        return;
    }
    try {
        const response = await eventStore.checkPendingOrder(cpfDigits);
        pendingOrders.value = response?.pendingOrders ?? [];
        const suggestion = response?.suggestedChurch;
        if (suggestion) {
            if (!catalog.districts.some((district) => district.id === suggestion.districtId)) {
                await catalog.loadDistricts();
            }
            if (!catalog.churches.some((church) => church.id === suggestion.churchId)) {
                await catalog.loadChurches();
            }
            selectedDistrictId.value = suggestion.districtId;
            if (catalog.churches.some((church) => church.id === suggestion.churchId)) {
                selectedChurchId.value = suggestion.churchId;
            }
        }
        currentStep.value = 1;
    }
    catch (error) {
        errorMessage.value = error.response?.data?.message ?? "NÃ£o foi possÃ­vel verificar.";
    }
    finally {
        checkingCpf.value = false;
    }
};
const handleGeneralStep = () => {
    generalErrors.district = selectedDistrictId.value ? "" : "Selecione um distrito.";
    generalErrors.church = selectedChurchId.value ? "" : "Selecione uma igreja.";
    generalErrors.quantity =
        quantity.value && quantity.value > 0 ? "" : "Informe ao menos um participante.";
    if (generalErrors.district || generalErrors.church || generalErrors.quantity) {
        return;
    }
    const size = Math.min(Math.max(Math.floor(quantity.value), 1), 10);
    quantity.value = size;
    people.splice(0, people.length);
    for (let index = 0; index < size; index += 1) {
        people.push(createEmptyPerson());
        ensurePersonChurch(index);
    }
    resetParticipantCpfState(size);
    errorMessage.value = "";
    currentStep.value = 2;
};
const handlePhotoUpload = (event, index) => {
    const input = event.target;
    if (!input?.files?.length)
        return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        people[index].photoUrl = String(loadEvent.target?.result ?? "");
    };
    reader.readAsDataURL(file);
};
const goToReview = async () => {
    errorMessage.value = "";
    const cpfsValid = await ensureParticipantCpfsValid();
    if (!cpfsValid)
        return;
    people.forEach((person, index) => {
        if (!person.districtId && selectedDistrictId.value) {
            person.districtId = selectedDistrictId.value;
        }
        if (!person.churchId && selectedChurchId.value) {
            person.churchId = selectedChurchId.value;
        }
        ensurePersonChurch(index);
    });
    const hasMissing = people.some((person) => !person.fullName.trim() ||
        !person.birthDate ||
        !person.gender ||
        !person.districtId ||
        !person.churchId);
    if (hasMissing) {
        errorMessage.value = "Preencha todos os dados obrigatorios dos participantes.";
        return;
    }
    currentStep.value = 3;
};
const submitBatch = async () => {
    errorMessage.value = "";
    if (!validateCPF(buyerCpf.value)) {
        currentStep.value = 0;
        await nextTick();
        inscricaoFormRef.value?.focusCpf();
        return;
    }
    if (!selectedDistrictId.value || !selectedChurchId.value) {
        currentStep.value = 1;
        generalErrors.district = selectedDistrictId.value ? "" : "Selecione um distrito.";
        generalErrors.church = selectedChurchId.value ? "" : "Selecione uma igreja.";
        return;
    }
    try {
        const cpfsValid = await ensureParticipantCpfsValid();
        if (!cpfsValid)
            return;
        people.forEach((person, index) => {
            if (!person.districtId && selectedDistrictId.value) {
                person.districtId = selectedDistrictId.value;
            }
            if (!person.churchId && selectedChurchId.value) {
                person.churchId = selectedChurchId.value;
            }
            ensurePersonChurch(index);
        });
        const hasMissing = people.some((person) => !person.fullName.trim() ||
            !person.birthDate ||
            !person.gender ||
            !person.districtId ||
            !person.churchId);
        if (hasMissing) {
            errorMessage.value = "Preencha todos os dados obrigatorios dos participantes.";
            currentStep.value = 2;
            return;
        }
    }
    catch (error) {
        if (error?.response?.data?.message?.includes("CPF jÃ¡ registrado")) {
            errorMessage.value = "CPF ja possui inscricao confirmada para este evento";
            currentStep.value = 2;
            return;
        }
        throw error;
    }
    try {
        submitting.value = true;
        const payload = people.map((person) => ({
            fullName: person.fullName,
            cpf: normalizeCPF(person.cpf),
            birthDate: person.birthDate,
            gender: person.gender,
            districtId: person.districtId,
            churchId: person.churchId,
            photoUrl: person.photoUrl
        }));
        const response = await eventStore.createBatchOrder(normalizeCPF(buyerCpf.value), selectedPaymentMethod.value, payload);
        disableStatePersistence();
        // Se for mÃ©todo gratuito, nÃ£o redirecionar para pÃ¡gina de pagamento
        if (isFreePaymentSelected.value && response.payment?.isFree) {
            // Redirecionar para pÃ¡gina de evento com mensagem de sucesso
            router.push({
                name: "event",
                params: { slug: props.slug },
                query: { success: "1", orderId: response.orderId }
            });
        }
        else {
            createdOrderId.value = response.orderId;
            inlinePayment.value = response.payment ?? null;
            currentStep.value = 4;
            startInlinePolling();
        }
    }
    catch (error) {
        const message = error.response?.data?.message ?? "Erro ao criar inscricoes.";
        errorMessage.value = message;
        if (error.response?.status === 409) {
            await handleConflictError(message);
        }
    }
    finally {
        submitting.value = false;
    }
};
const createdOrderId = ref("");
const inlinePayment = ref(null);
const inlinePollHandle = ref(null);
const inlineIsPixMethod = computed(() => (inlinePayment.value?.paymentMethod ?? selectedPaymentMethod.value) === "PIX_MP");
const inlineIsPaid = computed(() => inlinePayment.value?.status === "PAID");
const inlineIsManual = computed(() => Boolean(inlinePayment.value?.isManual));
const inlineStatusTitle = computed(() => {
    if (inlineIsManual.value)
        return inlinePayment.value?.status === "PAID" ? "Pagamento registrado" : "Pagamento pendente de confirmação";
    if (inlineIsPaid.value)
        return "Pagamento aprovado";
    if (inlinePayment.value?.status === "CANCELED")
        return "Pagamento cancelado";
    return "Aguardando confirmação";
});
const inlineStatusMessage = computed(() => {
    if (inlineIsManual.value) {
        return inlinePayment.value?.status === "PAID"
            ? "Pagamento registrado pela tesouraria. As inscrições estão confirmadas."
            : "Apresente este comprovante na tesouraria para concluir o pagamento.";
    }
    if (inlineIsPaid.value)
        return "Tudo certo! Vamos liberar os recibos em instantes.";
    if (inlinePayment.value?.status === "CANCELED")
        return "Pagamento cancelado. Gere um novo checkout para tentar novamente.";
    return "Estamos monitorando o Mercado Pago. Assim que o pagamento for aprovado, atualizamos automaticamente.";
});
const inlineStatusIcon = computed(() => {
    if (inlineIsPaid.value)
        return "OK";
    if (inlineIsManual.value)
        return "..";
    if (inlinePayment.value?.status === "CANCELED")
        return "X";
    return "..";
});
const inlineStatusStyles = computed(() => {
    if (inlineIsPaid.value) {
        return {
            container: "border-primary-200 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-500/10",
            badge: "bg-primary-600"
        };
    }
    if (inlineIsManual.value) {
        return {
            container: "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/60",
            badge: "bg-neutral-900"
        };
    }
    if (inlinePayment.value?.status === "CANCELED") {
        return {
            container: "border-black/60 bg-black text-white dark:border-white/20 dark:bg-black",
            badge: "bg-black"
        };
    }
    return {
        container: "border-primary-100 bg-white dark:border-primary-900/40 dark:bg-neutral-950/60",
        badge: "bg-primary-500"
    };
});
watch(quantity, (value) => {
    const normalized = Math.min(MAX_PARTICIPANTS, Math.max(MIN_PARTICIPANTS, Number.isFinite(value) ? value : MIN_PARTICIPANTS));
    if (normalized !== value) {
        quantity.value = normalized;
    }
    persistState();
});
watch(people, () => {
    persistState();
}, { deep: true });
const copyInlinePixCode = async () => {
    const code = inlinePayment.value?.pixQrData?.qr_code;
    if (!code)
        return;
    await navigator.clipboard.writeText(code);
    alert("Código Pix copiado!");
};
const handleInlineOpenCheckout = () => {
    const link = inlinePayment.value?.initPoint;
    if (!link)
        return;
    window.open(link, "_blank", "noopener,noreferrer");
};
const startInlinePolling = () => {
    if (inlinePollHandle.value) {
        clearInterval(inlinePollHandle.value);
        inlinePollHandle.value = null;
    }
    inlinePollHandle.value = window.setInterval(async () => {
        if (!createdOrderId.value)
            return;
        try {
            const data = await eventStore.getPaymentData(createdOrderId.value);
            inlinePayment.value = data;
            if (data?.status === "PAID" || data?.status === "CANCELED") {
                clearInterval(inlinePollHandle.value);
                inlinePollHandle.value = null;
            }
        }
        catch { }
    }, 5000);
};
const stopInlinePolling = () => {
    if (inlinePollHandle.value) {
        clearInterval(inlinePollHandle.value);
        inlinePollHandle.value = null;
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.eventStore.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    /** @type {[typeof LoadingSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(LoadingSpinner, new LoadingSpinner({}));
    const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
}
else if (!__VLS_ctx.eventStore.event) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_3 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
    const __VLS_4 = __VLS_3({}, ...__VLS_functionalComponentArgsRest(__VLS_3));
    __VLS_5.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-neutral-500" },
    });
    var __VLS_5;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-6" },
    });
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
    const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
    __VLS_8.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "text-2xl font-semibold text-neutral-800 dark:text-neutral-50" },
    });
    (__VLS_ctx.eventStore.event.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-neutral-500 dark:text-neutral-400" },
    });
    (__VLS_ctx.eventStore.event.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "self-start w-full lg:w-auto" },
    });
    if (__VLS_ctx.eventHasBanner) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-700" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            ...{ onError: (...[$event]) => {
                    if (!!(__VLS_ctx.eventStore.loading))
                        return;
                    if (!!(!__VLS_ctx.eventStore.event))
                        return;
                    if (!(__VLS_ctx.eventHasBanner))
                        return;
                    __VLS_ctx.eventBannerError = true;
                } },
            src: (__VLS_ctx.resolvedBannerUrl || ''),
            alt: "Banner do evento",
            ...{ class: "w-full max-h-60 object-contain" },
            loading: "lazy",
        });
    }
    else if (__VLS_ctx.eventStore.event?.bannerUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 text-xs text-neutral-400 sm:h-40 sm:w-72 dark:border-neutral-600 dark:text-neutral-500" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-left sm:text-right" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-neutral-500" },
    });
    (__VLS_ctx.priceInfo.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ([
                'text-xl font-semibold',
                __VLS_ctx.priceInfo.pending ? 'text-neutral-500 dark:text-neutral-400' : 'text-primary-600 dark:text-primary-400'
            ]) },
    });
    (__VLS_ctx.priceInfo.value);
    if (__VLS_ctx.priceInfo.helper) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500" },
        });
        (__VLS_ctx.priceInfo.helper);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-wrap gap-4 text-sm text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.eventStore.event.location);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "hidden sm:inline" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatDate(__VLS_ctx.eventStore.event.startDate));
    (__VLS_ctx.formatDate(__VLS_ctx.eventStore.event.endDate));
    if (__VLS_ctx.eventStore.event.minAgeYears) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.eventStore.event.minAgeYears);
    }
    var __VLS_8;
    if (__VLS_ctx.registrationOpen) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-6" },
        });
        /** @type {[typeof StepWizard, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(StepWizard, new StepWizard({
            steps: (__VLS_ctx.steps),
            currentStep: (__VLS_ctx.currentStep),
        }));
        const __VLS_10 = __VLS_9({
            steps: (__VLS_ctx.steps),
            currentStep: (__VLS_ctx.currentStep),
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        if (__VLS_ctx.currentStep === 0) {
            /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
            // @ts-ignore
            const __VLS_12 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
            const __VLS_13 = __VLS_12({}, ...__VLS_functionalComponentArgsRest(__VLS_12));
            __VLS_14.slots.default;
            /** @type {[typeof ResponsibleCpfForm, ]} */ ;
            // @ts-ignore
            const __VLS_15 = __VLS_asFunctionalComponent(ResponsibleCpfForm, new ResponsibleCpfForm({
                ...{ 'onUpdate:cpf': {} },
                ...{ 'onSubmit': {} },
                ref: "inscricaoFormRef",
                modelValue: (__VLS_ctx.responsibleProfile),
                loading: (__VLS_ctx.checkingCpf),
                error: (__VLS_ctx.errorMessage),
            }));
            const __VLS_16 = __VLS_15({
                ...{ 'onUpdate:cpf': {} },
                ...{ 'onSubmit': {} },
                ref: "inscricaoFormRef",
                modelValue: (__VLS_ctx.responsibleProfile),
                loading: (__VLS_ctx.checkingCpf),
                error: (__VLS_ctx.errorMessage),
            }, ...__VLS_functionalComponentArgsRest(__VLS_15));
            let __VLS_18;
            let __VLS_19;
            let __VLS_20;
            const __VLS_21 = {
                'onUpdate:cpf': (...[$event]) => {
                    if (!!(__VLS_ctx.eventStore.loading))
                        return;
                    if (!!(!__VLS_ctx.eventStore.event))
                        return;
                    if (!(__VLS_ctx.registrationOpen))
                        return;
                    if (!(__VLS_ctx.currentStep === 0))
                        return;
                    __VLS_ctx.buyerCpf = $event;
                }
            };
            const __VLS_22 = {
                onSubmit: (__VLS_ctx.handleCpfSubmit)
            };
            /** @type {typeof __VLS_ctx.inscricaoFormRef} */ ;
            var __VLS_23 = {};
            var __VLS_17;
            var __VLS_14;
        }
        if (__VLS_ctx.currentStep === 1) {
            /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
            const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
            __VLS_27.slots.default;
            if (__VLS_ctx.pendingOrders.length > 0) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "rounded-md border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "font-semibold" },
                });
                (__VLS_ctx.pendingOrders.length);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-3 space-y-2" },
                });
                for (const [order] of __VLS_getVForSourceType((__VLS_ctx.pendingOrders))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: (order.orderId),
                        ...{ class: "rounded-md border border-primary-100 bg-white/80 p-2 dark:border-primary-500/30 dark:bg-neutral-900/40" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "flex-1" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "font-medium" },
                    });
                    (__VLS_ctx.formatCurrency(order.totalCents));
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "text-xs" },
                    });
                    (order.registrations.length);
                    (order.registrations.map(r => r.fullName).join(", "));
                    const __VLS_28 = {}.RouterLink;
                    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
                    // @ts-ignore
                    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                        to: ({ name: 'payment', params: { slug: props.slug, orderId: order.orderId } }),
                        ...{ class: "inline-flex shrink-0 items-center justify-center rounded-md border border-primary-500 px-3 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-500/10 dark:border-primary-400 dark:text-primary-100" },
                    }));
                    const __VLS_30 = __VLS_29({
                        to: ({ name: 'payment', params: { slug: props.slug, orderId: order.orderId } }),
                        ...{ class: "inline-flex shrink-0 items-center justify-center rounded-md border border-primary-500 px-3 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-500/10 dark:border-primary-400 dark:text-primary-100" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
                    __VLS_31.slots.default;
                    var __VLS_31;
                }
                const __VLS_32 = {}.RouterLink;
                /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
                // @ts-ignore
                const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                    to: ({ name: 'pending-orders', params: { cpf: __VLS_ctx.buyerCpf } }),
                    ...{ class: "inline-flex items-center text-xs font-medium text-primary-700 hover:text-primary-600 dark:text-primary-100 dark:hover:text-primary-50" },
                }));
                const __VLS_34 = __VLS_33({
                    to: ({ name: 'pending-orders', params: { cpf: __VLS_ctx.buyerCpf } }),
                    ...{ class: "inline-flex items-center text-xs font-medium text-primary-700 hover:text-primary-600 dark:text-primary-100 dark:hover:text-primary-50" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_33));
                __VLS_35.slots.default;
                /** @type {[typeof IconArrowRight, ]} */ ;
                // @ts-ignore
                const __VLS_36 = __VLS_asFunctionalComponent(IconArrowRight, new IconArrowRight({
                    ...{ class: "ml-1 h-3 w-3" },
                }));
                const __VLS_37 = __VLS_36({
                    ...{ class: "ml-1 h-3 w-3" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_36));
                var __VLS_35;
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
                ...{ onSubmit: (__VLS_ctx.handleGeneralStep) },
                ...{ class: "space-y-6" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "grid gap-4 md:grid-cols-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.selectedDistrictId),
                ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
                'aria-invalid': (__VLS_ctx.generalErrors.district ? 'true' : 'false'),
                'aria-describedby': "district-error",
                required: true,
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
            if (__VLS_ctx.generalErrors.district) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    id: "district-error",
                    role: "alert",
                    ...{ class: "mt-2 text-sm text-red-600 dark:text-red-400" },
                });
                (__VLS_ctx.generalErrors.district);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.selectedChurchId),
                ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
                'aria-invalid': (__VLS_ctx.generalErrors.church ? 'true' : 'false'),
                'aria-describedby': "church-error",
                disabled: (!__VLS_ctx.selectedDistrictId),
                required: true,
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "",
                disabled: true,
            });
            for (const [church] of __VLS_getVForSourceType((__VLS_ctx.churchOptions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    key: (church.id),
                    value: (church.id),
                });
                (church.name);
            }
            if (__VLS_ctx.generalErrors.church) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    id: "church-error",
                    role: "alert",
                    ...{ class: "mt-2 text-sm text-red-600 dark:text-red-400" },
                });
                (__VLS_ctx.generalErrors.church);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-1 flex w-full items-center rounded-xl border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800 sm:w-56" },
                'aria-invalid': (__VLS_ctx.generalErrors.quantity ? 'true' : 'false'),
                'aria-describedby': "quantity-error",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.decreaseQuantity) },
                type: "button",
                ...{ class: "h-10 w-10 text-lg font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40 dark:text-neutral-100 dark:hover:bg-neutral-900" },
                disabled: (!__VLS_ctx.canDecreaseQuantity),
                'aria-label': "Diminuir quantidade",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "number",
                min: "1",
                max: "10",
                'data-quantity-input': true,
                ...{ class: "h-10 w-full border-0 bg-transparent text-center text-lg font-semibold outline-none" },
                required: true,
            });
            (__VLS_ctx.quantity);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.increaseQuantity) },
                type: "button",
                ...{ class: "h-10 w-10 text-lg font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40 dark:text-neutral-100 dark:hover:bg-neutral-900" },
                disabled: (!__VLS_ctx.canIncreaseQuantity),
                'aria-label': "Aumentar quantidade",
            });
            if (__VLS_ctx.generalErrors.quantity) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    id: "quantity-error",
                    role: "alert",
                    ...{ class: "mt-2 text-sm text-red-600 dark:text-red-400" },
                });
                (__VLS_ctx.generalErrors.quantity);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.eventStore.loading))
                            return;
                        if (!!(!__VLS_ctx.eventStore.event))
                            return;
                        if (!(__VLS_ctx.registrationOpen))
                            return;
                        if (!(__VLS_ctx.currentStep === 1))
                            return;
                        __VLS_ctx.currentStep--;
                    } },
                type: "button",
                ...{ class: "w-full rounded-xl border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:w-auto" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                type: "submit",
                ...{ class: "w-full rounded-xl bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 sm:w-auto" },
            });
            var __VLS_27;
        }
        if (__VLS_ctx.currentStep === 2) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-y-6" },
            });
            /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
            // @ts-ignore
            const __VLS_39 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
            const __VLS_40 = __VLS_39({}, ...__VLS_functionalComponentArgsRest(__VLS_39));
            __VLS_41.slots.default;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "grid gap-2 text-sm text-neutral-600 dark:text-neutral-300 md:grid-cols-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold text-neutral-700 dark:text-neutral-100" },
            });
            (__VLS_ctx.buyerCpf);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold text-neutral-700 dark:text-neutral-100" },
            });
            (__VLS_ctx.selectedDistrict?.name ?? "Nao selecionado");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold text-neutral-700 dark:text-neutral-100" },
            });
            (__VLS_ctx.selectedChurch?.name ?? "Nao selecionada");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold text-neutral-700 dark:text-neutral-100" },
            });
            (__VLS_ctx.people.length);
            var __VLS_41;
            for (const [person, index] of __VLS_getVForSourceType((__VLS_ctx.people))) {
                /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
                // @ts-ignore
                const __VLS_42 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
                    key: (index),
                }));
                const __VLS_43 = __VLS_42({
                    key: (index),
                }, ...__VLS_functionalComponentArgsRest(__VLS_42));
                __VLS_44.slots.default;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                    ...{ class: "text-lg font-semibold text-neutral-700 dark:text-neutral-100" },
                });
                (index + 1);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-sm text-neutral-400" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-4 grid gap-4 lg:grid-cols-2" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    ...{ onInput: (...[$event]) => {
                            if (!!(__VLS_ctx.eventStore.loading))
                                return;
                            if (!!(!__VLS_ctx.eventStore.event))
                                return;
                            if (!(__VLS_ctx.registrationOpen))
                                return;
                            if (!(__VLS_ctx.currentStep === 2))
                                return;
                            __VLS_ctx.onParticipantCpfInput(index, $event);
                        } },
                    ...{ onBlur: (...[$event]) => {
                            if (!!(__VLS_ctx.eventStore.loading))
                                return;
                            if (!!(!__VLS_ctx.eventStore.event))
                                return;
                            if (!(__VLS_ctx.registrationOpen))
                                return;
                            if (!(__VLS_ctx.currentStep === 2))
                                return;
                            __VLS_ctx.onParticipantCpfBlur(index);
                        } },
                    ref: ((el) => __VLS_ctx.setParticipantCpfRef(el, index)),
                    value: (person.cpf),
                    type: "text",
                    placeholder: "000.000.000-00",
                    inputmode: "numeric",
                    autocomplete: "off",
                    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
                    'aria-invalid': (__VLS_ctx.participantCpfErrors[index] ? 'true' : 'false'),
                    'aria-describedby': (`participant-cpf-error-${index}`),
                    required: true,
                });
                if (__VLS_ctx.participantCpfErrors[index]) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        id: (`participant-cpf-error-${index}`),
                        role: "alert",
                        ...{ class: "mt-1 text-sm text-red-600 dark:text-red-400" },
                    });
                    (__VLS_ctx.participantCpfErrors[index]);
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    value: (person.fullName),
                    type: "text",
                    required: true,
                    disabled: (__VLS_ctx.isPersonLocked(index)),
                    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    type: "date",
                    required: true,
                    disabled: (__VLS_ctx.isPersonLocked(index)),
                    ...{ class: "w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60" },
                });
                (person.birthDate);
                if (__VLS_ctx.calculateAgeYears(person.birthDate) !== null) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                    });
                    (__VLS_ctx.calculateAgeYears(person.birthDate));
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                    value: (person.gender),
                    disabled: (__VLS_ctx.isPersonLocked(index)),
                    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60" },
                    required: true,
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
                    ...{ onChange: (...[$event]) => {
                            if (!!(__VLS_ctx.eventStore.loading))
                                return;
                            if (!!(!__VLS_ctx.eventStore.event))
                                return;
                            if (!(__VLS_ctx.registrationOpen))
                                return;
                            if (!(__VLS_ctx.currentStep === 2))
                                return;
                            __VLS_ctx.onPersonDistrictChange(index);
                        } },
                    value: (person.districtId),
                    disabled: (__VLS_ctx.isPersonLocked(index)),
                    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60" },
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
                    value: (person.churchId),
                    disabled: (__VLS_ctx.isPersonLocked(index)),
                    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: "",
                    disabled: true,
                });
                for (const [church] of __VLS_getVForSourceType((__VLS_ctx.getPersonChurchOptions(person.districtId)))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                        key: (church.id),
                        value: (church.id),
                    });
                    (church.name);
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "lg:col-span-2" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-1 flex flex-wrap items-center gap-4" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    ...{ onChange: (...[$event]) => {
                            if (!!(__VLS_ctx.eventStore.loading))
                                return;
                            if (!!(!__VLS_ctx.eventStore.event))
                                return;
                            if (!(__VLS_ctx.registrationOpen))
                                return;
                            if (!(__VLS_ctx.currentStep === 2))
                                return;
                            __VLS_ctx.handlePhotoUpload($event, index);
                        } },
                    type: "file",
                    accept: "image/*",
                    disabled: (__VLS_ctx.isPersonLocked(index)),
                    ...{ class: "block w-full max-w-xs text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-60" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (person.photoUrl || __VLS_ctx.DEFAULT_PHOTO_DATA_URL),
                    alt: "Pre-visualizacao",
                    ...{ class: "h-24 w-24 rounded-lg object-cover" },
                });
                var __VLS_44;
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.eventStore.loading))
                            return;
                        if (!!(!__VLS_ctx.eventStore.event))
                            return;
                        if (!(__VLS_ctx.registrationOpen))
                            return;
                        if (!(__VLS_ctx.currentStep === 2))
                            return;
                        __VLS_ctx.currentStep--;
                    } },
                type: "button",
                ...{ class: "w-full rounded-xl border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:w-auto" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.goToReview) },
                type: "button",
                ...{ class: "w-full rounded-xl bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 sm:w-auto" },
            });
            if (__VLS_ctx.errorMessage) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-sm text-red-500" },
                });
                (__VLS_ctx.errorMessage);
            }
        }
        if (__VLS_ctx.currentStep === 3) {
            /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
            const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
            __VLS_47.slots.default;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-y-6" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                ...{ class: "text-xl font-semibold text-neutral-800 dark:text-neutral-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-sm text-neutral-500" },
            });
            (__VLS_ctx.isFreeEvent
                ? "Confira as informacoes antes de confirmar as inscricoes."
                : "Confira as informacoes antes de prosseguir com o pagamento.");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/60" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.buyerCpf);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.selectedDistrict?.name ?? "Nao selecionado");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.selectedChurch?.name ?? "Nao selecionada");
            if (!__VLS_ctx.isFreeEvent) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/60" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "block text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "grid gap-2 sm:grid-cols-2" },
                });
                for (const [option] of __VLS_getVForSourceType((__VLS_ctx.paymentOptions))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                        key: (option.value),
                        ...{ class: "flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-primary-400 dark:border-neutral-700 dark:bg-neutral-900" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                        type: "radio",
                        value: (option.value),
                        ...{ class: "h-4 w-4 text-primary-600 focus:ring-primary-500" },
                    });
                    (__VLS_ctx.selectedPaymentMethod);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "flex flex-col" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "font-medium text-neutral-700 dark:text-neutral-100" },
                    });
                    (option.label);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                    });
                    (option.description);
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-400 dark:text-neutral-500" },
                });
                (__VLS_ctx.selectedPaymentLabel);
                if (__VLS_ctx.isManualPaymentSelected) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "text-xs text-primary-600 dark:text-primary-200" },
                    });
                }
                if (__VLS_ctx.isFreePaymentSelected) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "text-xs text-primary-500 dark:text-primary-200" },
                    });
                }
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "grid gap-4" },
            });
            for (const [person, index] of __VLS_getVForSourceType((__VLS_ctx.people))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (index),
                    ...{ class: "rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center gap-3" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (person.photoUrl || __VLS_ctx.DEFAULT_PHOTO_DATA_URL),
                    alt: "Foto do participante",
                    ...{ class: "h-12 w-12 rounded-lg object-cover" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
                });
                (person.fullName);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-500" },
                });
                (person.cpf);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.eventStore.loading))
                                return;
                            if (!!(!__VLS_ctx.eventStore.event))
                                return;
                            if (!(__VLS_ctx.registrationOpen))
                                return;
                            if (!(__VLS_ctx.currentStep === 3))
                                return;
                            __VLS_ctx.currentStep = 2;
                        } },
                    ...{ class: "text-sm text-primary-600 hover:underline" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-3 grid gap-1 text-sm text-neutral-500 sm:grid-cols-2" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (__VLS_ctx.formatDate(person.birthDate));
                if (__VLS_ctx.calculateAgeYears(person.birthDate) !== null) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (__VLS_ctx.calculateAgeYears(person.birthDate));
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (__VLS_ctx.getGenderLabel(person.gender));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (__VLS_ctx.getDistrictName(person.districtId));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (__VLS_ctx.getChurchName(person.churchId));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex flex-col gap-2 text-left sm:text-right" },
            });
            if (!__VLS_ctx.isFreeEvent) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-sm text-neutral-500" },
                });
                (__VLS_ctx.selectedPaymentLabel);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-sm text-neutral-500" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-2xl font-semibold text-primary-600 dark:text-primary-400" },
            });
            (__VLS_ctx.isFreeEvent ? "Gratuito" : __VLS_ctx.formatCurrency(__VLS_ctx.ticketPriceCents * __VLS_ctx.people.length));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.eventStore.loading))
                            return;
                        if (!!(!__VLS_ctx.eventStore.event))
                            return;
                        if (!(__VLS_ctx.registrationOpen))
                            return;
                        if (!(__VLS_ctx.currentStep === 3))
                            return;
                        __VLS_ctx.currentStep--;
                    } },
                type: "button",
                ...{ class: "w-full rounded-xl border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:w-auto" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.submitBatch) },
                type: "button",
                ...{ class: "w-full rounded-xl bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 disabled:opacity-70 sm:w-auto" },
                disabled: (__VLS_ctx.submitting),
            });
            if (__VLS_ctx.submitting) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "flex items-center justify-center gap-2" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.isFreeEvent ? "Confirmar inscrições" : "Gerar pagamento");
            }
            if (__VLS_ctx.errorMessage) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-sm text-red-500" },
                });
                (__VLS_ctx.errorMessage);
            }
            var __VLS_47;
        }
        if (__VLS_ctx.currentStep === 4 && __VLS_ctx.inlinePayment) {
            /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
            // @ts-ignore
            const __VLS_48 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
            const __VLS_49 = __VLS_48({}, ...__VLS_functionalComponentArgsRest(__VLS_48));
            __VLS_50.slots.default;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex flex-col gap-6 md:flex-row md:items-start" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex-1 space-y-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex items-start gap-3 rounded-xl border px-4 py-3" },
                ...{ class: (__VLS_ctx.inlineStatusStyles.container) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-white" },
                ...{ class: (__VLS_ctx.inlineStatusStyles.badge) },
            });
            (__VLS_ctx.inlineStatusIcon);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
            });
            (__VLS_ctx.inlineStatusTitle);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
            });
            (__VLS_ctx.inlineStatusMessage);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900/60" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-300 sm:flex-row sm:items-center sm:justify-between" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({
                ...{ class: "rounded bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800" },
            });
            (__VLS_ctx.createdOrderId);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 grid gap-3 text-sm text-neutral-600 dark:text-neutral-300 md:grid-cols-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.eventStore.event?.title ?? "Carregando...");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.isFreeEvent ? "Gratuito" : __VLS_ctx.formatCurrency(__VLS_ctx.ticketPriceCents));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatCurrency(__VLS_ctx.ticketPriceCents * (__VLS_ctx.inlinePayment?.participantCount ?? __VLS_ctx.people.length)));
            if (__VLS_ctx.currentLotName) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.currentLotName);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.paymentMethodLabel(__VLS_ctx.inlinePayment?.paymentMethod ?? __VLS_ctx.selectedPaymentMethod));
            if (__VLS_ctx.inlinePayment?.paidAt) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.formatDate(__VLS_ctx.inlinePayment?.paidAt));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex-1 space-y-6" },
            });
            if (__VLS_ctx.inlineIsPixMethod) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                    ...{ class: "space-y-3" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
                    ...{ class: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                    ...{ class: "text-lg font-semibold text-neutral-700 dark:text-neutral-100" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.copyInlinePixCode) },
                    type: "button",
                    ...{ class: "text-sm text-primary-600 hover:text-primary-500 disabled:text-neutral-400" },
                    disabled: (!__VLS_ctx.inlinePayment?.pixQrData),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900/80" },
                });
                if (__VLS_ctx.inlinePayment?.pixQrData?.qr_code_base64) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                        src: (`data:image/png;base64,${__VLS_ctx.inlinePayment.pixQrData.qr_code_base64}`),
                        alt: "QR Code Pix",
                        ...{ class: "h-48 w-48 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700" },
                    });
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "flex flex-col items-center justify-center gap-2 py-8 text-neutral-500" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                        ...{ class: "h-6 w-6 animate-spin text-primary-600" },
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
                        ...{ class: "text-sm" },
                    });
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
                });
                if (__VLS_ctx.inlinePayment?.pixQrData?.qr_code) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
                        ...{ class: "w-full rounded-lg border border-neutral-300 bg-white p-3 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" },
                        rows: "3",
                        readonly: true,
                        value: (__VLS_ctx.inlinePayment.pixQrData.qr_code),
                    });
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "text-sm text-neutral-400" },
                    });
                }
            }
            if (!__VLS_ctx.inlineIsPixMethod && !__VLS_ctx.inlineIsManual) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                    ...{ class: "space-y-3" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                    ...{ class: "text-lg font-semibold text-neutral-700 dark:text-neutral-100" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
                });
                if (__VLS_ctx.inlinePayment?.initPoint) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (__VLS_ctx.handleInlineOpenCheckout) },
                        type: "button",
                        ...{ class: "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500" },
                    });
                }
                if (__VLS_ctx.inlinePayment?.status !== 'PAID') {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "text-xs text-neutral-400" },
                    });
                }
            }
            var __VLS_50;
        }
    }
    else {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
        const __VLS_52 = __VLS_51({}, ...__VLS_functionalComponentArgsRest(__VLS_51));
        __VLS_53.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-neutral-500" },
        });
        if (__VLS_ctx.nextLotInfo) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.nextLotInfo.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.nextLotInfo.price);
            (__VLS_ctx.nextLotInfo.startsAt);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        var __VLS_53;
    }
}
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['self-start']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
/** @type {__VLS_StyleScopedClasses['object-contain']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-40']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:h-40']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-72']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-500/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
/** @type {__VLS_StyleScopedClasses['h-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
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
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-56']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col-reverse']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-600/30']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
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
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
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
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
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
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
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
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-span-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['h-24']} */ ;
/** @type {__VLS_StyleScopedClasses['w-24']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col-reverse']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-600/30']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col-reverse']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-600/30']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-70']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-8']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/80']} */ ;
/** @type {__VLS_StyleScopedClasses['h-48']} */ ;
/** @type {__VLS_StyleScopedClasses['w-48']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-8']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-25']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-75']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
// @ts-ignore
var __VLS_24 = __VLS_23;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ResponsibleCpfForm: ResponsibleCpfForm,
            BaseCard: BaseCard,
            LoadingSpinner: LoadingSpinner,
            StepWizard: StepWizard,
            IconArrowRight: IconArrowRight,
            formatCurrency: formatCurrency,
            formatDate: formatDate,
            DEFAULT_PHOTO_DATA_URL: DEFAULT_PHOTO_DATA_URL,
            paymentMethodLabel: paymentMethodLabel,
            eventStore: eventStore,
            catalog: catalog,
            isFreeEvent: isFreeEvent,
            ticketPriceCents: ticketPriceCents,
            priceInfo: priceInfo,
            currentLotName: currentLotName,
            nextLotInfo: nextLotInfo,
            eventBannerError: eventBannerError,
            resolvedBannerUrl: resolvedBannerUrl,
            eventHasBanner: eventHasBanner,
            registrationOpen: registrationOpen,
            currentStep: currentStep,
            buyerCpf: buyerCpf,
            responsibleProfile: responsibleProfile,
            quantity: quantity,
            canDecreaseQuantity: canDecreaseQuantity,
            canIncreaseQuantity: canIncreaseQuantity,
            decreaseQuantity: decreaseQuantity,
            increaseQuantity: increaseQuantity,
            pendingOrders: pendingOrders,
            selectedDistrictId: selectedDistrictId,
            selectedChurchId: selectedChurchId,
            selectedPaymentMethod: selectedPaymentMethod,
            people: people,
            participantCpfErrors: participantCpfErrors,
            submitting: submitting,
            checkingCpf: checkingCpf,
            errorMessage: errorMessage,
            inscricaoFormRef: inscricaoFormRef,
            generalErrors: generalErrors,
            steps: steps,
            genderOptions: genderOptions,
            paymentOptions: paymentOptions,
            isManualPaymentSelected: isManualPaymentSelected,
            isFreePaymentSelected: isFreePaymentSelected,
            selectedPaymentLabel: selectedPaymentLabel,
            selectedDistrict: selectedDistrict,
            churchOptions: churchOptions,
            selectedChurch: selectedChurch,
            getPersonChurchOptions: getPersonChurchOptions,
            getDistrictName: getDistrictName,
            getChurchName: getChurchName,
            getGenderLabel: getGenderLabel,
            calculateAgeYears: calculateAgeYears,
            setParticipantCpfRef: setParticipantCpfRef,
            onPersonDistrictChange: onPersonDistrictChange,
            onParticipantCpfInput: onParticipantCpfInput,
            onParticipantCpfBlur: onParticipantCpfBlur,
            isPersonLocked: isPersonLocked,
            handleCpfSubmit: handleCpfSubmit,
            handleGeneralStep: handleGeneralStep,
            handlePhotoUpload: handlePhotoUpload,
            goToReview: goToReview,
            submitBatch: submitBatch,
            createdOrderId: createdOrderId,
            inlinePayment: inlinePayment,
            inlineIsPixMethod: inlineIsPixMethod,
            inlineIsManual: inlineIsManual,
            inlineStatusTitle: inlineStatusTitle,
            inlineStatusMessage: inlineStatusMessage,
            inlineStatusIcon: inlineStatusIcon,
            inlineStatusStyles: inlineStatusStyles,
            copyInlinePixCode: copyInlinePixCode,
            handleInlineOpenCheckout: handleInlineOpenCheckout,
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
//# sourceMappingURL=EventFlow.vue.js.map