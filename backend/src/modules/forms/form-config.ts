import { z } from "zod";

import { AppError } from "../../utils/errors";

export const FORM_FIELD_TYPES = [
  "text",
  "email",
  "number",
  "textarea",
  "select",
  "checkbox"
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export type FormFieldConfig = {
  id: string;
  label: string;
  tipo: FormFieldType;
  obrigatorio?: boolean;
  placeholder?: string;
  opcoes?: string[];
  min?: number;
  max?: number;
};

export type FormConfig = {
  campos: FormFieldConfig[];
};

export const SYSTEM_FIELD_IDS = new Set([
  "fullName",
  "cpf",
  "birthDate",
  "gender",
  "districtId",
  "churchId"
]);

export const DEFAULT_FORM_CONFIG: FormConfig = {
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

const fieldIdRegex = /^[a-zA-Z0-9_-]+$/;

const fieldSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  tipo: z.enum(FORM_FIELD_TYPES),
  obrigatorio: z.boolean().optional(),
  placeholder: z.string().optional(),
  opcoes: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional()
});

const formConfigSchema = z.object({
  campos: z.array(fieldSchema).min(1)
});

type ConfigIssue = {
  path: string;
  message: string;
};

const sanitizeField = (field: FormFieldConfig): FormFieldConfig => {
  const trimmedOptions =
    field.opcoes
      ?.map((option) => option.trim())
      .filter(Boolean) ?? undefined;
  return {
    ...field,
    id: field.id.trim(),
    label: field.label.trim(),
    placeholder: field.placeholder?.trim() ?? undefined,
    opcoes: trimmedOptions && trimmedOptions.length ? Array.from(new Set(trimmedOptions)) : undefined
  };
};

const collectConfigIssues = (config: FormConfig): ConfigIssue[] => {
  const issues: ConfigIssue[] = [];
  const ids = new Set<string>();

  config.campos.forEach((field, index) => {
    if (!fieldIdRegex.test(field.id)) {
      issues.push({
        path: `campos.${index}.id`,
        message: "Id deve conter apenas letras, números, hífen ou underline."
      });
    }
    if (ids.has(field.id)) {
      issues.push({
        path: `campos.${index}.id`,
        message: "Id duplicado."
      });
    }
    ids.add(field.id);

    if (field.tipo === "select" && !SYSTEM_FIELD_IDS.has(field.id)) {
      if (!field.opcoes || field.opcoes.length === 0) {
        issues.push({
          path: `campos.${index}.opcoes`,
          message: "Campos do tipo select precisam de opções."
        });
      }
    }

    if (field.tipo === "number") {
      if (typeof field.min === "number" && typeof field.max === "number" && field.min > field.max) {
        issues.push({
          path: `campos.${index}.min`,
          message: "Valor mínimo não pode ser maior que o máximo."
        });
      }
    }
  });

  const missingSystemFields = Array.from(SYSTEM_FIELD_IDS).filter((id) => !ids.has(id));
  if (missingSystemFields.length) {
    issues.push({
      path: "campos",
      message: `Campos obrigatórios do sistema ausentes: ${missingSystemFields.join(", ")}.`
    });
  }

  return issues;
};

export const normalizeFormConfig = (input?: unknown | null): FormConfig => {
  if (!input) {
    return DEFAULT_FORM_CONFIG;
  }
  const parsed = formConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("Configuração de formulário inválida", 422, {
      issues: parsed.error.flatten()
    });
  }
  const sanitized: FormConfig = {
    campos: parsed.data.campos.map((field) => sanitizeField(field))
  };
  const issues = collectConfigIssues(sanitized);
  if (issues.length) {
    throw new AppError("Configuração de formulário inválida", 422, { issues });
  }
  return sanitized;
};

export const resolveEventFormConfig = (input?: unknown | null): FormConfig => {
  try {
    return normalizeFormConfig(input);
  } catch {
    return DEFAULT_FORM_CONFIG;
  }
};

type ResponseValidationOptions = {
  ignoreFields?: Set<string>;
};

export const validateFormResponses = (
  config: FormConfig,
  responses: unknown,
  options: ResponseValidationOptions = {}
) => {
  const ignoreFields = options.ignoreFields ?? new Set<string>();
  const fieldMap = new Map(config.campos.map((field) => [field.id, field]));
  const data =
    responses && typeof responses === "object" && !Array.isArray(responses)
      ? (responses as Record<string, unknown>)
      : {};
  const errors: Record<string, string> = {};
  const cleaned: Record<string, unknown> = {};

  Object.keys(data).forEach((key) => {
    if (!fieldMap.has(key)) {
      errors[key] = "Campo não permitido para este formulário.";
    }
  });

  for (const field of config.campos) {
    if (ignoreFields.has(field.id)) {
      continue;
    }
    const value = data[field.id];
    const isEmpty = value === undefined || value === null || value === "";

    if (field.obrigatorio && isEmpty) {
      errors[field.id] = "Campo obrigatório.";
      continue;
    }
    if (isEmpty) {
      continue;
    }

    switch (field.tipo) {
      case "text":
      case "textarea": {
        if (typeof value !== "string") {
          errors[field.id] = "Valor inválido.";
          continue;
        }
        cleaned[field.id] = value;
        break;
      }
      case "email": {
        if (typeof value !== "string") {
          errors[field.id] = "E-mail inválido.";
          continue;
        }
        const email = value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors[field.id] = "E-mail inválido.";
          continue;
        }
        cleaned[field.id] = email;
        break;
      }
      case "number": {
        const numeric = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(numeric)) {
          errors[field.id] = "Número inválido.";
          continue;
        }
        if (typeof field.min === "number" && numeric < field.min) {
          errors[field.id] = `Valor mínimo é ${field.min}.`;
          continue;
        }
        if (typeof field.max === "number" && numeric > field.max) {
          errors[field.id] = `Valor máximo é ${field.max}.`;
          continue;
        }
        cleaned[field.id] = numeric;
        break;
      }
      case "select": {
        if (!field.opcoes || field.opcoes.length === 0) {
          errors[field.id] = "Campo de seleção sem opções configuradas.";
          continue;
        }
        if (typeof value !== "string") {
          errors[field.id] = "Seleção inválida.";
          continue;
        }
        if (!field.opcoes.includes(value)) {
          errors[field.id] = "Opção inválida.";
          continue;
        }
        cleaned[field.id] = value;
        break;
      }
      case "checkbox": {
        let normalized = value;
        if (typeof value === "string") {
          if (value.toLowerCase() === "true") normalized = true;
          if (value.toLowerCase() === "false") normalized = false;
        }
        if (typeof normalized !== "boolean") {
          errors[field.id] = "Valor inválido.";
          continue;
        }
        cleaned[field.id] = normalized;
        break;
      }
      default:
        errors[field.id] = "Tipo de campo inválido.";
    }
  }

  return { cleaned, errors };
};

