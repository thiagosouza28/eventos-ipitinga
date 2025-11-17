import { permissionModules } from "../config/permission-schema";
import type { ProfilePermissionEntry, PermissionAction, PermissionState } from "../types/api";

export type PermissionFormEntry = {
  module: string;
  actions: PermissionState;
};

const emptyActions = (): PermissionState => ({
  view: false,
  create: false,
  edit: false,
  delete: false,
  approve: false,
  deactivate: false,
  reports: false,
  financial: false
});

export const createPermissionMatrix = (): PermissionFormEntry[] =>
  permissionModules.map((module) => ({
    module: module.key,
    actions: { ...emptyActions() }
  }));

export const hydrateMatrixFromEntries = (
  entries?: ProfilePermissionEntry[] | null
): PermissionFormEntry[] => {
  const matrix = createPermissionMatrix();
  if (!entries?.length) {
    return matrix;
  }
  entries.forEach((permission) => {
    const target = matrix.find((entry) => entry.module === permission.module);
    if (target) {
      target.actions = {
        view: permission.canView,
        create: permission.canCreate,
        edit: permission.canEdit,
        delete: permission.canDelete,
        approve: permission.canApprove,
        deactivate: permission.canDeactivate,
        reports: permission.canReport,
        financial: permission.canFinancial
      };
    }
  });
  return matrix;
};

const hasAnyAction = (actions: PermissionState) => Object.values(actions).some(Boolean);

export const toPermissionPayload = (
  entries: PermissionFormEntry[],
  options: { keepEmpty?: boolean } = {}
): ProfilePermissionEntry[] =>
  entries
    .filter((entry) => options.keepEmpty || hasAnyAction(entry.actions))
    .map((entry) => ({
      module: entry.module,
      canView: entry.actions.view,
      canCreate: entry.actions.create,
      canEdit: entry.actions.edit,
      canDelete: entry.actions.delete,
      canApprove: entry.actions.approve,
      canDeactivate: entry.actions.deactivate,
      canReport: entry.actions.reports,
      canFinancial: entry.actions.financial
    }));

export const toggleMatrixPermission = (
  entries: PermissionFormEntry[],
  moduleKey: string,
  action: PermissionAction,
  enabled: boolean
): PermissionFormEntry[] =>
  entries.map((entry) =>
    entry.module === moduleKey
      ? {
          module: entry.module,
          actions: { ...entry.actions, [action]: enabled }
        }
      : entry
  );
