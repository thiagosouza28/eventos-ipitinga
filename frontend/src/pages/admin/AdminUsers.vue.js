/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
import AccessDeniedNotice from "../../components/admin/AccessDeniedNotice.vue";
import { useAdminStore } from "../../stores/admin";
import { useCatalogStore } from "../../stores/catalog";
import { useModulePermissions } from "../../composables/usePermissions";
import { maskCpf as maskCpfUtil } from "../../utils/format";
const admin = useAdminStore();
const catalog = useCatalogStore();
const userPermissions = useModulePermissions("users");
const showCreateForm = ref(false);
const initialLoading = ref(true);
const savingUser = ref(false);
const lastTempPassword = ref(null);
const ministryError = ref("");
const editMinistryError = ref("");
const form = reactive({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    role: "CoordenadorMinisterio",
    districtScopeId: "",
    churchScopeId: "",
    ministryIds: [],
    profileId: "",
    status: "ACTIVE"
});
const editDialog = reactive({
    open: false,
    loading: false,
    userId: "",
    photoPreview: "",
    photoPayload: undefined,
    form: {
        name: "",
        email: "",
        cpf: "",
        phone: "",
        role: "AdminGeral",
        districtScopeId: "",
        churchScopeId: "",
        ministryIds: [],
        profileId: "",
        status: "ACTIVE"
    }
});
const errorDialog = reactive({
    open: false,
    title: "Erro",
    message: "",
    details: ""
});
const passwordDialog = reactive({
    open: false,
    loading: false,
    target: null
});
const statusDialog = reactive({
    open: false,
    loading: false,
    target: null,
    nextStatus: "INACTIVE"
});
const deleteDialog = reactive({
    open: false,
    loading: false,
    target: null
});
const showError = (title, message, details) => {
    errorDialog.title = title;
    errorDialog.message = message;
    errorDialog.details = details ?? "";
    errorDialog.open = true;
};
const baseRoleOptions = [
    { value: "AdminGeral", label: "Admin geral" },
    { value: "AdminDistrital", label: "Admin distrital" },
    { value: "DiretorLocal", label: "Diretor local" },
    { value: "Tesoureiro", label: "Tesoureiro" },
    { value: "CoordenadorMinisterio", label: "Coordenador de ministerio" }
];
const roleRequiresDistrict = (role) => role === "AdminDistrital";
const roleRequiresChurch = (role) => role === "DiretorLocal" || role === "Tesoureiro";
const roleRequiresMinistry = (role) => role === "CoordenadorMinisterio";
const requiresDistrict = computed(() => roleRequiresDistrict(form.role));
const requiresChurch = computed(() => roleRequiresChurch(form.role));
const requiresMinistry = computed(() => roleRequiresMinistry(form.role));
const editRequiresDistrict = computed(() => roleRequiresDistrict(editDialog.form.role));
const editRequiresChurch = computed(() => roleRequiresChurch(editDialog.form.role));
const editRequiresMinistry = computed(() => roleRequiresMinistry(editDialog.form.role));
const createRoleSelectValue = computed(() => {
    if (form.role === "CoordenadorMinisterio") {
        return form.ministryIds[0] ? `CoordenadorMinisterio:${form.ministryIds[0]}` : "CoordenadorMinisterio";
    }
    return form.role;
});
const editRoleSelectValue = computed(() => {
    if (editDialog.form.role === "CoordenadorMinisterio") {
        return editDialog.form.ministryIds[0]
            ? `CoordenadorMinisterio:${editDialog.form.ministryIds[0]}`
            : "CoordenadorMinisterio";
    }
    return editDialog.form.role;
});
const maskCpf = (value) => {
    if (!value)
        return "--";
    return maskCpfUtil(value);
};
const userInitials = (value) => {
    const name = value?.trim();
    if (!name)
        return "US";
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    const initials = `${first}${second}`.trim();
    return (initials || name.slice(0, 2)).toUpperCase();
};
const roleLabel = (role) => baseRoleOptions.find((option) => option.value === role)?.label ?? role;
const statusPillClass = (status) => status === "ACTIVE"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100"
    : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700/40 dark:text-neutral-100";
const deleteDialogDescription = computed(() => {
    if (!deleteDialog.target)
        return "Excluir usuario selecionado?";
    return `Tem certeza que deseja excluir ${deleteDialog.target.name}? Essa acao nao pode ser desfeita.`;
});
const statusDialogTitle = computed(() => statusDialog.nextStatus === "INACTIVE" ? "Desativar usuario" : "Reativar usuario");
const statusDialogDescription = computed(() => {
    if (!statusDialog.target) {
        return "";
    }
    return statusDialog.nextStatus === "INACTIVE"
        ? `Desativar o acesso de ${statusDialog.target.name}? Ele podera ser ativado novamente depois.`
        : `Reativar o acesso de ${statusDialog.target.name}?`;
});
const applyRoleSelection = (target, value) => {
    if (value.startsWith("CoordenadorMinisterio:")) {
        const [, ministryId] = value.split(":");
        target.role = "CoordenadorMinisterio";
        target.ministryIds = ministryId ? [ministryId] : [];
        return;
    }
    target.role = value || "CoordenadorMinisterio";
    if (target.role !== "CoordenadorMinisterio") {
        target.ministryIds = [];
    }
};
const onCreateRoleChange = (value) => {
    applyRoleSelection(form, value);
};
const onEditRoleChange = (value) => {
    applyRoleSelection(editDialog.form, value);
};
const resetForm = () => {
    form.name = "";
    form.email = "";
    form.cpf = "";
    form.phone = "";
    form.role = "CoordenadorMinisterio";
    form.districtScopeId = "";
    form.churchScopeId = "";
    form.ministryIds = [];
    form.profileId = "";
    form.status = "ACTIVE";
    ministryError.value = "";
};
const toggleCreateForm = () => {
    if (!userPermissions.canCreate.value) {
        showError("Acesso negado", "Voce nao possui permissao para criar usuarios.");
        return;
    }
    showCreateForm.value = !showCreateForm.value;
    if (!showCreateForm.value) {
        resetForm();
    }
};
const normalizeCpf = (value) => value.replace(/\D/g, "") || undefined;
const validateForm = () => {
    ministryError.value = "";
    if (requiresMinistry.value && !form.ministryIds.length) {
        ministryError.value = "Selecione ao menos um ministerio.";
        return false;
    }
    if (requiresDistrict.value && !form.districtScopeId) {
        showError("Campos obrigatorios", "Selecione um distrito para este perfil.");
        return false;
    }
    if (requiresChurch.value && !form.churchScopeId) {
        showError("Campos obrigatorios", "Selecione uma igreja para este perfil.");
        return false;
    }
    return true;
};
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
});
const handleCreateUser = async () => {
    if (!userPermissions.canCreate.value) {
        showError("Acesso negado", "Voce nao possui permissao para criar usuarios.");
        return;
    }
    if (!validateForm())
        return;
    savingUser.value = true;
    try {
        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            districtScopeId: form.districtScopeId || undefined,
            churchScopeId: form.churchScopeId || undefined,
            ministryIds: form.ministryIds.length ? [...form.ministryIds] : [],
            status: form.status
        };
        payload.cpf = form.cpf.trim() ? normalizeCpf(form.cpf) ?? undefined : null;
        payload.phone = form.phone.trim() || null;
        if (form.profileId) {
            payload.profileId = form.profileId;
        }
        const response = await admin.createUser(payload);
        lastTempPassword.value = {
            user: response.user.name,
            password: response.temporaryPassword
        };
        resetForm();
        showCreateForm.value = false;
    }
    catch (error) {
        const message = error.response?.data?.message ?? "Falha ao criar usuario.";
        showError("Erro ao criar usuario", message);
    }
    finally {
        savingUser.value = false;
    }
};
const openEditDialog = (user) => {
    if (!userPermissions.canEdit.value) {
        showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
        return;
    }
    editDialog.userId = user.id;
    editDialog.form.name = user.name;
    editDialog.form.email = user.email;
    editDialog.form.cpf = user.cpf ?? "";
    editDialog.form.phone = user.phone ?? "";
    editDialog.form.role = user.role;
    editDialog.form.districtScopeId = user.districtScopeId ?? "";
    editDialog.form.churchScopeId = user.churchId ?? user.churchScopeId ?? "";
    editDialog.form.ministryIds = user.ministries?.map((ministry) => ministry.id) ?? [];
    editDialog.form.profileId = user.profile?.id ?? "";
    editDialog.form.status = user.status ?? "ACTIVE";
    editDialog.photoPreview = user.photoUrl ?? "";
    editDialog.photoPayload = undefined;
    editMinistryError.value = "";
    editDialog.open = true;
};
const closeEditDialog = () => {
    editDialog.open = false;
    editDialog.loading = false;
    editDialog.userId = "";
    editDialog.photoPreview = "";
    editDialog.photoPayload = undefined;
    editMinistryError.value = "";
};
const handleEditPhotoChange = async (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file)
        return;
    if (file.size > 4 * 1024 * 1024) {
        showError("Imagem muito grande", "Selecione um arquivo de ate 4 MB.");
        if (input)
            input.value = "";
        return;
    }
    try {
        const base64 = await fileToBase64(file);
        editDialog.photoPayload = base64;
        editDialog.photoPreview = base64;
    }
    catch {
        showError("Erro ao processar imagem", "Tente novamente.");
    }
    finally {
        if (input)
            input.value = "";
    }
};
const clearEditPhoto = () => {
    editDialog.photoPayload = null;
    editDialog.photoPreview = "";
};
const handleUpdateUser = async () => {
    if (!userPermissions.canEdit.value) {
        showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
        return;
    }
    if (!editDialog.userId)
        return;
    editMinistryError.value = "";
    if (editRequiresMinistry.value && !editDialog.form.ministryIds.length) {
        editMinistryError.value = "Selecione ao menos um ministerio.";
        return;
    }
    if (editRequiresDistrict.value && !editDialog.form.districtScopeId) {
        showError("Campos obrigatorios", "Selecione um distrito para este perfil.");
        return;
    }
    if (editRequiresChurch.value && !editDialog.form.churchScopeId) {
        showError("Campos obrigatorios", "Selecione uma igreja para este perfil.");
        return;
    }
    editDialog.loading = true;
    try {
        const payload = {
            name: editDialog.form.name.trim(),
            email: editDialog.form.email.trim(),
            role: editDialog.form.role,
            districtScopeId: editDialog.form.districtScopeId || undefined,
            churchScopeId: editDialog.form.churchScopeId || undefined,
            ministryIds: editDialog.form.ministryIds.length ? [...editDialog.form.ministryIds] : [],
            status: editDialog.form.status
        };
        payload.cpf = editDialog.form.cpf.trim() ? normalizeCpf(editDialog.form.cpf) ?? undefined : null;
        payload.phone = editDialog.form.phone.trim() || null;
        payload.profileId = editDialog.form.profileId || null;
        if (editDialog.photoPayload !== undefined) {
            payload.photoUrl = editDialog.photoPayload;
        }
        await admin.updateUser(editDialog.userId, payload);
        closeEditDialog();
    }
    catch (error) {
        const message = error.response?.data?.message ?? "Nao foi possivel atualizar o usuario.";
        showError("Erro ao atualizar usuario", message);
    }
    finally {
        editDialog.loading = false;
    }
};
const openResetDialog = (user) => {
    if (!userPermissions.canEdit.value) {
        showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
        return;
    }
    passwordDialog.target = user;
    passwordDialog.open = true;
};
const handleConfirmReset = async () => {
    if (!userPermissions.canEdit.value) {
        showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
        return;
    }
    if (!passwordDialog.target)
        return;
    passwordDialog.loading = true;
    try {
        const result = await admin.resetUserPassword(passwordDialog.target.id);
        lastTempPassword.value = {
            user: passwordDialog.target.name,
            password: result.temporaryPassword
        };
    }
    catch (error) {
        const message = error.response?.data?.message ?? "Nao foi possivel resetar a senha.";
        showError("Erro ao resetar senha", message);
    }
    finally {
        passwordDialog.loading = false;
        passwordDialog.open = false;
        passwordDialog.target = null;
    }
};
const openStatusDialog = (user) => {
    if (!userPermissions.canEdit.value) {
        showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
        return;
    }
    statusDialog.target = user;
    statusDialog.nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    statusDialog.open = true;
};
const handleConfirmStatusChange = async () => {
    if (!userPermissions.canEdit.value) {
        showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
        return;
    }
    if (!statusDialog.target)
        return;
    statusDialog.loading = true;
    try {
        await admin.updateUserStatus(statusDialog.target.id, statusDialog.nextStatus);
    }
    catch (error) {
        const message = error.response?.data?.message ?? "Nao foi possivel atualizar o status.";
        showError("Erro ao atualizar status", message);
    }
    finally {
        statusDialog.loading = false;
        statusDialog.open = false;
        statusDialog.target = null;
    }
};
const openDeleteDialog = (user) => {
    if (!userPermissions.canDelete.value) {
        showError("Acesso negado", "Voce nao possui permissao para excluir usuarios.");
        return;
    }
    deleteDialog.target = user;
    deleteDialog.open = true;
};
const handleConfirmDelete = async () => {
    if (!userPermissions.canDelete.value) {
        showError("Acesso negado", "Voce nao possui permissao para excluir usuarios.");
        return;
    }
    if (!deleteDialog.target)
        return;
    deleteDialog.loading = true;
    try {
        await admin.deleteUser(deleteDialog.target.id);
    }
    catch (error) {
        const message = error.response?.data?.message ?? "Nao foi possivel excluir o usuario.";
        showError("Erro ao excluir usuario", message);
    }
    finally {
        deleteDialog.loading = false;
        deleteDialog.open = false;
        deleteDialog.target = null;
    }
};
const refreshData = async () => {
    if (!userPermissions.canList.value)
        return;
    initialLoading.value = true;
    try {
        await Promise.all([admin.loadUsers(), admin.loadProfiles()]);
    }
    catch (error) {
        showError("Falha ao carregar usuarios", error.response?.data?.message ?? "Tente novamente mais tarde.");
    }
    finally {
        initialLoading.value = false;
    }
};
onMounted(async () => {
    if (!userPermissions.canList.value) {
        initialLoading.value = false;
        return;
    }
    initialLoading.value = true;
    try {
        await Promise.all([
            admin.loadUsers(),
            admin.loadProfiles(),
            catalog.loadDistricts(),
            catalog.loadChurches(),
            catalog.loadMinistries()
        ]);
    }
    catch (error) {
        showError("Falha ao carregar dados", error.response?.data?.message ?? "Tente novamente mais tarde.");
    }
    finally {
        initialLoading.value = false;
    }
});
watch(() => form.role, () => {
    if (!requiresMinistry.value)
        form.ministryIds = [];
});
watch(() => editDialog.form.role, () => {
    if (!editRequiresMinistry.value)
        editDialog.form.ministryIds = [];
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.userPermissions.canList) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-6" },
    });
    /** @type {[typeof ErrorDialog, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(ErrorDialog, new ErrorDialog({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.errorDialog.open),
        title: (__VLS_ctx.errorDialog.title),
        message: (__VLS_ctx.errorDialog.message),
        details: (__VLS_ctx.errorDialog.details),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.errorDialog.open),
        title: (__VLS_ctx.errorDialog.title),
        message: (__VLS_ctx.errorDialog.message),
        details: (__VLS_ctx.errorDialog.details),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        'onUpdate:modelValue': (...[$event]) => {
            if (!(__VLS_ctx.userPermissions.canList))
                return;
            __VLS_ctx.errorDialog.open = $event;
        }
    };
    var __VLS_2;
    /** @type {[typeof ConfirmDialog, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(ConfirmDialog, new ConfirmDialog({
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        modelValue: (__VLS_ctx.passwordDialog.open),
        title: "Resetar senha",
        description: "Gerar uma nova senha temporaria para este usuario? A senha atual sera invalidada.",
        confirmLabel: "Gerar nova senha",
        cancelLabel: "Cancelar",
        loading: (__VLS_ctx.passwordDialog.loading),
    }));
    const __VLS_8 = __VLS_7({
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        modelValue: (__VLS_ctx.passwordDialog.open),
        title: "Resetar senha",
        description: "Gerar uma nova senha temporaria para este usuario? A senha atual sera invalidada.",
        confirmLabel: "Gerar nova senha",
        cancelLabel: "Cancelar",
        loading: (__VLS_ctx.passwordDialog.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    let __VLS_10;
    let __VLS_11;
    let __VLS_12;
    const __VLS_13 = {
        onConfirm: (__VLS_ctx.handleConfirmReset)
    };
    const __VLS_14 = {
        onCancel: (...[$event]) => {
            if (!(__VLS_ctx.userPermissions.canList))
                return;
            __VLS_ctx.passwordDialog.open = false;
        }
    };
    var __VLS_9;
    /** @type {[typeof ConfirmDialog, ]} */ ;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent(ConfirmDialog, new ConfirmDialog({
        ...{ 'onUpdate:modelValue': {} },
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        modelValue: (__VLS_ctx.statusDialog.open),
        title: (__VLS_ctx.statusDialogTitle),
        description: (__VLS_ctx.statusDialogDescription),
        confirmLabel: "Confirmar",
        cancelLabel: "Cancelar",
    }));
    const __VLS_16 = __VLS_15({
        ...{ 'onUpdate:modelValue': {} },
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        modelValue: (__VLS_ctx.statusDialog.open),
        title: (__VLS_ctx.statusDialogTitle),
        description: (__VLS_ctx.statusDialogDescription),
        confirmLabel: "Confirmar",
        cancelLabel: "Cancelar",
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    let __VLS_18;
    let __VLS_19;
    let __VLS_20;
    const __VLS_21 = {
        'onUpdate:modelValue': (...[$event]) => {
            if (!(__VLS_ctx.userPermissions.canList))
                return;
            __VLS_ctx.statusDialog.open = $event;
        }
    };
    const __VLS_22 = {
        onConfirm: (__VLS_ctx.handleConfirmStatusChange)
    };
    const __VLS_23 = {
        onCancel: (...[$event]) => {
            if (!(__VLS_ctx.userPermissions.canList))
                return;
            __VLS_ctx.statusDialog.open = false;
        }
    };
    var __VLS_17;
    /** @type {[typeof ConfirmDialog, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(ConfirmDialog, new ConfirmDialog({
        ...{ 'onUpdate:modelValue': {} },
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        modelValue: (__VLS_ctx.deleteDialog.open),
        title: "Excluir usuario",
        description: (__VLS_ctx.deleteDialogDescription),
        confirmLabel: "Excluir",
        cancelLabel: "Cancelar",
        type: "danger",
    }));
    const __VLS_25 = __VLS_24({
        ...{ 'onUpdate:modelValue': {} },
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        modelValue: (__VLS_ctx.deleteDialog.open),
        title: "Excluir usuario",
        description: (__VLS_ctx.deleteDialogDescription),
        confirmLabel: "Excluir",
        cancelLabel: "Cancelar",
        type: "danger",
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    let __VLS_27;
    let __VLS_28;
    let __VLS_29;
    const __VLS_30 = {
        'onUpdate:modelValue': (...[$event]) => {
            if (!(__VLS_ctx.userPermissions.canList))
                return;
            __VLS_ctx.deleteDialog.open = $event;
        }
    };
    const __VLS_31 = {
        onConfirm: (__VLS_ctx.handleConfirmDelete)
    };
    const __VLS_32 = {
        onCancel: (...[$event]) => {
            if (!(__VLS_ctx.userPermissions.canList))
                return;
            __VLS_ctx.deleteDialog.open = false;
        }
    };
    var __VLS_26;
    /** @type {[typeof Modal, typeof Modal, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(Modal, new Modal({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.editDialog.open),
        title: "Editar usuario",
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.editDialog.open),
        title: "Editar usuario",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        'onUpdate:modelValue': ((value) => {
            __VLS_ctx.editDialog.open = value;
            if (!value)
                __VLS_ctx.closeEditDialog();
        })
    };
    __VLS_35.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleUpdateUser) },
        ...{ class: "space-y-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid gap-4 md:grid-cols-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.editDialog.form.name),
        type: "text",
        required: true,
        ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "email",
        required: true,
        ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
    });
    (__VLS_ctx.editDialog.form.email);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.editDialog.form.cpf),
        type: "text",
        maxlength: "14",
        ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.editDialog.form.phone),
        type: "text",
        ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (...[$event]) => {
                if (!(__VLS_ctx.userPermissions.canList))
                    return;
                __VLS_ctx.onEditRoleChange($event.target.value);
            } },
        value: (__VLS_ctx.editRoleSelectValue),
        required: true,
        ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
    });
    for (const [option] of __VLS_getVForSourceType((__VLS_ctx.baseRoleOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (option.value),
            value: (option.value),
        });
        (option.label);
    }
    if (__VLS_ctx.catalog.ministries.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.optgroup, __VLS_intrinsicElements.optgroup)({
            label: "Coordenadores por ministÃ©rio",
        });
        for (const [ministry] of __VLS_getVForSourceType((__VLS_ctx.catalog.ministries))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (ministry.id),
                value: (`CoordenadorMinisterio:${ministry.id}`),
            });
            (ministry.name);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.editDialog.form.profileId),
        ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [profile] of __VLS_getVForSourceType((__VLS_ctx.admin.profiles))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (profile.id),
            value: (profile.id),
        });
        (profile.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    if (__VLS_ctx.editRequiresDistrict) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-[10px] font-medium text-primary-600 dark:text-primary-300" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.editDialog.form.districtScopeId),
        required: (__VLS_ctx.editRequiresDistrict),
        ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [district] of __VLS_getVForSourceType((__VLS_ctx.catalog.districts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (district.id),
            value: (district.id),
        });
        (district.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    if (__VLS_ctx.editRequiresChurch) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-[10px] font-medium text-primary-600 dark:text-primary-300" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.editDialog.form.churchScopeId),
        required: (__VLS_ctx.editRequiresChurch),
        ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [church] of __VLS_getVForSourceType((__VLS_ctx.catalog.churches))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (church.id),
            value: (church.id),
        });
        (church.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "md:col-span-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2 flex items-center gap-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "h-14 w-14 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" },
    });
    if (__VLS_ctx.editDialog.photoPreview) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.editDialog.photoPreview),
            alt: "Foto do usuario",
            ...{ class: "h-full w-full object-cover" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "flex h-full w-full items-center justify-center text-sm text-neutral-500" },
        });
        (__VLS_ctx.userInitials(__VLS_ctx.editDialog.form.name));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "inline-flex cursor-pointer items-center rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.handleEditPhotoChange) },
        type: "file",
        accept: "image/*",
        ...{ class: "hidden" },
    });
    if (__VLS_ctx.editDialog.photoPreview) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearEditPhoto) },
            type: "button",
            ...{ class: "text-xs text-red-500 hover:text-red-400" },
        });
    }
    if (__VLS_ctx.editRequiresMinistry) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "md:col-span-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-medium text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 grid gap-2 sm:grid-cols-2" },
        });
        for (const [ministry] of __VLS_getVForSourceType((__VLS_ctx.catalog.ministries))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                key: (ministry.id),
                ...{ class: "flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "checkbox",
                value: (ministry.id),
                ...{ class: "h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" },
            });
            (__VLS_ctx.editDialog.form.ministryIds);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (ministry.name);
        }
        if (__VLS_ctx.editMinistryError) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "mt-1 text-xs text-red-500" },
            });
            (__VLS_ctx.editMinistryError);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-2 sm:flex-row sm:justify-end" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeEditDialog) },
        type: "button",
        ...{ class: "rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "submit",
        disabled: (__VLS_ctx.editDialog.loading),
        ...{ class: "inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60" },
    });
    if (__VLS_ctx.editDialog.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.editDialog.loading ? "Salvando..." : "Salvar alteraÃ§Ãµes");
    var __VLS_35;
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30" },
    }));
    const __VLS_41 = __VLS_40({
        ...{ class: "bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    __VLS_42.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "max-w-2xl" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "text-3xl font-semibold text-neutral-900 dark:text-white" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-1 text-sm text-neutral-600 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-3 sm:flex-row sm:items-center" },
    });
    const __VLS_43 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        to: "/admin/dashboard",
        ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
    }));
    const __VLS_45 = __VLS_44({
        to: "/admin/dashboard",
        ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    __VLS_46.slots.default;
    var __VLS_46;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleCreateForm) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/50 transition hover:translate-y-0.5" },
    });
    (__VLS_ctx.showCreateForm ? "Fechar formulÃ¡rio" : "+ Novo usuÃ¡rio");
    var __VLS_42;
    if (__VLS_ctx.lastTempPassword) {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_47 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "border border-white/30 bg-gradient-to-br from-white/90 to-primary-50/30 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }));
        const __VLS_48 = __VLS_47({
            ...{ class: "border border-white/30 bg-gradient-to-br from-white/90 to-primary-50/30 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_47));
        __VLS_49.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        (__VLS_ctx.lastTempPassword.user);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "rounded-2xl bg-neutral-900/90 px-5 py-2 font-mono text-base tracking-wide text-white shadow-inner shadow-black/20" },
        });
        (__VLS_ctx.lastTempPassword.password);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
        });
        var __VLS_49;
    }
    if (__VLS_ctx.showCreateForm) {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_50 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }));
        const __VLS_51 = __VLS_50({
            ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_50));
        __VLS_52.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.handleCreateUser) },
            ...{ class: "space-y-5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "grid gap-5 md:grid-cols-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.form.name),
            type: "text",
            required: true,
            ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "email",
            required: true,
            ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        (__VLS_ctx.form.email);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.form.cpf),
            type: "text",
            maxlength: "14",
            ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.form.phone),
            type: "text",
            ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.userPermissions.canList))
                        return;
                    if (!(__VLS_ctx.showCreateForm))
                        return;
                    __VLS_ctx.onCreateRoleChange($event.target.value);
                } },
            value: (__VLS_ctx.createRoleSelectValue),
            required: true,
            ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.baseRoleOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (option.value),
                value: (option.value),
            });
            (option.label);
        }
        if (__VLS_ctx.catalog.ministries.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.optgroup, __VLS_intrinsicElements.optgroup)({
                label: "Coordenadores por ministÃ©rio",
            });
            for (const [ministry] of __VLS_getVForSourceType((__VLS_ctx.catalog.ministries))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    key: (ministry.id),
                    value: (`CoordenadorMinisterio:${ministry.id}`),
                });
                (ministry.name);
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.form.profileId),
            ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [profile] of __VLS_getVForSourceType((__VLS_ctx.admin.profiles))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (profile.id),
                value: (profile.id),
            });
            (profile.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-between text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        if (__VLS_ctx.requiresDistrict) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-[10px] font-medium text-primary-600 dark:text-primary-300" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.form.districtScopeId),
            required: (__VLS_ctx.requiresDistrict),
            ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [district] of __VLS_getVForSourceType((__VLS_ctx.catalog.districts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (district.id),
                value: (district.id),
            });
            (district.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-between text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        if (__VLS_ctx.requiresChurch) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-[10px] font-medium text-primary-600 dark:text-primary-300" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.form.churchScopeId),
            required: (__VLS_ctx.requiresChurch),
            ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [church] of __VLS_getVForSourceType((__VLS_ctx.catalog.churches))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (church.id),
                value: (church.id),
            });
            (church.name);
        }
        if (__VLS_ctx.requiresMinistry) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-y-2 md:col-span-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-1 grid gap-2 sm:grid-cols-2" },
            });
            for (const [ministry] of __VLS_getVForSourceType((__VLS_ctx.catalog.ministries))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    key: (ministry.id),
                    ...{ class: "flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-2 text-sm text-neutral-700 shadow-inner transition dark:border-white/10 dark:bg-white/5 dark:text-white" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    type: "checkbox",
                    value: (ministry.id),
                    ...{ class: "h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" },
                });
                (__VLS_ctx.form.ministryIds);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (ministry.name);
            }
            if (__VLS_ctx.ministryError) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-red-500 dark:text-red-400" },
                });
                (__VLS_ctx.ministryError);
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.toggleCreateForm) },
            type: "button",
            ...{ class: "inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: "submit",
            disabled: (__VLS_ctx.savingUser),
            ...{ class: "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:opacity-70" },
        });
        if (__VLS_ctx.savingUser) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.savingUser ? "Salvando..." : "Criar usuario");
        var __VLS_52;
    }
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
    }));
    const __VLS_54 = __VLS_53({
        ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "text-2xl font-semibold text-neutral-900 dark:text-white" },
    });
    (__VLS_ctx.admin.users.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshData) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary-600 transition hover:translate-y-0.5 dark:text-primary-300" },
        disabled: (__VLS_ctx.initialLoading),
    });
    if (__VLS_ctx.initialLoading) {
        /** @type {[typeof TableSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_56 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
            helperText: "ðŸ”„ Carregando usuÃ¡rios...",
        }));
        const __VLS_57 = __VLS_56({
            helperText: "ðŸ”„ Carregando usuÃ¡rios...",
        }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-6 hidden overflow-hidden rounded-sm border border-white/40 bg-white/70 shadow-lg shadow-neutral-200/40 dark:border-white/10 dark:bg-neutral-950/40 dark:shadow-black/30 md:block" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "w-full table-auto text-left text-sm text-neutral-700 dark:text-neutral-200" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
            ...{ class: "bg-white/60 text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-5 py-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-5 py-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-5 py-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-5 py-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-5 py-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-5 py-3 text-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({
            ...{ class: "divide-y divide-neutral-100 dark:divide-white/5" },
        });
        for (const [user] of __VLS_getVForSourceType((__VLS_ctx.admin.users))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (user.id),
                ...{ class: "transition hover:bg-white/80 dark:hover:bg-white/5" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex items-center gap-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-white/70 bg-white/40 shadow-inner dark:border-white/10 dark:bg-white/10" },
            });
            if (user.photoUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (user.photoUrl),
                    alt: "Foto do usuario",
                    ...{ class: "h-full w-full object-cover" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500 dark:text-neutral-300" },
                });
                (__VLS_ctx.userInitials(user.name));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "font-semibold text-neutral-900 dark:text-white" },
            });
            (user.name);
            if (user.cpf) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                });
                (__VLS_ctx.maskCpf(user.cpf));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300" },
            });
            (user.email);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300" },
            });
            (__VLS_ctx.roleLabel(user.role));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300" },
            });
            if (user.ministries?.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (user.ministries.map((m) => m.name).join(", "));
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-neutral-400 dark:text-neutral-500" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex flex-wrap items-center gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase" },
                ...{ class: (__VLS_ctx.statusPillClass(user.status)) },
            });
            (user.status === 'ACTIVE' ? 'Ativo' : 'Inativo');
            if (user.mustChangePassword) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-4 text-right" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "inline-flex flex-wrap items-center justify-end gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.userPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.initialLoading))
                            return;
                        __VLS_ctx.openEditDialog(user);
                    } },
                type: "button",
                ...{ class: "inline-flex items-center gap-1 rounded-full border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.userPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.initialLoading))
                            return;
                        __VLS_ctx.openResetDialog(user);
                    } },
                type: "button",
                ...{ class: "inline-flex items-center gap-1 rounded-full border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30" },
            });
            if (__VLS_ctx.userPermissions.canDeactivate) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.userPermissions.canList))
                                return;
                            if (!!(__VLS_ctx.initialLoading))
                                return;
                            if (!(__VLS_ctx.userPermissions.canDeactivate))
                                return;
                            __VLS_ctx.openStatusDialog(user);
                        } },
                    type: "button",
                    ...{ class: "inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-xs font-semibold transition hover:bg-amber-50 dark:hover:bg-amber-500/10" },
                    ...{ class: (user.status === 'ACTIVE'
                            ? 'border-amber-200/70 text-amber-700 dark:border-amber-500/30 dark:text-amber-200'
                            : 'border-emerald-200/70 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200') },
                });
                (user.status === 'ACTIVE' ? 'Desativar' : 'Reativar');
            }
            if (__VLS_ctx.userPermissions.canDelete) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.userPermissions.canList))
                                return;
                            if (!!(__VLS_ctx.initialLoading))
                                return;
                            if (!(__VLS_ctx.userPermissions.canDelete))
                                return;
                            __VLS_ctx.openDeleteDialog(user);
                        } },
                    type: "button",
                    ...{ class: "inline-flex items-center gap-1 rounded-full border border-red-200/70 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10" },
                });
            }
        }
        if (!__VLS_ctx.admin.users.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400" },
                colspan: "6",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-6 flex flex-col gap-4 md:hidden" },
        });
        for (const [user] of __VLS_getVForSourceType((__VLS_ctx.admin.users))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (user.id),
                ...{ class: "rounded-3xl border border-white/10 bg-white/90 p-4 text-sm shadow-[0_18px_40px_-25px_rgba(15,23,42,0.75)] dark:border-white/5 dark:bg-neutral-950/40 dark:text-neutral-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex items-center gap-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-white/70 bg-white/40 shadow-inner dark:border-white/10 dark:bg-white/10" },
            });
            if (user.photoUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (user.photoUrl),
                    alt: "Foto do usuario",
                    ...{ class: "h-full w-full object-cover" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500 dark:text-neutral-300" },
                });
                (__VLS_ctx.userInitials(user.name));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "font-semibold text-neutral-900 dark:text-white" },
            });
            (user.name);
            if (user.cpf) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                });
                (__VLS_ctx.maskCpf(user.cpf));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
            });
            (user.email);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-500 dark:text-neutral-400" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "font-semibold text-neutral-800 dark:text-neutral-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.roleLabel(user.role));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "font-semibold text-neutral-800 dark:text-neutral-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-1 flex flex-wrap gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase" },
                ...{ class: (__VLS_ctx.statusPillClass(user.status)) },
            });
            (user.status === 'ACTIVE' ? 'Ativo' : 'Inativo');
            if (user.mustChangePassword) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "col-span-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "font-semibold text-neutral-800 dark:text-neutral-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            if (user.ministries?.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (user.ministries.map((m) => m.name).join(", "));
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-neutral-400 dark:text-neutral-500" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 grid grid-cols-1 gap-2 text-xs font-semibold" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "grid grid-cols-2 gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.userPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.initialLoading))
                            return;
                        __VLS_ctx.openEditDialog(user);
                    } },
                type: "button",
                ...{ class: "rounded-full border border-primary-200 px-4 py-2 text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.userPermissions.canList))
                            return;
                        if (!!(__VLS_ctx.initialLoading))
                            return;
                        __VLS_ctx.openResetDialog(user);
                    } },
                type: "button",
                ...{ class: "rounded-full border border-primary-200 px-4 py-2 text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30" },
            });
            if (__VLS_ctx.userPermissions.canDeactivate) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.userPermissions.canList))
                                return;
                            if (!!(__VLS_ctx.initialLoading))
                                return;
                            if (!(__VLS_ctx.userPermissions.canDeactivate))
                                return;
                            __VLS_ctx.openStatusDialog(user);
                        } },
                    type: "button",
                    ...{ class: "rounded-full border px-4 py-2 text-xs font-semibold transition hover:bg-amber-50 dark:hover:bg-amber-500/10" },
                    ...{ class: (user.status === 'ACTIVE'
                            ? 'border-amber-200/70 text-amber-700 dark:border-amber-500/30 dark:text-amber-200'
                            : 'border-emerald-200/70 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200') },
                });
                (user.status === 'ACTIVE' ? 'Desativar' : 'Reativar');
            }
            if (__VLS_ctx.userPermissions.canDelete) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.userPermissions.canList))
                                return;
                            if (!!(__VLS_ctx.initialLoading))
                                return;
                            if (!(__VLS_ctx.userPermissions.canDelete))
                                return;
                            __VLS_ctx.openDeleteDialog(user);
                        } },
                    type: "button",
                    ...{ class: "rounded-full border border-red-200 px-4 py-2 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10" },
                });
            }
        }
        if (!__VLS_ctx.admin.users.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "rounded-3xl border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400" },
            });
        }
    }
    var __VLS_55;
}
else {
    /** @type {[typeof AccessDeniedNotice, ]} */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(AccessDeniedNotice, new AccessDeniedNotice({
        module: "users",
        action: "view",
    }));
    const __VLS_60 = __VLS_59({
        module: "users",
        action: "view",
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    var __VLS_62 = {};
    var __VLS_61;
}
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-14']} */ ;
/** @type {__VLS_StyleScopedClasses['w-14']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-primary-50/40']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-100/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-neutral-900/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-primary-950/30']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/50']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/30']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-50/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-900/90']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-black/20']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-neutral-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['to-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:placeholder-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:placeholder-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:placeholder-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:placeholder-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-70']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-neutral-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['to-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/30']} */ ;
/** @type {__VLS_StyleScopedClasses['md:block']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['table-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-amber-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-amber-500/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200/60']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-primary-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200/60']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-primary-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-amber-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-amber-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-red-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-red-500/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-red-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_18px_40px_-25px_rgba(15,23,42,0.75)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-amber-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-amber-500/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-primary-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-primary-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-amber-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-amber-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-red-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-red-500/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-red-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            BaseCard: BaseCard,
            ErrorDialog: ErrorDialog,
            ConfirmDialog: ConfirmDialog,
            Modal: Modal,
            TableSkeleton: TableSkeleton,
            AccessDeniedNotice: AccessDeniedNotice,
            admin: admin,
            catalog: catalog,
            userPermissions: userPermissions,
            showCreateForm: showCreateForm,
            initialLoading: initialLoading,
            savingUser: savingUser,
            lastTempPassword: lastTempPassword,
            ministryError: ministryError,
            editMinistryError: editMinistryError,
            form: form,
            editDialog: editDialog,
            errorDialog: errorDialog,
            passwordDialog: passwordDialog,
            statusDialog: statusDialog,
            deleteDialog: deleteDialog,
            baseRoleOptions: baseRoleOptions,
            requiresDistrict: requiresDistrict,
            requiresChurch: requiresChurch,
            requiresMinistry: requiresMinistry,
            editRequiresDistrict: editRequiresDistrict,
            editRequiresChurch: editRequiresChurch,
            editRequiresMinistry: editRequiresMinistry,
            createRoleSelectValue: createRoleSelectValue,
            editRoleSelectValue: editRoleSelectValue,
            maskCpf: maskCpf,
            userInitials: userInitials,
            roleLabel: roleLabel,
            statusPillClass: statusPillClass,
            deleteDialogDescription: deleteDialogDescription,
            statusDialogTitle: statusDialogTitle,
            statusDialogDescription: statusDialogDescription,
            onCreateRoleChange: onCreateRoleChange,
            onEditRoleChange: onEditRoleChange,
            toggleCreateForm: toggleCreateForm,
            handleCreateUser: handleCreateUser,
            openEditDialog: openEditDialog,
            closeEditDialog: closeEditDialog,
            handleEditPhotoChange: handleEditPhotoChange,
            clearEditPhoto: clearEditPhoto,
            handleUpdateUser: handleUpdateUser,
            openResetDialog: openResetDialog,
            handleConfirmReset: handleConfirmReset,
            openStatusDialog: openStatusDialog,
            handleConfirmStatusChange: handleConfirmStatusChange,
            openDeleteDialog: openDeleteDialog,
            handleConfirmDelete: handleConfirmDelete,
            refreshData: refreshData,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=AdminUsers.vue.js.map