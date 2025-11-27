import { defineStore } from "pinia";
import { computed, ref } from "vue";
const DEFAULT_MESSAGE = {
    text: "Processando..."
};
const REQUEST_MESSAGES = {
    get: { text: "Carregando dados..." },
    post: { text: "Salvando..." },
    put: { text: "Atualizando informacoes..." },
    patch: { text: "Atualizando informacoes..." },
    delete: { text: "Processando exclusao..." }
};
const resolveMessage = (payload) => {
    if (typeof payload === "string") {
        return { text: payload };
    }
    if (payload && typeof payload === "object") {
        return { ...DEFAULT_MESSAGE, ...payload };
    }
    return { ...DEFAULT_MESSAGE };
};
export const useLoaderStore = defineStore("loader", () => {
    const activeRequests = ref(0);
    const message = ref(resolveMessage());
    const manualLock = ref(false);
    const isVisible = computed(() => manualLock.value || activeRequests.value > 0);
    const setMessage = (payload) => {
        message.value = resolveMessage(payload);
    };
    const start = (payload) => {
        activeRequests.value += 1;
        setMessage(payload);
    };
    const stop = () => {
        activeRequests.value = Math.max(0, activeRequests.value - 1);
        if (activeRequests.value === 0 && !manualLock.value) {
            setMessage();
        }
    };
    const show = (payload) => {
        manualLock.value = true;
        setMessage(payload);
    };
    const hide = () => {
        manualLock.value = false;
        if (activeRequests.value === 0) {
            setMessage();
        }
    };
    const messageForMethod = (method) => {
        if (!method) {
            return resolveMessage();
        }
        const normalized = method.toLowerCase();
        return resolveMessage(REQUEST_MESSAGES[normalized]);
    };
    return {
        message,
        isVisible,
        start,
        stop,
        show,
        hide,
        messageForMethod
    };
});
//# sourceMappingURL=loader.js.map