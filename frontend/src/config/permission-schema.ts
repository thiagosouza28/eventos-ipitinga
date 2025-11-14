import type { PermissionAction } from "../types/api";

export const permissionModules = [
  { key: "dashboard", label: "Dashboard" },
  { key: "users", label: "Usuários" },
  { key: "profiles", label: "Perfis" },
  { key: "registrations", label: "Inscrições" },
  { key: "events", label: "Eventos" },
  { key: "financial", label: "Financeiro" },
  { key: "reports", label: "Relatórios" },
  { key: "checkin", label: "Check-in" }
] as const;

export const permissionActions: Array<{ key: PermissionAction; label: string }> = [
  { key: "view", label: "Visualizar" },
  { key: "create", label: "Criar" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Excluir" },
  { key: "approve", label: "Aprovar" },
  { key: "deactivate", label: "Desativar" },
  { key: "reports", label: "Relatórios" },
  { key: "financial", label: "Financeiro" }
];
