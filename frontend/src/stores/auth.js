import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
const STORAGE_KEY = "catre-auth";
const ROLE_KEY = "catre-role";
export const useAuthStore = defineStore("auth", () => {
    const token = ref(null);
    const user = ref(null);
    const isAuthenticated = computed(() => Boolean(token.value));
    const loadFromStorage = () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            token.value = parsed.token;
            user.value = parsed.user;
            if (parsed?.user?.role) {
                try {
                    localStorage.setItem(ROLE_KEY, parsed.user.role);
                }
                catch { }
            }
        }
    };
    const persist = () => {
        if (token.value && user.value) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token.value, user: user.value }));
            try {
                localStorage.setItem(ROLE_KEY, user.value.role);
            }
            catch { }
        }
        else {
            localStorage.removeItem(STORAGE_KEY);
            try {
                localStorage.removeItem(ROLE_KEY);
            }
            catch { }
        }
    };
    const setSession = (payload) => {
        token.value = payload.token;
        user.value = payload.user;
        persist();
    };
    const signIn = async (identifier, password) => {
        const response = await axios.post(`${API_BASE_URL}/admin/login`, {
            identifier,
            password
        });
        setSession(response.data);
    };
    const changePassword = async (currentPassword, newPassword) => {
        const response = await axios.post(`${API_BASE_URL}/admin/profile/change-password`, {
            currentPassword,
            newPassword
        }, {
            headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined
        });
        setSession(response.data);
    };
    const requestPasswordReset = async (identifier) => {
        await axios.post(`${API_BASE_URL}/admin/password/recover`, { identifier });
    };
    const signOut = () => {
        token.value = null;
        user.value = null;
        persist();
    };
    loadFromStorage();
    const role = computed(() => user.value?.role ?? null);
    const permissionMap = computed(() => user.value?.permissions ?? {});
    const hasPermission = (module, action = "view") => {
        if (!user.value) {
            return false;
        }
        if (user.value.role === "AdminGeral") {
            return true;
        }
        const map = user.value.permissions ?? {};
        // Se ainda não houver mapa calculado, mantemos compatibilidade liberando acesso
        if (!map || Object.keys(map).length === 0) {
            return true;
        }
        const entry = map[module];
        if (!entry) {
            return false;
        }
        return Boolean(entry[action]);
    };
    const isAdminGeral = computed(() => role.value === "AdminGeral");
    const isAdminDistrital = computed(() => role.value === "AdminDistrital");
    const canCreateFree = computed(() => isAdminGeral.value || isAdminDistrital.value);
    const canManageUsers = computed(() => isAdminGeral.value || hasPermission("users", "view"));
    return {
        token,
        user,
        isAuthenticated,
        role,
        isAdminGeral,
        isAdminDistrital,
        canCreateFree,
        canManageUsers,
        hasPermission,
        changePassword,
        requestPasswordReset,
        signIn,
        signOut
    };
});
//# sourceMappingURL=auth.js.map
