import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
export const useModulePermissions = (moduleKey) => {
    const auth = useAuthStore();
    const canView = computed(() => auth.hasPermission(moduleKey, "view"));
    const canCreate = computed(() => auth.hasPermission(moduleKey, "create"));
    const canEdit = computed(() => auth.hasPermission(moduleKey, "edit"));
    const canDelete = computed(() => auth.hasPermission(moduleKey, "delete"));
    const canApprove = computed(() => auth.hasPermission(moduleKey, "approve"));
    const canDeactivate = computed(() => auth.hasPermission(moduleKey, "deactivate"));
    const canReports = computed(() => auth.hasPermission(moduleKey, "reports"));
    const canFinancial = computed(() => auth.hasPermission(moduleKey, "financial"));
    return {
        module: moduleKey,
        canList: canView,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canApprove,
        canDeactivate,
        canReports,
        canFinancial
    };
};
//# sourceMappingURL=usePermissions.js.map