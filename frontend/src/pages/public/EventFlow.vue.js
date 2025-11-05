/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import InscricaoForm from "../../components/forms/InscricaoForm.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import LoadingSpinner from "../../components/ui/LoadingSpinner.vue";
import StepWizard from "../../components/ui/StepWizard.vue";
import { useCatalogStore } from "../../stores/catalog";
import { useEventStore } from "../../stores/event";
import { useApi } from "../../composables/useApi";
import { formatCurrency, formatDate } from "../../utils/format";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/defaultPhoto";
import { paymentMethodLabel, PAYMENT_METHODS, MANUAL_PAYMENT_METHODS } from "../../config/paymentMethods";
import { formatCPF, normalizeCPF, validateCPF } from "../../utils/cpf";
const props = defineProps();
const router = useRouter();
const eventStore = useEventStore();
const catalog = useCatalogStore();
const { api } = useApi();
const isFreeEvent = computed(() => Boolean(eventStore.event?.isFree));
const ticketPriceCents = computed(() => (isFreeEvent.value ? 0 : eventStore.event?.currentPriceCents ?? eventStore.event?.priceCents ?? 0));
const priceLabel = computed(() => isFreeEvent.value ? "Gratuito" : formatCurrency(ticketPriceCents.value));
const currentLotName = computed(() => isFreeEvent.value ? null : eventStore.event?.currentLot?.name ?? null);
const registrationOpen = computed(() => {
    if (!eventStore.event)
        return false;
    if (isFreeEvent.value)
        return true;
    return Boolean(eventStore.event.currentLot);
});
const currentStep = ref(0);
const buyerCpf = ref("");
const quantity = ref(1);
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
        { title: "Revisao", description: "Confirme e pague" }
    ];
    if (isFreeEvent.value) {
        base[3] = { ...base[3], description: "Revise os dados e confirme" };
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
    return PAYMENT_METHODS.filter((option) => allowed.includes(option.value));
});
const isManualPaymentSelected = computed(() => MANUAL_PAYMENT_METHODS.includes(selectedPaymentMethod.value));
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
        participantCpfErrors[index] = REGISTERED_ERROR;
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
onMounted(async () => {
    await eventStore.fetchEvent(props.slug);
    await catalog.loadDistricts();
    await catalog.loadChurches();
});
watch(currentStep, (step) => {
    if (step !== 2 &&
        CPF_GLOBAL_MESSAGES.includes(errorMessage.value)) {
        errorMessage.value = "";
    }
});
watch(buyerCpf, () => {
    if (currentStep.value === 0 && errorMessage.value) {
        errorMessage.value = "";
    }
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
    try {
        const response = await eventStore.checkPendingOrder(cpfDigits);
        pendingOrders.value = response?.pendingOrders ?? [];
        currentStep.value = 1;
    }
    catch (error) {
        errorMessage.value = error.response?.data?.message ?? "Nao foi possivel verificar.";
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
        if (error?.response?.data?.message?.includes("CPF já registrado")) {
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
        router.push({
            name: "payment",
            params: { slug: props.slug, orderId: response.orderId },
            query: { fresh: "1" }
        });
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
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
        ...{ class: "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "text-2xl font-semibold text-neutral-800 dark:text-neutral-50" },
    });
    (__VLS_ctx.eventStore.event.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-neutral-500 dark:text-neutral-400" },
    });
    (__VLS_ctx.eventStore.event.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-left sm:text-right" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-neutral-500" },
    });
    (__VLS_ctx.isFreeEvent ? "Evento gratuito" : "Valor por inscricao");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xl font-semibold text-primary-600 dark:text-primary-400" },
    });
    (__VLS_ctx.priceLabel);
    if (__VLS_ctx.currentLotName) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500" },
        });
        (__VLS_ctx.currentLotName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-wrap gap-4 text-sm text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.eventStore.event.location);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
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
            /** @type {[typeof InscricaoForm, ]} */ ;
            // @ts-ignore
            const __VLS_15 = __VLS_asFunctionalComponent(InscricaoForm, new InscricaoForm({
                ...{ 'onSubmit': {} },
                ref: "inscricaoFormRef",
                modelValue: (__VLS_ctx.buyerCpf),
                submitError: (__VLS_ctx.errorMessage),
                loading: (__VLS_ctx.checkingCpf),
            }));
            const __VLS_16 = __VLS_15({
                ...{ 'onSubmit': {} },
                ref: "inscricaoFormRef",
                modelValue: (__VLS_ctx.buyerCpf),
                submitError: (__VLS_ctx.errorMessage),
                loading: (__VLS_ctx.checkingCpf),
            }, ...__VLS_functionalComponentArgsRest(__VLS_15));
            let __VLS_18;
            let __VLS_19;
            let __VLS_20;
            const __VLS_21 = {
                onSubmit: (__VLS_ctx.handleCpfSubmit)
            };
            /** @type {typeof __VLS_ctx.inscricaoFormRef} */ ;
            var __VLS_22 = {};
            var __VLS_17;
            var __VLS_14;
        }
        if (__VLS_ctx.currentStep === 1) {
            /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
            // @ts-ignore
            const __VLS_24 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
            const __VLS_25 = __VLS_24({}, ...__VLS_functionalComponentArgsRest(__VLS_24));
            __VLS_26.slots.default;
            if (__VLS_ctx.pendingOrders.length > 0) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200" },
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
                        ...{ class: "rounded-md bg-amber-100/50 p-2 dark:bg-amber-500/5" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "flex items-start justify-between gap-2" },
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
                    const __VLS_27 = {}.RouterLink;
                    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
                    // @ts-ignore
                    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
                        to: ({ name: 'payment', params: { slug: props.slug, orderId: order.orderId } }),
                        ...{ class: "shrink-0 rounded-md border border-amber-500 px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-500/10 dark:text-amber-200" },
                    }));
                    const __VLS_29 = __VLS_28({
                        to: ({ name: 'payment', params: { slug: props.slug, orderId: order.orderId } }),
                        ...{ class: "shrink-0 rounded-md border border-amber-500 px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-500/10 dark:text-amber-200" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
                    __VLS_30.slots.default;
                    var __VLS_30;
                }
                const __VLS_31 = {}.RouterLink;
                /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
                // @ts-ignore
                const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
                    to: "/pendencias",
                    ...{ class: "inline-flex items-center text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200" },
                }));
                const __VLS_33 = __VLS_32({
                    to: "/pendencias",
                    ...{ class: "inline-flex items-center text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_32));
                __VLS_34.slots.default;
                const __VLS_35 = {}.IconArrowRight;
                /** @type {[typeof __VLS_components.IconArrowRight, ]} */ ;
                // @ts-ignore
                const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
                    ...{ class: "ml-1 h-3 w-3" },
                }));
                const __VLS_37 = __VLS_36({
                    ...{ class: "ml-1 h-3 w-3" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_36));
                var __VLS_34;
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
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "number",
                min: "1",
                max: "10",
                ...{ class: "mt-1 w-32 rounded-lg border border-neutral-300 px-3 py-2 text-center text-lg font-semibold dark:border-neutral-700 dark:bg-neutral-800" },
                'aria-invalid': (__VLS_ctx.generalErrors.quantity ? 'true' : 'false'),
                'aria-describedby': "quantity-error",
                required: true,
            });
            (__VLS_ctx.quantity);
            if (__VLS_ctx.generalErrors.quantity) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    id: "quantity-error",
                    role: "alert",
                    ...{ class: "mt-2 text-sm text-red-600 dark:text-red-400" },
                });
                (__VLS_ctx.generalErrors.quantity);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex justify-between" },
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
                ...{ class: "rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                type: "submit",
                ...{ class: "rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500" },
            });
            var __VLS_26;
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
                    ...{ class: "flex items-center justify-between" },
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
                    value: (person.fullName),
                    type: "text",
                    required: true,
                    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
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
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-1 flex items-center gap-3" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    type: "date",
                    required: true,
                    ...{ class: "w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
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
                    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
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
                    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
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
                    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
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
                    ...{ class: "block w-full max-w-xs text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 hover:file:bg-primary-100" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (person.photoUrl || __VLS_ctx.DEFAULT_PHOTO_DATA_URL),
                    alt: "Pre-visualizacao",
                    ...{ class: "h-24 w-24 rounded-lg object-cover" },
                });
                var __VLS_44;
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex justify-between" },
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
                ...{ class: "rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.goToReview) },
                type: "button",
                ...{ class: "rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500" },
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
                        ...{ class: "text-xs text-amber-600 dark:text-amber-300" },
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
                    ...{ class: "flex items-start justify-between gap-3" },
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
                ...{ class: "flex flex-col gap-2 text-right" },
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
                ...{ class: "flex justify-between" },
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
                ...{ class: "rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.submitBatch) },
                type: "button",
                ...{ class: "rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500" },
                disabled: (__VLS_ctx.submitting),
            });
            if (__VLS_ctx.submitting) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "flex items-center gap-2" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.isFreeEvent ? "Confirmar inscricoes" : "Ir para pagamento");
            }
            if (__VLS_ctx.errorMessage) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-sm text-red-500" },
                });
                (__VLS_ctx.errorMessage);
            }
            var __VLS_47;
        }
    }
    else {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
        const __VLS_49 = __VLS_48({}, ...__VLS_functionalComponentArgsRest(__VLS_48));
        __VLS_50.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-neutral-500" },
        });
        var __VLS_50;
    }
}
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
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
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-amber-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-amber-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-amber-500/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-amber-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-amber-100/50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-amber-500/5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-amber-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-amber-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-amber-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-amber-200']} */ ;
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
/** @type {__VLS_StyleScopedClasses['w-32']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
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
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
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
/** @type {__VLS_StyleScopedClasses['h-24']} */ ;
/** @type {__VLS_StyleScopedClasses['w-24']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
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
/** @type {__VLS_StyleScopedClasses['text-amber-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-300']} */ ;
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
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
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
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
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
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
// @ts-ignore
var __VLS_23 = __VLS_22;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            InscricaoForm: InscricaoForm,
            BaseCard: BaseCard,
            LoadingSpinner: LoadingSpinner,
            StepWizard: StepWizard,
            formatCurrency: formatCurrency,
            formatDate: formatDate,
            DEFAULT_PHOTO_DATA_URL: DEFAULT_PHOTO_DATA_URL,
            eventStore: eventStore,
            catalog: catalog,
            isFreeEvent: isFreeEvent,
            ticketPriceCents: ticketPriceCents,
            priceLabel: priceLabel,
            currentLotName: currentLotName,
            registrationOpen: registrationOpen,
            currentStep: currentStep,
            buyerCpf: buyerCpf,
            quantity: quantity,
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
            handleCpfSubmit: handleCpfSubmit,
            handleGeneralStep: handleGeneralStep,
            handlePhotoUpload: handlePhotoUpload,
            goToReview: goToReview,
            submitBatch: submitBatch,
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