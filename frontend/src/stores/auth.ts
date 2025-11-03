import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";

import { API_BASE_URL } from "../config/api";

type UserRole = "AdminGeral" | "AdminDistrital" | "DiretorLocal" | "Tesoureiro";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  districtScopeId?: string | null;
  churchScopeId?: string | null;
};

const STORAGE_KEY = "catre-auth";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(null);
  const user = ref<AuthUser | null>(null);

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
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const signIn = async (email: string, password: string) => {
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
