import type { EventFormConfig, EventFormField, EventFormFieldType } from "../types/api";

export const FORM_FIELD_TYPES: EventFormFieldType[] = [
  "text",
  "email",
  "number",
  "textarea",
  "select",
  "checkbox"
];

export const SYSTEM_FIELD_IDS = new Set([
  "fullName",
  "cpf",
  "birthDate",
  "gender",
  "districtId",
  "churchId"
]);

export const DEFAULT_FORM_CONFIG: EventFormConfig = {
  campos: [
    {
      id: "fullName",
      label: "Nome completo",
      tipo: "text",
      obrigatorio: true,
      placeholder: "Digite seu nome completo"
    },
    {
      id: "cpf",
      label: "CPF",
      tipo: "text",
      obrigatorio: true,
      placeholder: "000.000.000-00"
    },
    {
      id: "birthDate",
      label: "Data de nascimento",
      tipo: "text",
      obrigatorio: true,
      placeholder: "AAAA-MM-DD"
    },
    {
      id: "gender",
      label: "Gênero",
      tipo: "select",
      obrigatorio: true,
      opcoes: ["Masculino", "Feminino", "Outro"]
    },
    {
      id: "districtId",
      label: "Distrito",
      tipo: "select",
      obrigatorio: true
    },
    {
      id: "churchId",
      label: "Igreja",
      tipo: "select",
      obrigatorio: true
    }
  ]
};

export const isSystemField = (id: string) => SYSTEM_FIELD_IDS.has(id);

const sanitizeField = (field: EventFormField): EventFormField => {
  const options = field.opcoes
    ?.map((option) => option.trim())
    .filter(Boolean);
  return {
    ...field,
    id: field.id.trim(),
    label: field.label.trim(),
    placeholder: field.placeholder?.trim() ?? undefined,
    opcoes: options && options.length ? Array.from(new Set(options)) : undefined
  };
};

export const normalizeFormConfig = (input?: EventFormConfig | null): EventFormConfig => {
  if (!input || !Array.isArray(input.campos) || !input.campos.length) {
    return DEFAULT_FORM_CONFIG;
  }
  const normalized = {
    campos: input.campos.map((field) => sanitizeField(field))
  };
  const seen = new Set<string>();
  const filtered = normalized.campos.filter((field) => {
    if (!field.id || !field.label || !FORM_FIELD_TYPES.includes(field.tipo)) return false;
    if (seen.has(field.id)) return false;
    seen.add(field.id);
    return true;
  });
  const missingSystemFields = Array.from(SYSTEM_FIELD_IDS).filter((id) => !seen.has(id));
  if (missingSystemFields.length) {
    DEFAULT_FORM_CONFIG.campos.forEach((field) => {
      if (!seen.has(field.id)) {
        filtered.push(field);
        seen.add(field.id);
      }
    });
  }
  return { campos: filtered };
};

