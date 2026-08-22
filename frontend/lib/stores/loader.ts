import { create } from "zustand";

type LoaderMessage = {
  text: string;
  icon?: string;
};

type LoaderMessagePayload = LoaderMessage | string | undefined;

type LoaderState = {
  activeRequests: number;
  message: LoaderMessage;
  manualLock: boolean;
  start: (payload?: LoaderMessagePayload) => void;
  stop: () => void;
  show: (payload?: LoaderMessagePayload) => void;
  hide: () => void;
  messageForMethod: (method?: string) => LoaderMessage;
};

const DEFAULT_MESSAGE: LoaderMessage = {
  text: "Processando..."
};

const REQUEST_MESSAGES: Record<string, LoaderMessage> = {
  get: { text: "Carregando dados..." },
  post: { text: "Salvando..." },
  put: { text: "Atualizando informações..." },
  patch: { text: "Atualizando informações..." },
  delete: { text: "Processando exclusão..." }
};

const resolveMessage = (payload?: LoaderMessagePayload): LoaderMessage => {
  if (typeof payload === "string") {
    return { text: payload };
  }
  if (payload && typeof payload === "object") {
    return { ...DEFAULT_MESSAGE, ...payload };
  }
  return { ...DEFAULT_MESSAGE };
};

export const useLoaderStore = create<LoaderState>((set, get) => ({
  activeRequests: 0,
  message: resolveMessage(),
  manualLock: false,
  start: (payload) =>
    set((state) => ({
      activeRequests: state.activeRequests + 1,
      message: resolveMessage(payload)
    })),
  stop: () =>
    set((state) => {
      const nextCount = Math.max(0, state.activeRequests - 1);
      return {
        activeRequests: nextCount,
        message: nextCount === 0 && !state.manualLock ? resolveMessage() : state.message
      };
    }),
  show: (payload) =>
    set(() => ({
      manualLock: true,
      message: resolveMessage(payload)
    })),
  hide: () =>
    set((state) => ({
      manualLock: false,
      message: state.activeRequests === 0 ? resolveMessage() : state.message
    })),
  messageForMethod: (method?: string) => {
    if (!method) {
      return resolveMessage();
    }
    const normalized = method.toLowerCase();
    return resolveMessage(REQUEST_MESSAGES[normalized]);
  }
}));
