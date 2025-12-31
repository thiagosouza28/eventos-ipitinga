import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

const normalizeBaseUrl = (value?: string) => (value ? value.replace(/\/+$/, "") : undefined);

const resolveEnvValue = (key: string, env: Record<string, string>) => env[key] ?? process.env[key];

const ensureBackendEnv = (mode: string, frontendEnv: Record<string, string>) => {
  const backendEnvDir = resolve(__dirname, "../backend");
  const backendEnv = loadEnv(mode, backendEnvDir, "");
  const existingApiUrl = resolveEnvValue("VITE_API_URL", frontendEnv);
  if (!existingApiUrl) {
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

  const existingAppUrl = resolveEnvValue("VITE_APP_URL", frontendEnv);
  if (!existingAppUrl && backendEnv.APP_URL) {
    process.env.VITE_APP_URL = backendEnv.APP_URL;
  }
};

export default defineConfig(({ mode }) => {
  const frontendEnv = loadEnv(mode, process.cwd(), "");
  ensureBackendEnv(mode, frontendEnv);
  const env = { ...frontendEnv, ...process.env };

  return {
    plugins: [vue()],
    server: {
      host: "0.0.0.0",
      port: Number(env.VITE_DEV_SERVER_PORT || process.env.VITE_DEV_SERVER_PORT) || 5173,
      strictPort: true,
      hmr: {
        host: env.VITE_DEV_SERVER_HOST || "localhost",
        port: Number(env.VITE_DEV_SERVER_PORT || process.env.VITE_DEV_SERVER_PORT) || 5173,
        protocol: "ws"
      }
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src")
      },
      extensions: [".mjs", ".ts", ".js", ".jsx", ".tsx", ".json"]
    },
    optimizeDeps: {
      exclude: ["pdfjs-dist"]
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
