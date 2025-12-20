import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 3001,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    emptyOutDir: false, // Preserve types directory
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "LocaleEditor",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      // Externalize dependencies that should not be bundled
      external: ["ag-grid-community", "effect", "zod"],
      output: {
        // Provide global variables for externalized deps
        globals: {
          "ag-grid-community": "AGGrid",
          effect: "Effect",
          zod: "Zod",
        },
      },
    },
    // Keep CSS separate (users can import it)
    cssCodeSplit: true,
  },
});
