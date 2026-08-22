const SCOPE_ATTRIBUTE = "data-uppercase-scope";
const EXEMPT_ATTRIBUTE = "data-uppercase-exempt";

const isTextLikeInput = (element: HTMLInputElement | HTMLTextAreaElement) => {
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  const type = element.type?.toLowerCase() ?? "text";
  const allowed = ["text", "search", "tel", "password", "email", "number"];
  return allowed.includes(type);
};

const isWithinScope = (element: HTMLElement | null): boolean => {
  let current: HTMLElement | null = element;
  while (current) {
    if (current.hasAttribute(EXEMPT_ATTRIBUTE)) {
      return false;
    }
    if (current.hasAttribute(SCOPE_ATTRIBUTE)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};

export const setupAutoUppercase = () => {
  if (typeof document === "undefined") {
    return;
  }
  const handler = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!target || !isTextLikeInput(target)) {
      return;
    }
    if (!isWithinScope(target)) {
      return;
    }
    const upper = target.value.toUpperCase();
    if (upper === target.value) {
      return;
    }
    const selectionStart = target.selectionStart ?? upper.length;
    const selectionEnd = target.selectionEnd ?? upper.length;
    target.value = upper;
    try {
      target.setSelectionRange(selectionStart, selectionEnd);
    } catch {
      // ignore selection errors
    }
  };
  document.addEventListener("input", handler, true);
};
