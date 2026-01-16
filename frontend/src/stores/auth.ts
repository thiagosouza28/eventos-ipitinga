import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";

import { API_BASE_URL } from "../config/api";
import { useLoaderStore } from "./loader";
import type { Role, AdminProfile, PermissionState, PermissionAction, UserStatus } from "../types/api";

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
};

type JwtPayload = {
  exp?: number;
};

const STORAGE_KEY = "catre-auth";
const ROLE_KEY = "catre-role";
const TOKEN_SKEW_SECONDS = 30;

const decodeBase64 = (value: string) => {
  if (typeof atob === "function") {
    return atob(value);
  }
  const buffer = (
    globalThis as {
      Buffer?: { from: (input: string, encoding: string) => { toString: (enc: string) => string } };
    }
  ).Buffer;
  if (buffer?.from) {
    return buffer.from(value, "base64").toString("utf8");
  }
  return null;
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const decoded = decodeBase64(padded);
  if (!decoded) {
    return null;
  }
  try {
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};

const isTokenValid = (value: string) => {
  const payload = decodeJwtPayload(value);
  if (!payload) {
    return false;
  }
  if (typeof payload.exp !== "number") {
    return true;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds + TOKEN_SKEW_SECONDS < payload.exp;
};

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(null);
  const user = ref<AuthUser | null>(null);
  const isReady = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value));
  const hasValidSession = computed(() => Boolean(token.value && isTokenValid(token.value)));

  const persist = () => {
    try {
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
    } catch (error) {
      console.warn("[auth] Failed to persist session", error);
    }
  };

  const clearSession = () => {
    token.value = null;
    user.value = null;
    persist();
  };

  const loadFromStorage = () => {
    try {
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
    } catch (error) {
      console.warn("[auth] Failed to read stored session", error);
    }
    if (token.value && !isTokenValid(token.value)) {
      console.warn("[auth] Stored token expired or invalid. Clearing session.");
      clearSession();
    }
    isReady.value = true;
  };

  const ensureValidSession = () => {
    if (!token.value) {
      return false;
    }
    if (isTokenValid(token.value)) {
      return true;
    }
    console.warn("[auth] Token expired or invalid. Signing out.");
    clearSession();
    return false;
  };

  const getAuthorizationHeader = () => {
    if (!ensureValidSession()) {
      return null;
    }
    return token.value ? `Bearer ${token.value}` : null;
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
    const authHeader = getAuthorizationHeader();
    const response = await withLoader(() =>
      axios.post(
        `${API_BASE_URL}/admin/profile/change-password`,
        {
          currentPassword,
          newPassword
        },
        { headers: { Authorization: authHeader ?? undefined } }
      )
    );
    setSession(response.data);
  };

  const requestPasswordReset = async (identifier: string) => {
    await withLoader(() => axios.post(`${API_BASE_URL}/admin/password/recover`, { identifier }));
  };

  const signOut = () => {
    clearSession();
  };

  loadFromStorage();

  const role = computed<Role | null>(() => user.value?.role ?? null);

  const mapProfilePermissions = (profile?: AdminProfile | null): Record<string, PermissionState> => {
    if (!profile?.permissions?.length) {
      return {};
    }
    return profile.permissions.reduce<Record<string, PermissionState>>((acc, entry) => {
      acc[entry.module] = {
        view: entry.canView,
        create: entry.canCreate,
        edit: entry.canEdit,
        delete: entry.canDelete,
        approve: entry.canApprove,
        deactivate: entry.canDeactivate,
        reports: entry.canReport,
        financial: entry.canFinancial
      };
      return acc;
    }, {});
  };

  const permissionMap = computed<Record<string, PermissionState>>(() => {
    const profileMap = mapProfilePermissions(user.value?.profile ?? null);
    if (Object.keys(profileMap).length > 0) {
      return profileMap;
    }
    return user.value?.permissions ?? {};
  });

  const hasPermission = (module: string, action: PermissionAction = "view") => {
    if (!user.value) {
      return false;
    }
    if (user.value.role === "AdminGeral") {
      return true;
    }
    const map = permissionMap.value;
    if (!map || Object.keys(map).length === 0) {
      return false;
    }
    const entry = map[module];
    if (!entry) {
      return false;
    }
    return Boolean(entry[action]);
  };

  const isAdminGeral = computed(() => role.value === "AdminGeral");
  const isAdminDistrital = computed(() => role.value === "AdminDistrital");
  const canCreateFree = computed(() => hasPermission("registrations", "create"));
  const canManageUsers = computed(() => hasPermission("users", "view"));

  return {
    token,
    user,
    isReady,
    isAuthenticated,
    hasValidSession,
    ensureValidSession,
    getAuthorizationHeader,
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
