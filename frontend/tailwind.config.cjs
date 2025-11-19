const COLOR_SCALE_KEYS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

const withOpacityValue = (variable) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variable}) / ${opacityValue})`;
    }
    return `rgb(var(${variable}))`;
  };
};

const buildPalette = (prefix) =>
  COLOR_SCALE_KEYS.reduce((acc, shade) => {
    acc[shade] = withOpacityValue(`${prefix}${shade}`);
    return acc;
  }, {});

module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      colors: {
        primary: buildPalette("--palette-primary-"),
        neutral: buildPalette("--palette-neutral-"),
        info: withOpacityValue("--support-info"),
        success: withOpacityValue("--support-success"),
        warning: withOpacityValue("--support-warning"),
        danger: withOpacityValue("--support-danger")
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"]
      },
      borderRadius: {
        none: "0px",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "calc(var(--radius-lg) + 8px)",
        "2xl": "calc(var(--radius-lg) + 16px)",
        "3xl": "calc(var(--radius-lg) + 24px)",
        full: "var(--radius-pill)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
