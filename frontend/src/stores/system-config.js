import axios from "axios";
import { defineStore } from "pinia";
import { COLOR_SCALE_KEYS, defaultSystemConfig, mergeSystemConfig } from "../config/systemConfig";
import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "./auth";
const STYLE_NODE_ID = "catre-system-config-theme";
const ensureStyleNode = () => {
    if (typeof document === "undefined")
        return null;
    let node = document.getElementById(STYLE_NODE_ID);
    if (!node) {
        node = document.createElement("style");
        node.id = STYLE_NODE_ID;
        document.head.appendChild(node);
    }
    return node;
};
const hexToRgb = (value) => {
    const normalized = value.replace("#", "");
    const chunk = normalized.length === 3 ? normalized.split("").map((c) => c + c) : normalized.match(/.{2}/g);
    if (!chunk)
        return "255 255 255";
    const [r, g, b] = chunk.map((c) => Number.parseInt(c, 16));
    return `${r} ${g} ${b}`;
};
const toRgbTuple = (value) => {
    if (!value)
        return "0 0 0";
    const trimmed = value.trim();
    if (trimmed.startsWith("#")) {
        return hexToRgb(trimmed);
    }
    if (trimmed.startsWith("rgb")) {
        const numbers = trimmed.replace(/[^\d.,]/g, "").split(",");
        if (numbers.length >= 3) {
            return numbers
                .slice(0, 3)
                .map((n) => Number.parseFloat(n).toString())
                .join(" ");
        }
    }
    return trimmed;
};
const buildThemeCss = (selector, profile) => {
    const primaryBase = toRgbTuple(profile.palette.primary["500"]);
    const primaryHover = toRgbTuple(profile.palette.primary["600"]);
    const lines = [
        `--app-bg: ${profile.tokens.appBackground};`,
        `--background: ${profile.tokens.appBackground};`,
        `--app-shell-bg: ${profile.tokens.shellBackground};`,
        `--surface-card: ${profile.tokens.surface};`,
        `--card: ${profile.tokens.surface};`,
        `--surface-card-alt: ${profile.tokens.surfaceAlt};`,
        `--surface-blur: ${profile.tokens.blurLayer};`,
        `--text-base: ${profile.tokens.textBase};`,
        `--text: ${profile.tokens.textBase};`,
        `--text-muted: ${profile.tokens.textMuted};`,
        `--border-card: ${profile.tokens.border};`,
        `--border: ${profile.tokens.border};`,
        `--accent-color: ${profile.tokens.accent};`,
        `--primary-rgb: ${primaryBase};`,
        `--primary: rgb(${primaryBase});`,
        `--primary-hover: rgb(${primaryHover});`,
        `--card-shadow: ${profile.tokens.cardShadow};`,
        `--card-shadow-strong: ${profile.tokens.cardShadowStrong};`,
        `--hero-gradient: ${profile.tokens.gradientAccent};`,
        `--support-info: ${toRgbTuple(profile.support.info)};`,
        `--support-success: ${toRgbTuple(profile.support.success)};`,
        `--support-warning: ${toRgbTuple(profile.support.warning)};`,
        `--support-danger: ${toRgbTuple(profile.support.danger)};`
    ];
    COLOR_SCALE_KEYS.forEach((shade) => {
        lines.push(`--palette-primary-${shade}: ${toRgbTuple(profile.palette.primary[shade])};`);
        lines.push(`--palette-neutral-${shade}: ${toRgbTuple(profile.palette.neutral[shade])};`);
    });
    return `${selector} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;
};
const buildGeneralCss = (config) => {
    const { branding, typography, layout, components, reports } = config;
    const lines = [
        `--font-sans: ${branding.fontFamily};`,
        `--font-family: ${branding.fontFamily};`,
        `--font-heading: ${branding.headingFontFamily};`,
        `--font-size-base: ${typography.baseFontSize}px;`,
        `--font-scale-ratio: ${typography.scaleRatio};`,
        `--font-body-line-height: ${typography.bodyLineHeight};`,
        `--font-heading-line-height: ${typography.headingLineHeight};`,
        `--font-letter-spacing: ${typography.letterSpacing}px;`,
        `--radius-sm: ${layout.borderRadius.sm}px;`,
        `--radius-md: ${layout.borderRadius.md}px;`,
        `--radius-lg: ${layout.borderRadius.lg}px;`,
        `--radius-pill: ${layout.borderRadius.pill}px;`,
        `--radius: ${layout.borderRadius.md}px;`,
        `--spacing-xs: ${layout.spacing.xs}px;`,
        `--spacing-sm: ${layout.spacing.sm}px;`,
        `--spacing-md: ${layout.spacing.md}px;`,
        `--spacing-lg: ${layout.spacing.lg}px;`,
        `--spacing-xl: ${layout.spacing.xl}px;`,
        `--spacing-base: ${layout.spacing.md}px;`,
        `--container-width: ${layout.containerWidth}px;`,
        `--button-radius: ${components.button.borderRadius}px;`,
        `--button-shadow: ${components.button.shadow};`,
        `--button-padding-x: ${components.button.paddingX}px;`,
        `--button-padding-y: ${components.button.paddingY}px;`,
        `--button-font-weight: ${components.button.fontWeight};`,
        `--button-border-width: ${components.button.borderWidth}px;`,
        `--input-radius: ${components.input.borderRadius}px;`,
        `--input-border-width: ${components.input.borderWidth}px;`,
        `--input-border-color: ${components.input.borderColor};`,
        `--input-bg: ${components.input.background};`,
        `--input-focus-ring: ${components.input.focusRing};`,
        `--input-shadow: ${components.input.shadow};`,
        `--card-radius: ${components.card.borderRadius}px;`,
        `--card-border-width: ${components.card.borderWidth}px;`,
        `--modal-radius: ${components.modal.borderRadius}px;`,
        `--modal-shadow: ${components.modal.shadow};`,
        `--modal-backdrop: ${components.modal.backdrop};`,
        `--modal-animation: ${components.modal.animation};`,
        `--report-primary-color: ${reports.primaryColor};`,
        `--report-accent-color: ${reports.accentColor};`,
        `--report-header-bg: ${reports.headerBackground};`,
        `--report-font-family: ${reports.fontFamily};`,
        `--report-watermark-text: "${reports.watermarkText}";`,
        `--report-watermark-opacity: ${reports.watermarkOpacity};`
    ];
    return `:root {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;
};
const applyCssVariables = (config) => {
    const styleNode = ensureStyleNode();
    if (!styleNode)
        return;
    const general = buildGeneralCss(config);
    const light = buildThemeCss(":root", config.theme.light);
    const dark = buildThemeCss(".dark", config.theme.dark);
    styleNode.textContent = `${general}\n${light}\n${dark}`;
};
const resolveSettingsPayload = (payload) => {
    if (payload && typeof payload === "object" && "settings" in payload) {
        const data = payload;
        return mergeSystemConfig(data.settings);
    }
    return mergeSystemConfig(payload);
};
export const useSystemConfigStore = defineStore("systemConfig", {
    state: () => ({
        config: defaultSystemConfig,
        loading: false,
        initialized: false,
        error: null
    }),
    actions: {
        setConfig(payload) {
            this.config = resolveSettingsPayload(payload ?? defaultSystemConfig);
            applyCssVariables(this.config);
        },
        async initialize(force = false) {
            if (this.initialized && !force) {
                applyCssVariables(this.config);
                return;
            }
            this.loading = true;
            try {
                const response = await axios.get(`${API_BASE_URL}/system/config`, {
                    timeout: 8000
                });
                this.setConfig(response.data);
                this.error = null;
            }
            catch (error) {
                console.warn("Falha ao carregar configurações do sistema", error);
                this.error = "Não foi possível carregar configurações. Usando padrão.";
                this.setConfig(defaultSystemConfig);
            }
            finally {
                this.loading = false;
                this.initialized = true;
            }
        },
        async refresh() {
            return this.initialize(true);
        },
        async saveConfig(payload) {
            const auth = useAuthStore();
            const headers = {};
            if (auth.token) {
                headers.Authorization = `Bearer ${auth.token}`;
            }
            const normalizedPayload = JSON.parse(JSON.stringify(payload));
            const response = await axios.put(`${API_BASE_URL}/admin/system/config`, normalizedPayload, {
                headers: {
                    "Content-Type": "application/json",
                    ...headers
                }
            });
            this.setConfig(response.data);
        }
    }
});
//# sourceMappingURL=system-config.js.map