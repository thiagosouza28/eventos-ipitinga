export const PermissionModules = [
  "dashboard",
  "users",
  "profiles",
  "registrations",
  "events",
  "financial",
  "reports",
  "checkin"
] as const;

export const PermissionActions = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "deactivate",
  "reports",
  "financial"
] as const;

export type PermissionModule = (typeof PermissionModules)[number];
export type PermissionAction = (typeof PermissionActions)[number];

export type PermissionEntry = {
  module: PermissionModule | string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canDeactivate: boolean;
  canReport: boolean;
  canFinancial: boolean;
};
