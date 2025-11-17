/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, nextTick, onMounted, ref, useAttrs, watch } from "vue";
defineOptions({ inheritAttrs: false });
const baseInputClass = "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-primary-400 dark:focus:ring-primary-500/40";
const props = withDefaults(defineProps(), {
    placeholder: "DD/MM/AAAA",
    inputClass: baseInputClass,
    autocomplete: "bday"
});
const emit = defineEmits();
const attrs = useAttrs();
const forwardedAttrs = computed(() => {
    const { class: _class, ...rest } = attrs;
    return rest;
});
const resolveClassValue = (value) => {
    if (!value)
        return "";
    if (typeof value === "string")
        return value;
    if (Array.isArray(value)) {
        return value.map(resolveClassValue).filter(Boolean).join(" ");
    }
    if (typeof value === "object") {
        return Object.entries(value)
            .filter(([, enabled]) => Boolean(enabled))
            .map(([key]) => key)
            .join(" ");
    }
    return "";
};
const mergedInputClass = computed(() => {
    const extra = resolveClassValue(attrs.class);
    return [props.inputClass, extra].filter(Boolean).join(" ");
});
const nativeInput = ref(null);
const isCoarsePointer = ref(false);
const displayValue = ref(formatDisplayValue(props.modelValue));
let suppressWatch = false;
const isoValue = computed(() => props.modelValue ?? "");
const setDisplayValue = (value) => {
    suppressWatch = true;
    displayValue.value = value;
    void nextTick(() => {
        suppressWatch = false;
    });
};
watch(() => props.modelValue, (value) => {
    const formatted = formatDisplayValue(value);
    if (formatted !== displayValue.value) {
        setDisplayValue(formatted);
    }
    updateNativeValue(value ?? "");
});
watch(displayValue, (value) => {
    if (suppressWatch)
        return;
    const digits = value.replace(/\D/g, "");
    if (!digits.length) {
        emit("update:modelValue", "");
        updateNativeValue("");
        return;
    }
    if (digits.length === 8) {
        const iso = parseDigitsToIso(digits);
        if (iso) {
            emit("update:modelValue", iso);
            updateNativeValue(iso);
        }
    }
});
const updateNativeValue = (value) => {
    if (nativeInput.value && nativeInput.value.value !== value) {
        nativeInput.value.value = value;
    }
};
const handleNativeInput = (event) => {
    const input = event.target;
    if (!input)
        return;
    const selected = input.value;
    emit("update:modelValue", selected);
    setDisplayValue(formatDisplayValue(selected));
};
const openPicker = () => {
    if (!nativeInput.value || props.disabled)
        return;
    if (typeof nativeInput.value.showPicker === "function") {
        try {
            nativeInput.value.showPicker();
            return;
        }
        catch {
            // ignore, fallback below
        }
    }
    nativeInput.value.click();
};
const handleFocus = (event) => {
    emit("focus", event);
    if (isCoarsePointer.value) {
        openPicker();
    }
};
onMounted(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        const media = window.matchMedia("(pointer: coarse)");
        isCoarsePointer.value = media.matches;
        if (typeof media.addEventListener === "function") {
            media.addEventListener("change", (evt) => {
                isCoarsePointer.value = evt.matches;
            });
        }
    }
});
function formatDisplayValue(value) {
    if (!value)
        return "";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day)
        return "";
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}
function parseDigitsToIso(digits) {
    if (digits.length !== 8)
        return null;
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4);
    const dayNum = Number(day);
    const monthNum = Number(month);
    const yearNum = Number(year);
    if (!yearNum || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        return null;
    }
    const testDate = new Date(yearNum, monthNum - 1, dayNum);
    if (testDate.getFullYear() !== yearNum ||
        testDate.getMonth() !== monthNum - 1 ||
        testDate.getDate() !== dayNum) {
        return null;
    }
    return `${year}-${month}-${day}`;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    placeholder: "DD/MM/AAAA",
    inputClass: baseInputClass,
    autocomplete: "bday"
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "relative w-full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onFocus: (__VLS_ctx.handleFocus) },
    ...{ onBlur: ((event) => __VLS_ctx.emit('blur', event)) },
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.emit('enter');
        } },
    ref: "textInput",
    ...(__VLS_ctx.forwardedAttrs),
    ...{ class: (__VLS_ctx.mergedInputClass) },
    value: (__VLS_ctx.displayValue),
    type: "text",
    inputmode: "numeric",
    placeholder: (__VLS_ctx.placeholder),
    name: (__VLS_ctx.name),
    id: (__VLS_ctx.id),
    disabled: (__VLS_ctx.disabled),
    required: (__VLS_ctx.required),
    autocomplete: (__VLS_ctx.autocomplete),
});
__VLS_asFunctionalDirective(__VLS_directives.vMaska)(null, { ...__VLS_directiveBindingRestFields, value: ({ mask: '##/##/####' }) }, null, null);
/** @type {typeof __VLS_ctx.textInput} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openPicker) },
    type: "button",
    ...{ class: "absolute inset-y-0 right-2 flex items-center rounded-full p-1 text-neutral-400 transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:opacity-40" },
    disabled: (__VLS_ctx.disabled),
    'aria-label': "Abrir calendário",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 24 24",
    'aria-hidden': "true",
    ...{ class: "h-5 w-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    fill: "currentColor",
    d: "M7 2a1 1 0 0 0-1 1v1H5a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-1V3a1 1 0 1 0-2 0v1H9V3a1 1 0 0 0-1-1ZM5 9h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onInput: (__VLS_ctx.handleNativeInput) },
    ref: "nativeInput",
    type: "date",
    ...{ class: "pointer-events-none absolute inset-0 h-full w-full opacity-0" },
    tabindex: "-1",
    'aria-hidden': "true",
    min: (__VLS_ctx.min),
    max: (__VLS_ctx.max),
    value: (__VLS_ctx.isoValue),
});
/** @type {typeof __VLS_ctx.nativeInput} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-y-0']} */ ;
/** @type {__VLS_StyleScopedClasses['right-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus-visible:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus-visible:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus-visible:ring-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-0']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            emit: emit,
            forwardedAttrs: forwardedAttrs,
            mergedInputClass: mergedInputClass,
            nativeInput: nativeInput,
            displayValue: displayValue,
            isoValue: isoValue,
            handleNativeInput: handleNativeInput,
            openPicker: openPicker,
            handleFocus: handleFocus,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=DateField.vue.js.map