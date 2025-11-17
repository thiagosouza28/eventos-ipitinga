import type { PermissionEntry } from "./permissions";
import { PermissionModules } from "./permissions";
import type { Role } from "./roles";

const makePermission = (
  module: string,
  flags: Partial<Omit<PermissionEntry, "module">> = {}
): PermissionEntry => ({
  module,
  canView: flags.canView ?? false,
  canCreate: flags.canCreate ?? false,
  canEdit: flags.canEdit ?? false,
  canDelete: flags.canDelete ?? false,
  canApprove: flags.canApprove ?? false,
  canDeactivate: flags.canDeactivate ?? false,
  canReport: flags.canReport ?? false,
  canFinancial: flags.canFinancial ?? false
});

const fullAccess = (module: string) =>
  makePermission(module, {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canApprove: true,
    canDeactivate: true,
    canReport: true,
    canFinancial: true
  });

const viewAccess = (module: string, flags?: Partial<Omit<PermissionEntry, "module">>) =>
  makePermission(module, { canView: true, ...(flags ?? {}) });

export const RolePermissionPresets: Record<Role, PermissionEntry[]> = {
  AdminGeral: PermissionModules.map((module) => fullAccess(module)),
  AdminDistrital: [
    viewAccess("dashboard"),
    viewAccess("catalog"),
    viewAccess("districts", { canCreate: true, canEdit: true, canDelete: true }),
    viewAccess("churches", { canCreate: true, canEdit: true, canDelete: true }),
    viewAccess("ministries", { canCreate: true, canEdit: true }),
    viewAccess("events", { canCreate: true, canEdit: true }),
    viewAccess("registrations", {
      canCreate: true,
      canEdit: true,
      canApprove: true,
      canDeactivate: true,
      canReport: true
    }),
    viewAccess("orders"),
    viewAccess("financial", { canReport: true, canFinancial: true }),
    viewAccess("reports", { canReport: true }),
    viewAccess("checkin", { canApprove: true })
  ],
  DiretorLocal: [
    viewAccess("dashboard"),
    viewAccess("catalog"),
    viewAccess("registrations", { canCreate: true, canEdit: true }),
    viewAccess("orders"),
    viewAccess("reports", { canReport: true }),
    viewAccess("checkin", { canApprove: true })
  ],
  Tesoureiro: [
    viewAccess("dashboard"),
    viewAccess("financial", { canReport: true, canFinancial: true }),
    viewAccess("orders", { canFinancial: true }),
    viewAccess("registrations", { canReport: true }),
    viewAccess("reports", { canReport: true })
  ],
  CoordenadorMinisterio: [
    viewAccess("dashboard"),
    viewAccess("catalog"),
    viewAccess("registrations", { canCreate: true, canEdit: true, canApprove: true }),
    viewAccess("events"),
    viewAccess("reports", { canReport: true })
  ]
};

