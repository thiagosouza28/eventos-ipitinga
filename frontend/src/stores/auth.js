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
    const signIn = async (email, password) => {
        const response = await axios.post(`${API_BASE_URL}/admin/login`, {
            email,
            password
        });
        token.value = response.data.token;
        user.value = response.data.user;
        persist();
    };
    const signOut = () => {
        token.value = null;
        user.value = null;
        persist();
    };
    loadFromStorage();
    const role = computed(() => user.value?.role ?? null);
    const isAdminGeral = computed(() => role.value === "AdminGeral");
    const isAdminDistrital = computed(() => role.value === "AdminDistrital");
    const canCreateFree = computed(() => isAdminGeral.value || isAdminDistrital.value);
    return {
        token,
        user,
        isAuthenticated,
        role,
        isAdminGeral,
        isAdminDistrital,
        canCreateFree,
        signIn,
        signOut
    };
});
//# sourceMappingURL=auth.js.map