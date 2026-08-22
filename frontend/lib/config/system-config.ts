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

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, any> ? DeepPartial<T[K]> : T[K];
};

const brandGreen: ColorScale = {
  50: "#ecfdf3",
  100: "#d1fae2",
  200: "#a6f3c6",
  300: "#6ce7a2",
  400: "#32cf77",
  500: "#009249",
  600: "#00773d",
  700: "#006033",
  800: "#054c2b",
  900: "#063f26",
  950: "#022315"
};

const brandNeutral: ColorScale = {
  50: "#f8faf7",
  100: "#f1f4ef",
  200: "#e0e5de",
  300: "#c7cfc6",
  400: "#9aa69d",
  500: "#6b7970",
  600: "#4e5c53",
  700: "#38453d",
  800: "#233028",
  900: "#183328",
  950: "#091b13"
};

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const deepMerge = <T>(target: T, source?: DeepPartial<T>): T => {
  if (!source) return target;
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
      primary: brandGreen,
      neutral: brandNeutral
    },
    tokens: {
      appBackground: "#f7f8f4",
      shellBackground: "rgba(255, 255, 252, 0.92)",
      surface: "#fffefa",
      surfaceAlt: "#f1f4ed",
      blurLayer: "rgba(255, 255, 252, 0.88)",
      textBase: "#183328",
      textMuted: "#64736b",
      border: "#dfe6df",
      accent: "#eab308",
      cardShadow: "0 1px 2px rgba(20, 48, 35, 0.04), 0 14px 40px rgba(20, 48, 35, 0.07)",
      cardShadowStrong: "0 26px 70px rgba(8, 62, 35, 0.14)",
      gradientAccent: "linear-gradient(135deg, #00773d 0%, #009249 56%, #16a65d 100%)"
    },
    support: {
      info: "#0284c7",
      success: "#009249",
      warning: "#eab308",
      danger: "#dc2626"
    }
  };
  if (!overrides) return base;
  return deepMerge(base, overrides);
};

export const defaultSystemConfig: SystemConfigSettings = {
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
        appBackground: "#07130e",
        shellBackground: "rgba(9, 29, 20, 0.92)",
        surface: "#0d2017",
        surfaceAlt: "#12291d",
        blurLayer: "rgba(9, 28, 19, 0.9)",
        textBase: "#f4fbf6",
        textMuted: "#a8b8ad",
        border: "#284237",
        cardShadow: "0 18px 50px rgba(0, 0, 0, 0.26)",
        cardShadowStrong: "0 28px 80px rgba(0, 0, 0, 0.38)",
        accent: "#facc15",
        gradientAccent: "linear-gradient(135deg, #064e2f, #00773d)"
      },
      support: {
        info: "#38bdf8",
        success: "#34d378",
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
      sm: 10,
      md: 14,
      lg: 22,
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
      borderRadius: 12,
      paddingX: 18,
      paddingY: 10,
      fontWeight: 600,
      shadow: "0 10px 24px rgba(0, 119, 61, 0.18)",
      borderWidth: 1
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#ccd7cf",
      background: "#ffffff",
      focusRing: "0 0 0 4px rgba(0, 146, 73, 0.13)",
      shadow: "0 1px 2px rgba(15, 23, 42, 0.03)"
    },
    card: {
      borderRadius: 20,
      shadow: "0 1px 2px rgba(20, 48, 35, 0.04), 0 14px 40px rgba(20, 48, 35, 0.07)",
      borderWidth: 1
    },
    modal: {
      borderRadius: 22,
      shadow: "0 30px 90px rgba(5, 28, 17, 0.28)",
      backdrop: "rgba(0, 0, 0, 0.45)",
      animation: "cubic-bezier(0.16, 1, 0.3, 1)"
    }
  },
  reports: {
    primaryColor: "#009249",
    headerBackground: "#063f26",
    watermarkText: "CATRE",
    watermarkOpacity: 0.08,
    fontFamily: '"Inter", "system-ui", sans-serif',
    accentColor: "#eab308"
  }
};

export type SystemConfigResponse = {
  id: string;
  updatedAt: string;
  updatedBy?: { id: string; name: string; email: string } | null;
  settings: SystemConfigSettings;
};

export const mergeSystemConfig = (
  current?: unknown,
  overrides?: PartialSystemConfigSettings
): SystemConfigSettings => {
  const base = deepClone(defaultSystemConfig);
  if (current && typeof current === "object") {
    deepMerge(base as any, current as Record<string, unknown>);
  }
  if (overrides) {
    deepMerge(base as any, overrides);
  }
  return base;
};
