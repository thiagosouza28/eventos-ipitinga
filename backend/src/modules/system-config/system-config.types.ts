type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, any> ? DeepPartial<T[K]> : T[K];
};

export const COLOR_SCALE_KEYS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
export type ColorScaleKey = (typeof COLOR_SCALE_KEYS)[number];
export type ColorScale = Record<ColorScaleKey, string>;

export type ThemeProfile = {
  palette: {
    primary: ColorScale;
    neutral: ColorScale;
  };
  tokens: {
    appBackground: string;
    shellBackground: string;
    surface: string;
    surfaceAlt: string;
    blurLayer: string;
    textBase: string;
    textMuted: string;
    border: string;
    accent: string;
    cardShadow: string;
    cardShadowStrong: string;
    gradientAccent: string;
  };
  support: {
    info: string;
    success: string;
    warning: string;
    danger: string;
  };
};

export type SystemConfigSettings = {
  branding: {
    logoLightUrl: string | null;
    logoDarkUrl: string | null;
    fontFamily: string;
    headingFontFamily: string;
  };
  theme: {
    light: ThemeProfile;
    dark: ThemeProfile;
  };
  typography: {
    baseFontSize: number;
    scaleRatio: number;
    bodyLineHeight: number;
    headingLineHeight: number;
    letterSpacing: number;
  };
  layout: {
    borderRadius: {
      sm: number;
      md: number;
      lg: number;
      pill: number;
    };
    spacing: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    containerWidth: number;
  };
  components: {
    button: {
      borderRadius: number;
      paddingX: number;
      paddingY: number;
      fontWeight: number;
      shadow: string;
      borderWidth: number;
    };
    input: {
      borderRadius: number;
      borderWidth: number;
      borderColor: string;
      background: string;
      focusRing: string;
      shadow: string;
    };
    card: {
      borderRadius: number;
      shadow: string;
      borderWidth: number;
    };
    modal: {
      borderRadius: number;
      shadow: string;
      backdrop: string;
      animation: string;
    };
  };
  reports: {
    primaryColor: string;
    headerBackground: string;
    watermarkText: string;
    watermarkOpacity: number;
    fontFamily: string;
    accentColor: string;
  };
};

export type PartialSystemConfigSettings = DeepPartial<SystemConfigSettings>;

const brandBlue: ColorScale = {
  50: "#e8f0ff",
  100: "#d4e4ff",
  200: "#adc4ff",
  300: "#7ea4ff",
  400: "#4e82ff",
  500: "#1f63ff",
  600: "#154ad6",
  700: "#1038a8",
  800: "#0b2778",
  900: "#06174d",
  950: "#030b26"
};

const brandNeutral: ColorScale = {
  50: "#f8f9ff",
  100: "#f1f2f8",
  200: "#e2e4ef",
  300: "#c9cddd",
  400: "#a2a8c0",
  500: "#7c829b",
  600: "#595f78",
  700: "#3d4154",
  800: "#222838",
  900: "#101321",
  950: "#070914"
};

const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const deepMerge = <T>(target: T, source?: DeepPartial<T>): T => {
  if (!source) {
    return target;
  }
  const output: any = Array.isArray(target) ? [...(target as any)] : { ...(target as any) };
  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = deepMerge(output[key] ?? {}, value as any);
      return;
    }
    output[key] = Array.isArray(value) ? [...value] : value;
  });
  return output;
};

const buildTheme = (overrides?: DeepPartial<ThemeProfile>): ThemeProfile => {
  const base: ThemeProfile = {
    palette: {
      primary: brandBlue,
      neutral: brandNeutral
    },
    tokens: {
      appBackground:
        "radial-gradient(circle at 15% 15%, #eef2ff 0%, transparent 45%), linear-gradient(180deg, #fdfcff 0%, #f5f5ff 100%)",
      shellBackground: "rgba(255, 255, 255, 0.9)",
      surface: "rgba(255, 255, 255, 0.95)",
      surfaceAlt: "rgba(255, 255, 255, 0.75)",
      blurLayer: "rgba(255, 255, 255, 0.85)",
      textBase: "#0f172a",
      textMuted: "#475569",
      border: "rgba(15, 23, 42, 0.08)",
      accent: "#1f63ff",
      cardShadow: "0 25px 60px -35px rgba(15, 23, 42, 0.45)",
      cardShadowStrong: "0 40px 80px -45px rgba(59, 130, 246, 0.25)",
      gradientAccent: "linear-gradient(135deg, #1f63ff, #0f2a69)"
    },
    support: {
      info: "#0284c7",
      success: "#22c55e",
      warning: "#fbbf24",
      danger: "#f87171"
    }
  };
  if (!overrides) {
    return base;
  }
  return deepMerge(base, overrides);
};

export const DEFAULT_SYSTEM_CONFIG: SystemConfigSettings = {
  branding: {
    logoLightUrl: null,
    logoDarkUrl: null,
    fontFamily: '"Inter", "system-ui", sans-serif',
    headingFontFamily: '"Poppins", "Inter", "system-ui", sans-serif'
  },
  theme: {
    light: buildTheme(),
    dark: buildTheme({
      tokens: {
        appBackground:
          "radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.15), transparent 45%), linear-gradient(180deg, #05060b 0%, #050914 35%, #020409 100%)",
        shellBackground: "rgba(8, 10, 18, 0.9)",
        surface: "rgba(15, 23, 42, 0.85)",
        surfaceAlt: "rgba(13, 19, 33, 0.65)",
        blurLayer: "rgba(6, 8, 15, 0.85)",
        textBase: "#f8fafc",
        textMuted: "#94a3b8",
        border: "rgba(255, 255, 255, 0.08)",
        cardShadow: "0 35px 110px -60px rgba(15, 23, 42, 0.95)",
        cardShadowStrong: "0 45px 110px -60px rgba(14, 165, 233, 0.35)",
        accent: "#7dc4ff",
        gradientAccent: "linear-gradient(135deg, #5a8dee, #1d2b64)"
      },
      support: {
        info: "#3abff8",
        success: "#34d399",
        warning: "#facc15",
        danger: "#fb7185"
      }
    })
  },
  typography: {
    baseFontSize: 16,
    scaleRatio: 1.25,
    bodyLineHeight: 1.6,
    headingLineHeight: 1.2,
    letterSpacing: 0
  },
  layout: {
    borderRadius: {
      sm: 8,
      md: 16,
      lg: 26,
      pill: 999
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32
    },
    containerWidth: 1900
  },
  components: {
    button: {
      borderRadius: 999,
      paddingX: 18,
      paddingY: 10,
      fontWeight: 600,
      shadow: "0 18px 40px -20px rgba(15, 23, 42, 0.45)",
      borderWidth: 1
    },
    input: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(15, 23, 42, 0.08)",
      background: "rgba(255, 255, 255, 0.9)",
      focusRing: "0 0 0 3px rgba(31, 99, 255, 0.15)",
      shadow: "0 6px 18px rgba(15, 23, 42, 0.08)"
    },
    card: {
      borderRadius: 24,
      shadow: "0 45px 120px -60px rgba(15, 23, 42, 0.35)",
      borderWidth: 1
    },
    modal: {
      borderRadius: 28,
      shadow: "0 40px 160px rgba(2, 6, 23, 0.55)",
      backdrop: "rgba(0, 0, 0, 0.45)",
      animation: "cubic-bezier(0.16, 1, 0.3, 1)"
    }
  },
  reports: {
    primaryColor: "#1f63ff",
    headerBackground: "#0f172a",
    watermarkText: "CATRE",
    watermarkOpacity: 0.08,
    fontFamily: '"Inter", "system-ui", sans-serif',
    accentColor: "#0ea5e9"
  }
};

export const mergeSystemConfig = (
  current?: unknown,
  overrides?: PartialSystemConfigSettings
): SystemConfigSettings => {
  const base = cloneDeep(DEFAULT_SYSTEM_CONFIG);
  if (current && typeof current === "object") {
    deepMerge(base as any, current as Record<string, unknown>);
  }
  if (overrides) {
    deepMerge(base as any, overrides);
  }
  return base;
};
