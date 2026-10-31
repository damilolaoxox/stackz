import { defineConfig } from "vite";

// JSX uses the automatic React runtime, picked up from "jsx": "react-jsx" in tsconfig.json.
export default defineConfig({
  server: { port: 5173 },
  build: { target: "es2022", sourcemap: true },
});
