import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { initializeLocale } from "./i18n";
import { detectDesktopPlatform } from "./utils/platform";

import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/animations.css";

// Platform marker must exist before first paint so the shell chrome
// (traffic-light spacer vs caption buttons) never flashes the wrong layout.
document.documentElement.dataset.platform = detectDesktopPlatform();

const app = createApp(App);
initializeLocale();
app.use(createPinia());
app.use(router);
app.mount("#app");
