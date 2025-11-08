const brandBlue = {
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

const brandNeutral = {
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

module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      colors: {
        primary: brandBlue,
        neutral: brandNeutral
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
