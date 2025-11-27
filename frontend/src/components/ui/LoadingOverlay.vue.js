/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useLoaderStore } from "../../stores/loader";
const loader = useLoaderStore();
const { isVisible, message } = storeToRefs(loader);
const displayMessage = computed(() => {
    const text = message.value?.text?.trim();
    return text && text.length > 0 ? text : "Processando...";
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['loading-overlay__panel']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.transition, typeof __VLS_components.Transition, typeof __VLS_components.transition, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    name: "loading-overlay-fade",
}));
const __VLS_2 = __VLS_1({
    name: "loading-overlay-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
if (__VLS_ctx.isVisible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-overlay" },
        role: "status",
        'aria-live': "polite",
        'aria-busy': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-overlay__panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-spinner" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "loading-spinner__ring" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "loading-spinner__ring loading-spinner__ring--inner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "loading-message" },
    });
    (__VLS_ctx.displayMessage);
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['loading-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-overlay__panel']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-spinner__ring']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-spinner__ring']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-spinner__ring--inner']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-message']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            isVisible: isVisible,
            displayMessage: displayMessage,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=LoadingOverlay.vue.js.map