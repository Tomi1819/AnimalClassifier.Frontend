import { resolve } from "node:path";
import { defineConfig } from "vite";

// The ASP.NET Core backend, as configured by the "https" profile in
// AnimalClassifier/Properties/launchSettings.json.
const BACKEND_URL = "https://localhost:7292";

// `secure: false` makes the proxy accept the ASP.NET Core development
// certificate, which is self-signed.
const proxyToBackend = { target: BACKEND_URL, changeOrigin: true, secure: false };

export default defineConfig({
  // Every page is its own entry point; without this only index.html is built.
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        login: resolve(import.meta.dirname, "pages/login.html"),
        register: resolve(import.meta.dirname, "pages/register.html"),
        forgotPassword: resolve(import.meta.dirname, "pages/forgot-password.html"),
        dashboard: resolve(import.meta.dirname, "pages/dashboard.html"),
        search: resolve(import.meta.dirname, "pages/search.html"),
        statistics: resolve(import.meta.dirname, "pages/statistics.html"),
        admin: resolve(import.meta.dirname, "pages/admin.html"),
      },
    },
  },
  server: {
    port: 3000,
    // Proxying keeps API calls same-origin during development, so the browser
    // never applies CORS to them.
    proxy: {
      "/api": proxyToBackend,
      "/uploads": proxyToBackend,
    },
  },
});
