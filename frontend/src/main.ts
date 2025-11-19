import { createApp } from "vue";
import { createPinia } from "pinia";
import { vMaska } from "maska";

import App from "./App.vue";
import { router } from "./router";
import "./styles/tailwind.css";
import { useSystemConfigStore } from "./stores/system-config";
import { setupAutoUppercase } from "./utils/uppercase";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.directive("maska", vMaska);

const systemConfigStore = useSystemConfigStore();
setupAutoUppercase();
await systemConfigStore.initialize();

app.mount("#app");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((error) => console.warn("Service worker registration failed", error));
  });
}
