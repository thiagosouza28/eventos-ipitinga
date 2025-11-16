import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

const normalizeBaseUrl = (value?: string) => (value ? value.replace(/\/+$/, "") : undefined);

const ensureBackendEnv = (mode: string) => {
  const backendEnvDir = resolve(__dirname, "../backend");
  const backendEnv = loadEnv(mode, backendEnvDir, "");
  if (!process.env.VITE_API_URL) {
    const normalizedApiUrl = normalizeBaseUrl(backendEnv.API_URL);
    if (normalizedApiUrl) {
      process.env.VITE_API_URL = normalizedApiUrl;
    } else if (backendEnv.APP_URL) {
      const normalizedAppUrl = normalizeBaseUrl(backendEnv.APP_URL);
      const inferredApiUrl = normalizedAppUrl ? `${normalizedAppUrl}/api` : undefined;
      if (inferredApiUrl) {
        process.env.VITE_API_URL = inferredApiUrl;
      }
    } else if (backendEnv.PORT) {
      process.env.VITE_API_URL = `http://localhost:${backendEnv.PORT}/api`;
    }
  }

  if (!process.env.VITE_APP_URL && backendEnv.APP_URL) {
    process.env.VITE_APP_URL = backendEnv.APP_URL;
  }
};

export default defineConfig(({ mode }) => {
  ensureBackendEnv(mode);
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [vue()],
    server: {
      port: Number(env.VITE_DEV_SERVER_PORT || process.env.VITE_DEV_SERVER_PORT) || 5173
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src")
      }
    },
    build: {
      target: "es2015",
      minify: "terser",
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "vue-vendor": ["vue", "vue-router", "pinia"],
            ui: ["@headlessui/vue", "@heroicons/vue"]
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096,
      reportCompressedSize: true
    }
  };
});
