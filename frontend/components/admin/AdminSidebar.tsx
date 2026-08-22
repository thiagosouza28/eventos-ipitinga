"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  ArrowLeftOnRectangleIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  MoonIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  SunIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

import { useAuthStore } from "@/lib/stores/auth";
import type { PermissionAction, Role } from "@/types/api";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/hooks/useTheme";

type MenuItem = { label: string; href: string; icon: ComponentType<{ className?: string }>; module?: string; action?: PermissionAction; requiresRole?: Role };
type GroupKey = "events" | "organization" | "financial" | "administration";
type AdminSidebarProps = { isOpen: boolean; menuItems: MenuItem[]; onToggle: () => void };

const groupDefinitions: Array<{ key: GroupKey; label: string; icon: ComponentType<{ className?: string }>; labels: string[] }> = [
  { key: "events", label: "Eventos", icon: CalendarDaysIcon, labels: ["Eventos", "Seguros", "Inscrições", "Pedidos", "Check-in", "Inscritos offline", "Sorteios equipes"] },
  { key: "organization", label: "Organização", icon: BuildingOffice2Icon, labels: ["Distritos", "Igrejas", "Ministérios"] },
  { key: "financial", label: "Financeiro", icon: BanknotesIcon, labels: ["Financeiro", "Financeiro (responsáveis)", "PIX / Pagamentos"] },
  { key: "administration", label: "Administração", icon: ShieldCheckIcon, labels: ["Relatórios", "Usuários", "Permissões"] }
];

export function AdminSidebar({ isOpen, menuItems, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuthStore();
  const { isDark, toggleTheme } = useTheme();
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);
  const [floatingGroup, setFloatingGroup] = useState<GroupKey | null>(null);

  const visibleItems = useMemo(() => menuItems.filter((item) => {
    if (item.requiresRole && auth.user?.role !== item.requiresRole) return false;
    return !item.module || auth.hasPermission(item.module, item.action ?? "view");
  }), [auth, menuItems]);
  const findItem = (label: string) => visibleItems.find((item) => item.label === label);
  const dashboard = findItem("Dashboard");
  const settings = findItem("Configurações");
  const groups = groupDefinitions.map((definition) => ({ ...definition, items: definition.labels.map(findItem).filter((item): item is MenuItem => Boolean(item)) })).filter((group) => group.items.length);
  const isActive = (item: MenuItem) => pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(`${item.href}/`));
  const groupIsActive = (group: (typeof groups)[number]) => group.items.some(isActive);

  useEffect(() => {
    setOpenGroup(groups.find(groupIsActive)?.key ?? null);
    setFloatingGroup(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const initials = auth.user?.name?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CI";
  const signOut = () => { auth.signOut(); router.push("/admin"); };
  const linkStyle = (active: boolean) => cn(
    "admin-nav-link group relative flex min-h-11 items-center px-3 text-sm transition-colors",
    active ? "admin-nav-link-active text-white" : "text-emerald-50/70 hover:text-white"
  );

  const content = (expanded: boolean, mobile = false) => (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-[72px] shrink-0 items-center border-b border-white/10 px-3">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3" onClick={mobile ? onToggle : undefined}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-sm font-black text-white shadow-sm">CI</span>
          {expanded ? <span className="min-w-0 leading-tight"><strong className="block truncate text-sm text-white">CATRE Ipitinga</strong><small className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/45">Gestão de eventos</small></span> : null}
        </Link>
        {mobile ? <button type="button" className="grid h-10 w-10 place-items-center border border-white/10" onClick={onToggle}><XMarkIcon className="h-5 w-5" /></button> : expanded ? <button type="button" className="grid h-9 w-9 place-items-center text-slate-500 hover:bg-white/5 hover:text-white" title="Recolher menu" onClick={onToggle}><ChevronLeftIcon className="h-5 w-5" /></button> : null}
      </div>
      <nav className="custom-scroll relative flex-1 overflow-y-auto overflow-x-visible px-2 py-4">
        {dashboard ? <Link href={dashboard.href} title={expanded ? undefined : "Dashboard"} className={cn(linkStyle(isActive(dashboard)), expanded ? "gap-3" : "justify-center")} onClick={mobile ? onToggle : undefined}><Squares2X2Icon className="h-5 w-5" />{expanded ? <span className="font-semibold">Dashboard</span> : null}</Link> : null}
        {expanded ? <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100/40">Navegação</p> : <div className="my-4 border-t border-white/10" />}
        {groups.map((group) => {
          const GroupIcon = group.icon;
          const active = groupIsActive(group);
          return <div className="relative mb-1" key={group.key}>
            <button type="button" title={expanded ? undefined : group.label} className={cn("admin-nav-link flex min-h-11 w-full items-center px-3 text-left text-sm transition-colors", active ? "text-yellow-200" : "text-emerald-50/70 hover:text-white", expanded ? "gap-3" : "justify-center")} onClick={() => expanded ? setOpenGroup((value) => value === group.key ? null : group.key) : setFloatingGroup((value) => value === group.key ? null : group.key)}>
              <GroupIcon className="h-5 w-5 shrink-0" />{expanded ? <><span className="flex-1 font-semibold">{group.label}</span><ChevronRightIcon className={cn("h-4 w-4 transition-transform duration-200", openGroup === group.key && "rotate-90")} /></> : null}
            </button>
            {expanded && openGroup === group.key ? <div className="ml-5 border-l border-slate-800 py-1 pl-2">{group.items.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={cn(linkStyle(isActive(item)), "gap-3")} onClick={mobile ? onToggle : undefined}><Icon className="h-4 w-4" /><span className="truncate font-medium">{item.label === "Sorteios equipes" ? "Sorteios / Equipes" : item.label}</span></Link>; })}</div> : null}
            {!expanded && floatingGroup === group.key ? <div className="fixed left-[72px] z-[70] mt-[-44px] w-60 rounded-xl border border-[#1e4935] bg-[#052d1c] p-2 shadow-2xl"><p className="border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/45">{group.label}</p>{group.items.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={cn(linkStyle(isActive(item)), "gap-3")} onClick={() => setFloatingGroup(null)}><Icon className="h-4 w-4" /><span>{item.label}</span></Link>; })}</div> : null}
          </div>;
        })}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-2">
        <button type="button" title={isDark ? "Usar modo claro" : "Usar modo escuro"} className={cn(linkStyle(false), "w-full", expanded ? "gap-3" : "justify-center")} onClick={toggleTheme}>{isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}{expanded ? <span className="font-semibold">{isDark ? "Modo claro" : "Modo escuro"}</span> : null}</button>
        {settings ? <Link href={settings.href} title={expanded ? undefined : "Configurações"} className={cn(linkStyle(isActive(settings)), expanded ? "gap-3" : "justify-center")} onClick={mobile ? onToggle : undefined}><Cog6ToothIcon className="h-5 w-5" />{expanded ? <span className="font-semibold">Configurações</span> : null}</Link> : null}
        <div className={cn("mt-2 flex items-center border-t border-white/10 pt-3", expanded ? "gap-3 px-2" : "justify-center")}><Link href="/admin/profile" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-bold text-white ring-1 ring-white/15" title="Minha conta">{initials}</Link>{expanded ? <><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{auth.user?.name}</p><p className="truncate text-[10px] text-emerald-100/45">{auth.user?.role === "AdminGeral" ? "Administrador geral" : "Usuário administrativo"}</p></div><button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-emerald-100/45 hover:bg-white/5 hover:text-red-300" title="Sair" onClick={signOut}><ArrowLeftOnRectangleIcon className="h-5 w-5" /></button></> : null}</div>
        {!expanded && !mobile ? <button type="button" className="mx-auto mt-2 grid h-10 w-10 place-items-center text-slate-500 hover:text-white" title="Expandir menu" onClick={onToggle}><ChevronRightIcon className="h-5 w-5" /></button> : null}
      </div>
    </div>
  );

  return <><div className="hidden shrink-0 transition-[width] duration-200 md:block" style={{ width: isOpen ? 256 : 72 }}><aside className="admin-sidebar-panel fixed inset-y-0 left-0 z-40 flex border-r shadow-xl transition-[width] duration-200" style={{ width: isOpen ? 256 : 72 }}>{content(isOpen)}</aside></div>{isOpen ? <div className="fixed inset-0 z-50 flex md:hidden"><button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onToggle} /><aside className="admin-sidebar-panel relative flex h-full w-[min(88vw,320px)] border-r shadow-2xl">{content(true, true)}</aside></div> : null}</>;
}
