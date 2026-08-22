"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChevronDownIcon,
  Cog6ToothIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
  UserCircleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/lib/stores/auth";
import { useSystemConfigStore } from "@/lib/stores/system-config";
import { cn } from "@/lib/utils/cn";

type PublicShellProps = {
  children: React.ReactNode;
};

export function PublicShell({ children }: PublicShellProps) {
  const { isDark, toggleTheme } = useTheme();
  const auth = useAuthStore();
  const ensureValidSession = useAuthStore((state) => state.ensureValidSession);
  const systemConfig = useSystemConfigStore((state) => state.config);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const shouldShowOfflineBanner =
    process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SHOW_OFFLINE_BANNER === "true";

  useEffect(() => {
    ensureValidSession();
  }, [ensureValidSession]);

  useEffect(() => {
    if (!shouldShowOfflineBanner) return;
    const handleOffline = () => setApiOffline(true);
    const handleOnline = () => setApiOffline(false);
    window.addEventListener("api-offline", handleOffline);
    window.addEventListener("api-online", handleOnline);
    return () => {
      window.removeEventListener("api-offline", handleOffline);
      window.removeEventListener("api-online", handleOnline);
    };
  }, [shouldShowOfflineBanner]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const interval = window.setInterval(() => setCurrentTime(new Date()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, [auth.isAuthenticated]);

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

  const hidePublicChrome = useMemo(() => {
    if (!pathname) return false;
    if (!pathname.startsWith("/evento/")) return false;
    const segments = pathname.split("/").filter(Boolean);
    return segments.length === 2;
  }, [pathname]);

  const activeBrandLogo = useMemo(() => {
    const branding = systemConfig.branding;
    if (isDark) {
      return branding.logoDarkUrl ?? branding.logoLightUrl ?? "";
    }
    return branding.logoLightUrl ?? branding.logoDarkUrl ?? "";
  }, [isDark, systemConfig.branding]);

  const adminLink = auth.isAuthenticated ? "/admin/dashboard" : "/admin";
  const adminLinkLabel = auth.isAuthenticated ? "Painel admin" : "Admin";

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
    if (!name) return "CI";
    const letters = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0)?.toUpperCase() ?? "")
      .join("");
    return letters || "CI";
  }, [auth.user?.name]);

  const userAvatar = auth.user?.photoUrl?.trim() ?? "";

  const handleSignOut = () => {
    auth.signOut();
    router.push("/admin");
    setMobileMenuOpen(false);
  };

  return (
    <div className={cn("public-shell", isDark ? "dark" : "")}>
      {apiOffline && shouldShowOfflineBanner ? (
        <div className="sticky top-0 z-[60] w-full bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente.
        </div>
      ) : null}

      <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text)] transition-colors">
        {!hidePublicChrome ? (
          <header className="public-header sticky top-0 z-50 border-b border-[color:var(--app-shell-border)]">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex min-h-12 items-center justify-between">
                <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--border-card)] bg-[color:var(--surface-card)] text-[color:var(--text)] sm:hidden"
                    onClick={() => setMobileMenuOpen((prev) => !prev)}
                  >
                    {mobileMenuOpen ? (
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    )}
                    <span className="sr-only">Abrir menu</span>
                  </button>
                  <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-[color:var(--text)]">
                    <div className="brand-mark">
                      {activeBrandLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={activeBrandLogo} alt="Logotipo CATRE" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span>CI</span>
                      )}
                    </div>
                    <span className="brand-wordmark">
                      <strong>CATRE Ipitinga</strong>
                      <small>Eventos &amp; inscrições</small>
                    </span>
                  </Link>
                </div>
                <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
                  {greetingMessage ? (
                    <div className="hidden flex-col text-right leading-tight sm:flex">
                      <span className="text-sm font-semibold text-[color:var(--text)]">{greetingMessage}</span>
                      <span className="text-xs text-[#94A3B8] dark:text-[color:var(--text-muted)]">
                        Estamos felizes em ver você
                      </span>
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
                  <Link href={adminLink} className="btn-outline hidden sm:inline-flex">
                    <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
                    <span>{adminLinkLabel}</span>
                  </Link>
                  {auth.isAuthenticated && auth.user?.role === "AdminGeral" ? (
                    <Link href="/admin/system-config" className="btn-muted hidden font-medium sm:inline-flex">
                      Configurações
                    </Link>
                  ) : null}
                  {auth.isAuthenticated ? (
                    <div className="relative flex" ref={profileMenuRef}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-card)] bg-[color:var(--surface-card)] px-2.5 py-1.5 text-sm font-semibold text-[color:var(--text)] hover:border-primary-300"
                        onClick={(event) => {
                          event.stopPropagation();
                          setProfileMenuOpen((prev) => !prev);
                        }}
                      >
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary-600 text-white">
                          {userAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={userAvatar} alt="Foto de perfil" className="h-full w-full object-cover" />
                          ) : (
                            <span>{userInitials}</span>
                          )}
                        </div>
                        <ChevronDownIcon className="h-4 w-4 text-[color:var(--text-muted)]" />
                      </button>
                      {profileMenuOpen ? (
                        <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--surface-card)] p-3 shadow-[var(--card-shadow-strong)]">
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
                              href={adminLink}
                              className="flex items-center justify-between rounded-lg px-3 py-2 text-[color:var(--text)] transition hover:bg-white/10"
                              onClick={() => setProfileMenuOpen(false)}
                            >
                              <span>Painel admin</span>
                              <ShieldCheckIcon className="h-4 w-4 text-[color:var(--text-muted)]" />
                            </Link>
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
                                handleSignOut();
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
            </div>
            {mobileMenuOpen ? (
              <div className="mx-auto mt-2 flex w-[calc(100%-2rem)] flex-col gap-2 rounded-2xl border border-[color:var(--app-shell-border)] bg-[color:var(--surface-card)] px-4 py-4 text-sm shadow-[var(--card-shadow-strong)] sm:hidden">
                {greetingMessage ? (
                  <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] px-4 py-3 text-sm font-semibold text-[color:var(--text)]">
                    {greetingMessage}
                  </div>
                ) : null}
                <Link
                  href={adminLink}
                  className="btn-outline w-full justify-center border-[color:var(--border-card)]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span>{adminLinkLabel}</span>
                </Link>
                {auth.isAuthenticated && auth.user?.role === "AdminGeral" ? (
                  <Link href="/admin/system-config" className="btn-muted w-full justify-center">
                    Configurações
                  </Link>
                ) : null}
              </div>
            ) : null}
          </header>
        ) : null}

        <div
          className={
            hidePublicChrome
              ? "flex min-h-screen w-full flex-col"
              : "mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[1440px] flex-col px-4 py-7 sm:px-6 sm:py-9 lg:px-8"
          }
        >
          <main className={hidePublicChrome ? "flex-1" : "flex-1 pb-10"}>{children}</main>
          {!hidePublicChrome ? (
            <footer className="mt-auto flex flex-col items-center justify-between gap-2 border-t border-[color:var(--border-card)] py-6 text-center text-xs text-[color:var(--text-muted)] sm:flex-row sm:text-left">
              &copy; {new Date().getFullYear()} CATRE Ipitinga. Sistema de Inscrições e check-in.
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}
