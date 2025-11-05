import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
const STORAGE_KEY = "catre-auth";
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
        }
    };
    const persist = () => {
        if (token.value && user.value) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token.value, user: user.value }));
        }
        else {
            localStorage.removeItem(STORAGE_KEY);
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
    return {
        token,
        user,
        isAuthenticated,
        signIn,
        signOut
    };
});
//# sourceMappingURL=auth.js.map