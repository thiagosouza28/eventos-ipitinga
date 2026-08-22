import type { EventFormField } from "@/types/api";

export type InputMaskKind = "cpf" | "cnpj" | "phone" | "cep" | "date" | "digits" | null;

const digits = (value: string, limit: number) => value.replace(/\D/g, "").slice(0, limit);

const normalizedDescriptor = (field: Pick<EventFormField, "id" | "label" | "placeholder">) =>
  `${field.id} ${field.label} ${field.placeholder ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const resolveInputMask = (
  field: Pick<EventFormField, "id" | "label" | "placeholder" | "tipo">
): InputMaskKind => {
  if (field.tipo === "number") return "digits";
  const descriptor = normalizedDescriptor(field);
  if (/\bcnpj\b/.test(descriptor)) return "cnpj";
  if (/\bcpf\b/.test(descriptor)) return "cpf";
  if (/telefone|celular|whatsapp|\bphone\b|\bfone\b/.test(descriptor)) return "phone";
  if (/\bcep\b|codigo postal/.test(descriptor)) return "cep";
  if (/data|nascimento|aniversario|dd[/-]mm[/-]aaaa/.test(descriptor)) return "date";
  return null;
};

export const formatBrazilianPhone = (value: string) => {
  const valueDigits = digits(value, 11);
  if (!valueDigits) return "";
  if (valueDigits.length <= 2) return `(${valueDigits}`;
  const area = valueDigits.slice(0, 2);
  const local = valueDigits.slice(2);
  if (local.length <= 4) return `(${area}) ${local}`;
  const prefixLength = local.length > 8 ? 5 : 4;
  return `(${area}) ${local.slice(0, prefixLength)}-${local.slice(prefixLength)}`;
};

export const formatCnpj = (value: string) => {
  const valueDigits = digits(value, 14);
  return valueDigits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

export const formatCep = (value: string) => digits(value, 8).replace(/^(\d{5})(\d)/, "$1-$2");

export const formatBrazilianDate = (value: string) => {
  const valueDigits = digits(value, 8);
  return valueDigits.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
};

export const applyInputMask = (kind: InputMaskKind, value: string) => {
  switch (kind) {
    case "cpf": {
      const valueDigits = digits(value, 11);
      return valueDigits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }
    case "cnpj":
      return formatCnpj(value);
    case "phone":
      return formatBrazilianPhone(value);
    case "cep":
      return formatCep(value);
    case "date":
      return formatBrazilianDate(value);
    case "digits":
      return value.replace(/\D/g, "");
    default:
      return value;
  }
};

export const maskInputProps = (kind: InputMaskKind) => {
  switch (kind) {
    case "cpf":
      return { inputMode: "numeric" as const, maxLength: 14, placeholder: "000.000.000-00", autoComplete: "off" };
    case "cnpj":
      return { inputMode: "numeric" as const, maxLength: 18, placeholder: "00.000.000/0000-00", autoComplete: "off" };
    case "phone":
      return { inputMode: "tel" as const, maxLength: 15, placeholder: "(91) 99332-0376", autoComplete: "tel" };
    case "cep":
      return { inputMode: "numeric" as const, maxLength: 9, placeholder: "00000-000", autoComplete: "postal-code" };
    case "date":
      return { inputMode: "numeric" as const, maxLength: 10, placeholder: "DD/MM/AAAA", autoComplete: "off" };
    case "digits":
      return { inputMode: "numeric" as const, autoComplete: "off" };
    default:
      return {};
  }
};
