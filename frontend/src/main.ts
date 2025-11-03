import { createApp } from "vue";
import { createPinia } from "pinia";
import { vMaska } from "maska";

import App from "./App.vue";
import { router } from "./router";
import "./styles/tailwind.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.directive("maska", vMaska);

app.mount("#app");
