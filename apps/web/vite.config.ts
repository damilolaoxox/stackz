import { defineConfig } from "vite";

// JSX uses the automatic React runtime, picked up from "jsx": "react-jsx" in tsconfig.json.
export default defineConfig({
  // strictPort: the API only allows this origin (ALLOWED_ORIGINS), so fail loudly
  // instead of silently moving to 5174 and getting CORS errors.
  server: { port: 5173, strictPort: true },
  // Plain CSS, no PostCSS. An inline (empty) config stops Vite from picking up a stray
  // postcss.config.* from a parent folder, e.g. the user's home directory.
  css: { postcss: {} },
  build: { target: "es2022", sourcemap: true },
});
