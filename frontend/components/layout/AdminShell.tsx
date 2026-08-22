"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  MapPinIcon,
  MoonIcon,
  PresentationChartBarIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  SunIcon,
  TrophyIcon,
  UserCircleIcon,
  UserPlusIcon,
  UsersIcon
} from "@heroicons/react/24/outline";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/lib/stores/auth";
import { useSystemConfigStore } from "@/lib/stores/system-config";
import { cn } from "@/lib/utils/cn";
import type { PermissionAction, Role } from "@/types/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type AdminShellProps = {
  children: React.ReactNode;
};

type MenuDefinition = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  module?: string;
  action?: PermissionAction;
  requiresRole?: Role;
};

const baseAdminMenu: MenuDefinition[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Squares2X2Icon, module: "dashboard" },
  { label: "Eventos", href: "/admin/events", icon: CalendarDaysIcon, module: "events" },
  { label: "Seguros", href: "/admin/insurance", icon: ShieldCheckIcon, module: "events" },
  { label: "Distritos", href: "/admin/districts", icon: MapPinIcon, module: "districts" },
  { label: "Igrejas", href: "/admin/churches", icon: MapPinIcon, module: "churches" },
  { label: "Ministérios", href: "/admin/ministries", icon: UsersIcon, module: "ministries" },
  { label: "Usuários", href: "/admin/users", icon: UserPlusIcon, module: "users" },
  { label: "Permissões", href: "/admin/profiles", icon: ShieldCheckIcon, module: "profiles" },
  { label: "Pedidos", href: "/admin/orders", icon: ClipboardDocumentListIcon, module: "orders" },
  { label: "Inscrições", href: "/admin/registrations", icon: UsersIcon, module: "registrations" },
  { label: "Relatórios", href: "/admin/reports", icon: PresentationChartBarIcon, module: "reports" },
  { label: "Financeiro", href: "/admin/financial", icon: BanknotesIcon, module: "financial" },
  { label: "Financeiro (responsáveis)", href: "/admin/finance/districts", icon: BanknotesIcon, module: "financial" },
  { label: "Check-in", href: "/admin/checkin", icon: QrCodeIcon, module: "checkin" },
  { label: "Inscritos offline", href: "/admin/inscritos-offline", icon: ClipboardDocumentListIcon, module: "checkin" },
  { label: "Sorteios equipes", href: "/admin/sorteios-equipes", icon: TrophyIcon, module: "checkin" },
  { label: "PIX / Pagamentos", href: "/admin/payments/pix", icon: Cog6ToothIcon, requiresRole: "AdminGeral" },
  { label: "Configurações", href: "/admin/system-config", icon: Cog6ToothIcon, requiresRole: "AdminGeral" }
];

const adminGuards: Array<{
  match: (pathname: string) => boolean;
  module?: string;
  action?: PermissionAction;
  role?: Role;
}> = [
  {
    match: (pathname) => /^\/admin\/events\/[^/]+\/financial/.test(pathname),
    module: "financial",
    action: "view"
  },
  { match: (pathname) => pathname.startsWith("/admin/system-config"), role: "AdminGeral" },
  { match: (pathname) => pathname.startsWith("/admin/payments/pix"), role: "AdminGeral" },
  { match: (pathname) => pathname.startsWith("/admin/dashboard"), module: "dashboard", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/users"), module: "users", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/profile"), module: undefined },
  { match: (pathname) => pathname.startsWith("/admin/profiles"), module: "profiles", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/catalog"), module: "catalog", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/districts"), module: "districts", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/churches"), module: "churches", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/ministries"), module: "ministries", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/insurance"), module: "events", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/events"), module: "events", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/registrations"), module: "registrations", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/reports"), module: "reports", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/orders"), module: "orders", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/financial"), module: "financial", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/finance"), module: "financial", action: "view" },
  { match: (pathname) => pathname.startsWith("/admin/checkin"), module: "checkin", action: "view" },
];

export function AdminShell({ children }: AdminShellProps) {
  const { isDark, toggleTheme } = useTheme();
  const auth = useAuthStore();
  const systemConfig = useSystemConfigStore((state) => state.config);
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarPreferenceKey = "admin-sidebar-collapsed";

  const menuItems = useMemo(
    () =>
      baseAdminMenu.filter((item) => {
        if (item.requiresRole && auth.user?.role !== item.requiresRole) {
          return false;
        }
        if (!item.module) {
          return true;
        }
        return auth.hasPermission(item.module, item.action ?? "view");
      }),
    [auth]
  );

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (profileMenuOpen && profileMenuRef.current && target && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [profileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(window.localStorage.getItem(sidebarPreferenceKey) !== "true");
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((current) => {
      const next = !current;
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        window.localStorage.setItem(sidebarPreferenceKey, String(!next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!auth.isReady) return;
    if (!auth.isAuthenticated) {
      router.replace(`/admin?redirect=${encodeURIComponent(pathname ?? "/admin")}`);
      return;
    }
    if (auth.user?.mustChangePassword) {
      router.replace(`/admin/alterar-senha?redirect=${encodeURIComponent(pathname ?? "/admin")}`);
      return;
    }
    if (!pathname) return;
    const requirement = adminGuards.find((entry) => entry.match(pathname));
    if (!requirement) return;
    if (requirement.role && auth.user?.role !== requirement.role) {
      router.replace(`/admin/acesso-negado?role=${requirement.role}&from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (requirement.module && !auth.hasPermission(requirement.module, requirement.action ?? "view")) {
      router.replace(
        `/admin/acesso-negado?module=${requirement.module}&action=${requirement.action ?? "view"}&from=${encodeURIComponent(pathname)}`
      );
    }
  }, [auth, pathname, router]);

  const activeBrandLogo = useMemo(() => {
    const branding = systemConfig.branding;
    if (isDark) {
      return branding.logoDarkUrl ?? branding.logoLightUrl ?? "";
    }
    return branding.logoLightUrl ?? branding.logoDarkUrl ?? "";
  }, [isDark, systemConfig.branding]);

  const userDisplayName = useMemo(() => {
    const name = auth.user?.name?.trim();
    if (!name) return "";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return parts[0] ?? "";
    }
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }, [auth.user?.name]);

  const greetingMessage = useMemo(() => {
    if (!auth.isAuthenticated) return "";
    const displayName = userDisplayName;
    if (!displayName) return "";
    const hour = currentTime.getHours();
    let greeting = "Olá";
    if (hour >= 5 && hour < 12) {
      greeting = "Bom dia";
    } else if (hour >= 12 && hour < 18) {
      greeting = "Boa tarde";
    } else {
      greeting = "Boa noite";
    }
    return `${greeting}, ${displayName}`;
  }, [auth.isAuthenticated, currentTime, userDisplayName]);

  const userInitials = useMemo(() => {
    const name = auth.user?.name?.trim();
    if (!name) {
      return "CI";
    }
    const letters = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0)?.toUpperCase() ?? "")
      .join("");
    return letters || "CI";
  }, [auth.user?.name]);

  const userAvatar = auth.user?.photoUrl?.trim() ?? "";

  if (!auth.isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={cn(isDark ? "dark" : "")}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <AdminSidebar isOpen={isSidebarOpen} menuItems={menuItems} onToggle={toggleSidebar} />
        <div className="admin-content-bg flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[color:var(--app-shell-border)] bg-[color:var(--app-shell-bg)] px-3 py-3 backdrop-blur-md sm:px-6">
            <div className="flex min-h-12 flex-nowrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-card)] bg-[color:var(--surface-card)] text-[color:var(--text)] sm:h-11 sm:w-11 md:hidden"
                  aria-pressed={isSidebarOpen}
                  onClick={toggleSidebar}
                >
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                  <span className="sr-only">Alternar menu administrativo</span>
                </button>
                <Link href="/" className="flex min-w-0 items-center gap-2 text-lg font-semibold text-[#111827] sm:gap-3 md:hidden dark:text-white">
                  <div className="brand-mark h-10 w-10 sm:h-12 sm:w-12">
                    {activeBrandLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeBrandLogo} alt="Logotipo CATRE" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <span>CI</span>
                    )}
                  </div>
                  <span className="flex min-w-0 flex-col text-[12px] font-bold uppercase leading-[1.05] tracking-[0.04em] min-[340px]:text-[13px] sm:block sm:text-lg sm:normal-case sm:leading-normal sm:tracking-normal">
                    <span className="whitespace-nowrap">CATRE</span>
                    <span className="whitespace-nowrap sm:ml-1">Ipitinga</span>
                  </span>
                </Link>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
                {greetingMessage ? (
                  <div className="hidden flex-col text-right leading-tight sm:flex">
                    <span className="text-sm font-semibold text-[#1f2937] dark:text-white">{greetingMessage}</span>
                    <span className="text-xs text-[#94A3B8] dark:text-[#94a3b8]">Estamos felizes em ver você</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="hidden h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--border-card)] bg-[color:var(--surface-card)] text-primary-600 hover:border-primary-300 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10 lg:flex"
                  aria-pressed={isDark}
                  onClick={toggleTheme}
                >
                  {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                  <span className="sr-only">Alternar tema</span>
                </button>
                {auth.user?.role === "AdminGeral" ? (
                  <Link href="/admin/system-config" className="btn-muted hidden font-medium sm:inline-flex">
                    Configurações
                  </Link>
                ) : null}
                {auth.isAuthenticated ? (
                  <div className="relative flex" ref={profileMenuRef}>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[color:var(--border-card)] bg-[color:var(--surface-card)] px-2 py-1.5 text-sm font-semibold text-[color:var(--text)] hover:border-primary-300 sm:h-auto sm:gap-2 sm:px-3 sm:py-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        setProfileMenuOpen((prev) => !prev);
                      }}
                    >
                      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-primary-600 text-xs text-white sm:h-8 sm:w-8 sm:text-sm">
                        {userAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={userAvatar} alt="Foto de perfil" className="h-full w-full object-cover" />
                        ) : (
                          <span>{userInitials}</span>
                        )}
                      </div>
                      <ChevronDownIcon className="h-4 w-4 text-[#475569] dark:text-white" />
                    </button>
                    {profileMenuOpen ? (
                      <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-white/10 bg-[color:var(--surface-card)] p-3 shadow-2xl backdrop-blur">
                        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
                          <div className="h-12 w-12 overflow-hidden rounded-full bg-[#1f4fff] text-center text-white">
                            {userAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={userAvatar} alt="Foto de perfil" className="h-full w-full object-cover" />
                            ) : (
                              <span className="leading-[3rem]">{userInitials}</span>
                            )}
                          </div>
                          <div className="flex flex-col text-sm text-[color:var(--text)]">
                            <span className="font-semibold">{auth.user?.name}</span>
                            <span className="text-xs text-[color:var(--text-muted)]">{auth.user?.email}</span>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-sm">
                          <Link
                            href="/admin/profile"
                            className="flex items-center justify-between rounded-lg px-3 py-2 text-[color:var(--text)] transition hover:bg-white/10"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <span>Meus dados</span>
                            <UserCircleIcon className="h-4 w-4 text-[color:var(--text-muted)]" />
                          </Link>
                          {auth.user?.role === "AdminGeral" ? (
                            <Link
                              href="/admin/system-config"
                              className="flex items-center justify-between rounded-lg px-3 py-2 text-[color:var(--text)] transition hover:bg-white/10"
                              onClick={() => setProfileMenuOpen(false)}
                            >
                              <span>Configurações</span>
                              <Cog6ToothIcon className="h-4 w-4 text-[color:var(--text-muted)]" />
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[color:var(--text)] transition hover:bg-white/10"
                            onClick={() => {
                              setProfileMenuOpen(false);
                              auth.signOut();
                              router.push("/admin");
                            }}
                          >
                            <span>Sair</span>
                            <ArrowRightOnRectangleIcon className="h-4 w-4 text-[color:var(--text-muted)]" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <main className="flex-1 px-3 pb-24 pt-5 sm:px-6 sm:pb-16 sm:pt-7 md:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[1680px] space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
