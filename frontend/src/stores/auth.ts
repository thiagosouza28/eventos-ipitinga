import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";

import { API_BASE_URL } from "../config/api";
import { useLoaderStore } from "./loader";
import type {
  Role,
  AdminProfile,
  PermissionState,
  PermissionAction,
  UserStatus,
  ProfilePermissionEntry
} from "../types/api";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  photoUrl?: string | null;
  districtScopeId?: string | null;
  churchId?: string | null;
  cpf?: string | null;
  phone?: string | null;
  mustChangePassword?: boolean;
  ministryId?: string | null;
  ministries?: Array<{ id: string; name: string }>;
  profile?: AdminProfile | null;
  permissions?: Record<string, PermissionState>;
  permissionOverrides?: ProfilePermissionEntry[];
};

const STORAGE_KEY = "catre-auth";
const ROLE_KEY = "catre-role";

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
      if (parsed?.user?.role) {
        try {
          localStorage.setItem(ROLE_KEY, parsed.user.role);
        } catch {}
      }
    }
  };

  const persist = () => {
    if (token.value && user.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token.value, user: user.value }));
      try {
        localStorage.setItem(ROLE_KEY, user.value.role);
      } catch {}
    } else {
      localStorage.removeItem(STORAGE_KEY);
      try {
        localStorage.removeItem(ROLE_KEY);
      } catch {}
    }
  };

  const setSession = (payload: { token: string; user: AuthUser }) => {
    token.value = payload.token;
    user.value = payload.user;
    persist();
  };

  const withLoader = async <T>(action: () => Promise<T>) => {
    const loader = useLoaderStore();
    loader.show("Processando autenticacao...");
    try {
      return await action();
    } finally {
      loader.hide();
    }
  };

  const signIn = async (identifier: string, password: string) => {
    const response = await withLoader(() =>
      axios.post(`${API_BASE_URL}/admin/login`, {
        identifier,
        password
      })
    );
    setSession(response.data);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await withLoader(() =>
      axios.post(
        `${API_BASE_URL}/admin/profile/change-password`,
        {
          currentPassword,
          newPassword
        },
        { headers: { Authorization: token.value ? `Bearer ${token.value}` : undefined } }
      )
    );
    setSession(response.data);
  };

  const requestPasswordReset = async (identifier: string) => {
    await withLoader(() => axios.post(`${API_BASE_URL}/admin/password/recover`, { identifier }));
  };

  const signOut = () => {
    token.value = null;
    user.value = null;
    persist();
  };

  loadFromStorage();

  const role = computed<Role | null>(() => user.value?.role ?? null);

  const hasPermission = (module: string, action: PermissionAction = "view") => {
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



