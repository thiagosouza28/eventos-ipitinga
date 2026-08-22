import axios from "axios";
import { create } from "zustand";

import { API_BASE_URL } from "@/lib/config/api";
import { useLoaderStore } from "@/lib/stores/loader";
import type { AdminProfile, PermissionAction, PermissionState, Role, UserStatus } from "@/types/api";

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

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  hasValidSession: boolean;
  loadFromStorage: () => void;
  ensureValidSession: () => boolean;
  getAuthorizationHeader: () => string | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<void>;
  signOut: () => void;
  hasPermission: (module: string, action?: PermissionAction) => boolean;
};

const STORAGE_KEY = "catre-auth";
const ROLE_KEY = "catre-role";
const TOKEN_SKEW_SECONDS = 30;

const decodeBase64 = (value: string) => {
  if (typeof atob === "function") {
    return atob(value);
  }
  const buffer = (globalThis as { Buffer?: { from: (input: string, encoding: string) => { toString: (enc: string) => string } } }).Buffer;
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

const persistSession = (token: string | null, user: AuthUser | null) => {
  try {
    if (token && user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
      try {
        localStorage.setItem(ROLE_KEY, user.role);
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

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isReady: false,
  isAuthenticated: false,
  hasValidSession: false,
  loadFromStorage: () => {
    let token: string | null = null;
    let user: AuthUser | null = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token ?? null;
        user = parsed.user ?? null;
        if (parsed?.user?.role) {
          try {
            localStorage.setItem(ROLE_KEY, parsed.user.role);
          } catch {}
        }
      }
    } catch (error) {
      console.warn("[auth] Failed to read stored session", error);
    }
    if (token && !isTokenValid(token)) {
      console.warn("[auth] Stored token expired or invalid. Clearing session.");
      token = null;
      user = null;
      persistSession(null, null);
    }
    set({
      token,
      user,
      isReady: true,
      isAuthenticated: Boolean(token),
      hasValidSession: Boolean(token && isTokenValid(token))
    });
  },
  ensureValidSession: () => {
    const { token, hasValidSession, isAuthenticated } = get();
    if (!token) {
      if (hasValidSession || isAuthenticated) {
        set({ hasValidSession: false, isAuthenticated: false });
      }
      return false;
    }
    if (isTokenValid(token)) {
      if (!hasValidSession || !isAuthenticated) {
        set({ hasValidSession: true, isAuthenticated: true });
      }
      return true;
    }
    console.warn("[auth] Token expired or invalid. Signing out.");
    get().signOut();
    return false;
  },
  getAuthorizationHeader: () => {
    if (!get().ensureValidSession()) {
      return null;
    }
    const token = get().token;
    return token ? `Bearer ${token}` : null;
  },
  signIn: async (identifier: string, password: string) => {
    const loader = useLoaderStore.getState();
    loader.show("Processando autenticação...");
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, { identifier, password });
      const payload = response.data as { token: string; user: AuthUser };
      set({
        token: payload.token,
        user: payload.user,
        isAuthenticated: Boolean(payload.token),
        hasValidSession: Boolean(payload.token && isTokenValid(payload.token))
      });
      persistSession(payload.token, payload.user);
    } finally {
      loader.hide();
    }
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const loader = useLoaderStore.getState();
    loader.show("Processando autenticação...");
    try {
      const authHeader = get().getAuthorizationHeader();
      const response = await axios.post(
        `${API_BASE_URL}/admin/profile/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: authHeader ?? undefined } }
      );
      const payload = response.data as { token: string; user: AuthUser };
      set({
        token: payload.token,
        user: payload.user,
        isAuthenticated: Boolean(payload.token),
        hasValidSession: Boolean(payload.token && isTokenValid(payload.token))
      });
      persistSession(payload.token, payload.user);
    } finally {
      loader.hide();
    }
  },
  requestPasswordReset: async (identifier: string) => {
    const loader = useLoaderStore.getState();
    loader.show("Processando autenticação...");
    try {
      await axios.post(`${API_BASE_URL}/admin/password/recover`, { identifier });
    } finally {
      loader.hide();
    }
  },
  signOut: () => {
    set({ token: null, user: null, isAuthenticated: false, hasValidSession: false });
    persistSession(null, null);
  },
  hasPermission: (module: string, action: PermissionAction = "view") => {
    const user = get().user;
    if (!user) {
      return false;
    }
    if (user.role === "AdminGeral") {
      return true;
    }
    const profileMap = mapProfilePermissions(user.profile ?? null);
    const permissionMap = Object.keys(profileMap).length > 0 ? profileMap : user.permissions ?? {};
    if (!permissionMap || Object.keys(permissionMap).length === 0) {
      return false;
    }
    const entry = permissionMap[module];
    if (!entry) {
      return false;
    }
    return Boolean(entry[action]);
  }
}));
