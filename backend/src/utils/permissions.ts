import type { ProfilePermission, UserPermission } from "@/prisma/generated/client";

import type { PermissionAction, PermissionEntry, PermissionModule } from "../config/permissions";

export type PermissionSet = Record<PermissionAction, boolean>;
export type PermissionMap = Record<string, PermissionSet>;
type PermissionLike = Pick<
  ProfilePermission,
  | "module"
  | "canView"
  | "canCreate"
  | "canEdit"
  | "canDelete"
  | "canApprove"
  | "canDeactivate"
  | "canReport"
  | "canFinancial"
>;

const actionKeys: PermissionAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "deactivate",
  "reports",
  "financial"
];

export const toPermissionEntry = (permission: PermissionLike | UserPermission): PermissionEntry => ({
  module: permission.module,
  canView: permission.canView,
  canCreate: permission.canCreate,
  canEdit: permission.canEdit,
  canDelete: permission.canDelete,
  canApprove: permission.canApprove,
  canDeactivate: permission.canDeactivate,
  canReport: permission.canReport,
  canFinancial: permission.canFinancial
});

export const buildPermissionMap = (permissions: Array<PermissionLike | PermissionEntry>): PermissionMap => {
  const map: PermissionMap = {};
  permissions.forEach((permission) => {
    map[permission.module] = {
      view: permission.canView,
      create: permission.canCreate,
      edit: permission.canEdit,
      delete: permission.canDelete,
      approve: permission.canApprove,
      deactivate: permission.canDeactivate,
      reports: permission.canReport,
      financial: permission.canFinancial
    };
  });
  return map;
};

export const mergePermissionMap = (
  base: PermissionMap | undefined,
  overrides: Array<PermissionLike | PermissionEntry>
): PermissionMap => {
  const cloned: PermissionMap = {};
  if (base) {
    Object.entries(base).forEach(([module, actions]) => {
      cloned[module] = { ...actions };
    });
  }

  overrides.forEach((permission) => {
    const moduleKey = permission.module;
    if (!cloned[moduleKey]) {
      cloned[moduleKey] = emptyPermissionSet();
    }
    cloned[moduleKey] = {
      ...cloned[moduleKey],
      view: permission.canView,
      create: permission.canCreate,
      edit: permission.canEdit,
      delete: permission.canDelete,
      approve: permission.canApprove,
      deactivate: permission.canDeactivate,
      reports: permission.canReport,
      financial: permission.canFinancial
    };
  });

  return cloned;
};

export const hasPermission = (
  permissionMap: PermissionMap | undefined,
  module: PermissionModule | string,
  action: PermissionAction
) => {
  if (!permissionMap) return false;
  const entry = permissionMap[module];
  if (!entry) return false;
  return Boolean(entry[action]);
};

export const normalizePermissionPayload = (
  module: PermissionModule | string,
  payload: Partial<Record<PermissionAction, boolean>>
): PermissionEntry => ({
  module,
  canView: Boolean(payload.view),
  canCreate: Boolean(payload.create),
  canEdit: Boolean(payload.edit),
  canDelete: Boolean(payload.delete),
  canApprove: Boolean(payload.approve),
  canDeactivate: Boolean(payload.deactivate),
  canReport: Boolean(payload.reports),
  canFinancial: Boolean(payload.financial)
});

export const emptyPermissionSet = (): PermissionSet => {
  return actionKeys.reduce(
    (acc, key) => {
      acc[key] = false;
      return acc;
    },
    {} as PermissionSet
  );
};
