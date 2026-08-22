"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  MoonIcon,
  PaintBrushIcon,
  PhotoIcon,
  RectangleGroupIcon,
  SunIcon
} from "@heroicons/react/24/outline";

import { COLOR_SCALE_KEYS, type SystemConfigSettings } from "@/lib/config/system-config";
import { useSystemConfigStore } from "@/lib/stores/system-config";
import { cn } from "@/lib/utils/cn";

type Section = "brand" | "appearance" | "layout" | "components" | "reports";
type ThemeKey = "light" | "dark";

type SectionDefinition = {
  id: Section;
  index: string;
  label: string;
  description: string;
  eyebrow: string;
  icon: ComponentType<{ className?: string }>;
};

const sections: SectionDefinition[] = [
  { id: "brand", index: "01", label: "Identidade", description: "Logos e tipografia", eyebrow: "Marca", icon: PhotoIcon },
  { id: "appearance", index: "02", label: "Paleta", description: "Temas e cores", eyebrow: "Aparência", icon: PaintBrushIcon },
  { id: "layout", index: "03", label: "Estrutura", description: "Medidas e espaços", eyebrow: "Layout", icon: RectangleGroupIcon },
  { id: "components", index: "04", label: "Elementos", description: "Campos e botões", eyebrow: "Interface", icon: AdjustmentsHorizontalIcon },
  { id: "reports", index: "05", label: "Documentos", description: "PDFs e relatórios", eyebrow: "Impressão", icon: DocumentTextIcon }
];

const componentTitles = {
  button: "Botões",
  input: "Campos de formulário",
  card: "Painéis e cartões",
  modal: "Janelas e diálogos"
} as const;

const propertyLabels: Record<string, string> = {
  borderRadius: "Arredondamento",
  paddingX: "Espaço horizontal",
  paddingY: "Espaço vertical",
  fontWeight: "Peso da fonte",
  shadow: "Sombra",
  borderWidth: "Espessura da borda",
  borderColor: "Cor da borda",
  background: "Fundo",
  focusRing: "Destaque ao selecionar",
  backdrop: "Fundo externo",
  animation: "Curva da animação"
};

const clone = (value: SystemConfigSettings) => JSON.parse(JSON.stringify(value)) as SystemConfigSettings;

const inputClass =
  "h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600";

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">{label}</span>
    {children}
    {hint ? <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</span> : null}
  </label>
);

const NumberField = ({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix = "px"
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) => (
  <Field label={label}>
    <div className="relative">
      <input
        className={cn(inputClass, "pr-12 tabular-nums")}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {suffix ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold uppercase text-slate-400">{suffix}</span> : null}
    </div>
  </Field>
);

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <Field label={label}>
    <div className="flex h-11 items-center border border-slate-300 bg-white focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 dark:border-slate-700 dark:bg-slate-950">
      <input
        type="color"
        aria-label={`Selecionar ${label.toLowerCase()}`}
        className="ml-2 h-7 w-9 cursor-pointer rounded-none border-0 bg-transparent p-0"
        value={value.startsWith("#") ? value : "#009249"}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <input
        className="min-w-0 flex-1 bg-transparent pr-3 font-mono text-xs uppercase text-slate-900 outline-none dark:text-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  </Field>
);

const SectionHeader = ({ section }: { section: SectionDefinition }) => {
  const Icon = section.icon;
  return (
    <header className="flex items-start gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
      <span className="grid h-11 w-11 shrink-0 place-items-center bg-emerald-700 text-white dark:bg-emerald-600">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">{section.eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white">{section.label}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
      </div>
    </header>
  );
};

const GroupTitle = ({ children, description }: { children: ReactNode; description?: string }) => (
  <div className="border-l-2 border-emerald-600 pl-3">
    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{children}</h3>
    {description ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
  </div>
);

export function SystemConfigClient() {
  const store = useSystemConfigStore();
  const [draft, setDraft] = useState(() => clone(store.config));
  const [section, setSection] = useState<Section>("brand");
  const [theme, setTheme] = useState<ThemeKey>("light");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!dirty) setDraft(clone(store.config));
  }, [store.config, dirty]);

  const currentSection = sections.find((item) => item.id === section) ?? sections[0];
  const preview = useMemo(() => draft.theme[theme], [draft.theme, theme]);

  const mutate = (fn: (next: SystemConfigSettings) => void) => {
    setDraft((current) => {
      const next = clone(current);
      fn(next);
      return next;
    });
    setDirty(true);
    setFeedback(null);
  };

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = clone(draft);
      payload.branding.logoLightUrl = payload.branding.logoLightUrl?.trim() || null;
      payload.branding.logoDarkUrl = payload.branding.logoDarkUrl?.trim() || null;
      await store.saveConfig(payload);
      setDirty(false);
      setFeedback({ kind: "success", message: "Configurações publicadas com sucesso." });
    } catch (error: any) {
      setFeedback({ kind: "error", message: error?.response?.data?.message ?? "Não foi possível salvar as configurações." });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDraft(clone(store.config));
    setDirty(false);
    setFeedback(null);
  };

  return (
    <div className="pb-28">
      <header className="mb-5 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-400">Administração / Sistema</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className={cn("h-2 w-2", dirty ? "bg-amber-500" : "bg-emerald-500")} />
              {dirty ? "Alterações pendentes" : "Configuração sincronizada"}
            </div>
          </div>
        </div>
        <div className="grid gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Central de configuração</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Controle a identidade visual, a densidade da interface e o padrão dos documentos em um único ambiente.
            </p>
          </div>
          <dl className="grid grid-cols-2 border border-slate-200 dark:border-slate-700">
            <div className="min-w-28 border-r border-slate-200 px-4 py-3 dark:border-slate-700">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categorias</dt>
              <dd className="mt-1 text-lg font-bold text-slate-900 dark:text-white">05</dd>
            </div>
            <div className="min-w-28 px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tema em edição</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{theme === "light" ? "Claro" : "Escuro"}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_310px]">
        <nav aria-label="Categorias de configuração" className="min-w-0 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 xl:self-start">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Áreas de edição</p>
          </div>
          <div className="mobile-scroll-row flex overflow-x-auto xl:block">
            {sections.map((item) => {
              const active = section === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "group relative flex min-w-[190px] items-center gap-3 border-r border-slate-200 px-4 py-4 text-left transition-colors last:border-r-0 xl:w-full xl:min-w-0 xl:border-b xl:border-r-0 xl:last:border-b-0 dark:border-slate-800",
                    active ? "admin-config-module-active" : "text-slate-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-950/30"
                  )}
                >
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center border", active ? "border-white/25" : "border-slate-200 dark:border-slate-700")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("admin-config-module-index block text-[10px] font-bold tracking-[0.16em]", active ? "" : "text-slate-400")}>{item.index}</span>
                    <strong className="block truncate text-sm">{item.label}</strong>
                  </span>
                  <span className={cn("absolute bottom-0 left-0 top-0 w-1", active ? "bg-yellow-400" : "bg-transparent")} />
                </button>
              );
            })}
          </div>
        </nav>

        <main className="min-w-0 border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <SectionHeader section={currentSection} />

          {section === "brand" ? (
            <div className="mt-7 space-y-8">
              <section className="space-y-4">
                <GroupTitle description="Use arquivos públicos em HTTPS. Quando o endereço estiver vazio, o sistema utiliza a marca padrão.">Arquivos da marca</GroupTitle>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Logo no tema claro"><input className={inputClass} value={draft.branding.logoLightUrl ?? ""} placeholder="https://dominio.com/logo.png" onChange={(event) => mutate((next) => { next.branding.logoLightUrl = event.target.value; })} /></Field>
                  <Field label="Logo no tema escuro"><input className={inputClass} value={draft.branding.logoDarkUrl ?? ""} placeholder="https://dominio.com/logo-escura.png" onChange={(event) => mutate((next) => { next.branding.logoDarkUrl = event.target.value; })} /></Field>
                </div>
              </section>
              <section className="space-y-4">
                <GroupTitle description="Informe famílias CSS válidas, incluindo fontes alternativas.">Tipografia institucional</GroupTitle>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Fonte dos textos"><input className={inputClass} value={draft.branding.fontFamily} onChange={(event) => mutate((next) => { next.branding.fontFamily = event.target.value; })} /></Field>
                  <Field label="Fonte dos títulos"><input className={inputClass} value={draft.branding.headingFontFamily} onChange={(event) => mutate((next) => { next.branding.headingFontFamily = event.target.value; })} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <NumberField label="Tamanho base" value={draft.typography.baseFontSize} min={10} max={24} onChange={(value) => mutate((next) => { next.typography.baseFontSize = value; })} />
                  <NumberField label="Proporção da escala" value={draft.typography.scaleRatio} min={1} max={1.8} step={0.05} suffix="×" onChange={(value) => mutate((next) => { next.typography.scaleRatio = value; })} />
                  <NumberField label="Espaço entre letras" value={draft.typography.letterSpacing} min={-2} max={2} step={0.1} onChange={(value) => mutate((next) => { next.typography.letterSpacing = value; })} />
                  <NumberField label="Altura dos textos" value={draft.typography.bodyLineHeight} min={1} max={2} step={0.1} suffix="×" onChange={(value) => mutate((next) => { next.typography.bodyLineHeight = value; })} />
                  <NumberField label="Altura dos títulos" value={draft.typography.headingLineHeight} min={1} max={2} step={0.1} suffix="×" onChange={(value) => mutate((next) => { next.typography.headingLineHeight = value; })} />
                </div>
              </section>
            </div>
          ) : null}

          {section === "appearance" ? (
            <div className="mt-7 space-y-8">
              <ThemeSelector theme={theme} setTheme={setTheme} />
              <section className="space-y-4">
                <GroupTitle description="Estas cores determinam o contraste e a hierarquia das telas.">Cores essenciais</GroupTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField label="Cor principal" value={preview.palette.primary["500"]} onChange={(value) => mutate((next) => { next.theme[theme].palette.primary["500"] = value; })} />
                  <ColorField label="Cor de destaque" value={preview.tokens.accent} onChange={(value) => mutate((next) => { next.theme[theme].tokens.accent = value; })} />
                  <ColorField label="Texto principal" value={preview.tokens.textBase} onChange={(value) => mutate((next) => { next.theme[theme].tokens.textBase = value; })} />
                  <ColorField label="Texto secundário" value={preview.tokens.textMuted} onChange={(value) => mutate((next) => { next.theme[theme].tokens.textMuted = value; })} />
                  <Field label="Fundo da aplicação"><input className={inputClass} value={preview.tokens.appBackground} onChange={(event) => mutate((next) => { next.theme[theme].tokens.appBackground = event.target.value; })} /></Field>
                  <Field label="Superfície dos painéis"><input className={inputClass} value={preview.tokens.surface} onChange={(event) => mutate((next) => { next.theme[theme].tokens.surface = event.target.value; })} /></Field>
                </div>
              </section>
              <section className="space-y-4">
                <GroupTitle description="A escala completa é usada em botões, links, estados e fundos auxiliares.">Escala da cor principal</GroupTitle>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {COLOR_SCALE_KEYS.map((shade) => <ColorField key={shade} label={`Tom ${shade}`} value={preview.palette.primary[shade]} onChange={(value) => mutate((next) => { next.theme[theme].palette.primary[shade] = value; })} />)}
                </div>
              </section>
              <section className="space-y-4">
                <GroupTitle>Cores de estado</GroupTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField label="Informação" value={preview.support.info} onChange={(value) => mutate((next) => { next.theme[theme].support.info = value; })} />
                  <ColorField label="Sucesso" value={preview.support.success} onChange={(value) => mutate((next) => { next.theme[theme].support.success = value; })} />
                  <ColorField label="Atenção" value={preview.support.warning} onChange={(value) => mutate((next) => { next.theme[theme].support.warning = value; })} />
                  <ColorField label="Erro" value={preview.support.danger} onChange={(value) => mutate((next) => { next.theme[theme].support.danger = value; })} />
                </div>
              </section>
            </div>
          ) : null}

          {section === "layout" ? (
            <div className="mt-7 space-y-8">
              <section className="space-y-4">
                <GroupTitle description="Use zero para cantos retos em toda a interface.">Formato dos cantos</GroupTitle>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {(["sm", "md", "lg", "pill"] as const).map((key) => <NumberField key={key} label={{ sm: "Pequeno", md: "Médio", lg: "Grande", pill: "Cápsula" }[key]} value={draft.layout.borderRadius[key]} onChange={(value) => mutate((next) => { next.layout.borderRadius[key] = value; })} />)}
                </div>
              </section>
              <section className="space-y-4">
                <GroupTitle description="Defina uma progressão consistente para margens e preenchimentos.">Escala de espaçamento</GroupTitle>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {(["xs", "sm", "md", "lg", "xl"] as const).map((key) => <NumberField key={key} label={{ xs: "Mínimo", sm: "Pequeno", md: "Médio", lg: "Grande", xl: "Máximo" }[key]} value={draft.layout.spacing[key]} onChange={(value) => mutate((next) => { next.layout.spacing[key] = value; })} />)}
                </div>
              </section>
              <section className="space-y-4">
                <GroupTitle>Área útil</GroupTitle>
                <NumberField label="Largura máxima do conteúdo" value={draft.layout.containerWidth} min={640} max={2400} onChange={(value) => mutate((next) => { next.layout.containerWidth = value; })} />
              </section>
            </div>
          ) : null}

          {section === "components" ? (
            <div className="mt-7 space-y-5">
              {(["button", "input", "card", "modal"] as const).map((kind) => (
                <section key={kind} className="border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                  <GroupTitle>{componentTitles[kind]}</GroupTitle>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(draft.components[kind]).map(([key, value]) => typeof value === "number" ? (
                      <NumberField key={key} label={propertyLabels[key] ?? key} value={value} suffix={key === "fontWeight" ? "" : "px"} onChange={(nextValue) => mutate((next) => { (next.components[kind] as Record<string, string | number>)[key] = nextValue; })} />
                    ) : (
                      <Field key={key} label={propertyLabels[key] ?? key}><input className={inputClass} value={value} onChange={(event) => mutate((next) => { (next.components[kind] as Record<string, string | number>)[key] = event.target.value; })} /></Field>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}

          {section === "reports" ? (
            <div className="mt-7 space-y-8">
              <section className="space-y-4">
                <GroupTitle description="Este padrão é aplicado a comprovantes e relatórios gerados pelo sistema.">Identidade dos arquivos</GroupTitle>
                <div className="grid gap-5 md:grid-cols-2">
                  <ColorField label="Cor principal" value={draft.reports.primaryColor} onChange={(value) => mutate((next) => { next.reports.primaryColor = value; })} />
                  <ColorField label="Cor de destaque" value={draft.reports.accentColor} onChange={(value) => mutate((next) => { next.reports.accentColor = value; })} />
                  <Field label="Fundo do cabeçalho"><input className={inputClass} value={draft.reports.headerBackground} onChange={(event) => mutate((next) => { next.reports.headerBackground = event.target.value; })} /></Field>
                  <Field label="Fonte dos documentos"><input className={inputClass} value={draft.reports.fontFamily} onChange={(event) => mutate((next) => { next.reports.fontFamily = event.target.value; })} /></Field>
                  <Field label="Texto da marca d'água"><input className={inputClass} value={draft.reports.watermarkText} onChange={(event) => mutate((next) => { next.reports.watermarkText = event.target.value; })} /></Field>
                  <NumberField label="Opacidade da marca d'água" value={draft.reports.watermarkOpacity} min={0} max={1} step={0.05} suffix="×" onChange={(value) => mutate((next) => { next.reports.watermarkOpacity = value; })} />
                </div>
              </section>
            </div>
          ) : null}
        </main>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-900 dark:text-white">Prévia</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Resultado aproximado</p>
              </div>
              <span className="h-2 w-2 bg-emerald-600" />
            </div>
            <ThemeSelector compact theme={theme} setTheme={setTheme} />
            <div className="border-t border-slate-200 p-4 dark:border-slate-800" style={{ background: preview.tokens.appBackground }}>
              <div className="border p-4" style={{ background: preview.tokens.surface, borderColor: preview.tokens.border, color: preview.tokens.textBase, boxShadow: preview.tokens.cardShadow }}>
                <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: preview.tokens.border }}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden" style={{ background: preview.palette.primary["500"] }}>
                    {draft.branding.logoLightUrl ? <img src={theme === "dark" ? draft.branding.logoDarkUrl || draft.branding.logoLightUrl : draft.branding.logoLightUrl} alt="Logo configurada" className="h-full w-full object-contain" /> : <span className="text-xs font-bold text-white">CI</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold" style={{ fontFamily: draft.branding.headingFontFamily }}>Evento Ipitinga</p>
                    <p className="text-[11px]" style={{ color: preview.tokens.textMuted }}>Painel administrativo</p>
                  </div>
                </div>
                <div className="py-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: preview.tokens.accent }}>Visão geral</p>
                  <p className="mt-2 text-lg font-bold" style={{ fontFamily: draft.branding.headingFontFamily }}>Resumo do evento</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: preview.tokens.textMuted }}>Uma amostra das cores, fontes, bordas e espaçamentos escolhidos.</p>
                </div>
                <button type="button" className="w-full border py-2.5 text-xs font-bold text-white" style={{ background: preview.palette.primary["500"], borderColor: preview.palette.primary["600"], borderRadius: draft.components.button.borderRadius }}>Continuar</button>
              </div>
            </div>
          </section>
          <div className="border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
            A prévia não altera o sistema imediatamente. Use <strong>Publicar alterações</strong> para disponibilizar a nova configuração.
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-300 bg-white/95 px-3 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 md:left-20">
        <div className="mx-auto flex max-w-[1900px] flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {feedback ? (
              <p className={cn("flex items-center gap-2 text-sm font-semibold", feedback.kind === "success" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                <CheckCircleIcon className="h-5 w-5 shrink-0" />
                <span className="truncate">{feedback.message}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">{dirty ? "Existem alterações que ainda não foram publicadas." : "Todas as configurações estão atualizadas."}</p>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={reset} disabled={!dirty || saving} className="inline-flex h-10 items-center gap-2 rounded-none border border-slate-300 px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-4">
              <ArrowPathIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Descartar</span>
            </button>
            <button type="button" onClick={save} disabled={!dirty || saving} className="inline-flex h-10 items-center gap-2 rounded-none bg-emerald-700 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:px-5">
              <CloudArrowUpIcon className="h-4 w-4" />
              {saving ? "Publicando..." : "Publicar alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ThemeSelector = ({ theme, setTheme, compact = false }: { theme: ThemeKey; setTheme: (theme: ThemeKey) => void; compact?: boolean }) => (
  <div className={cn("grid grid-cols-2 border border-slate-200 dark:border-slate-700", compact ? "m-4" : "max-w-md")}>
    {(["light", "dark"] as ThemeKey[]).map((key) => {
      const active = theme === key;
      const Icon = key === "light" ? SunIcon : MoonIcon;
      return (
        <button key={key} type="button" onClick={() => setTheme(key)} className={cn("flex h-10 items-center justify-center gap-2 text-xs font-bold transition-colors", key === "light" && "border-r border-slate-200 dark:border-slate-700", active ? "bg-emerald-800 text-white dark:bg-emerald-600" : "bg-white text-slate-500 hover:bg-emerald-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-emerald-950/30")}>
          <Icon className="h-4 w-4" />
          Tema {key === "light" ? "claro" : "escuro"}
        </button>
      );
    })}
  </div>
);
