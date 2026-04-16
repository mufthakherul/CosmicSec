import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.ANALYZE === "true"
      ? [visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true })]
      : []),
  ],
  server: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    coverage: {
      enabled: false,
      reporter: ["text", "html"],
      exclude: ["node_modules/", "src/test/"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
