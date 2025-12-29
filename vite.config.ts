import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { resolve } from "path";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve";

  // 개발 모드: 앱으로 실행
  if (isDev) {
    return {
      plugins: [tailwindcss()],
      server: {
        port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
      },
      resolve: {
        alias: {
          "@": resolve(__dirname, "./src"),
        },
      },
    };
  }

  // 빌드 모드: 라이브러리로 빌드
  const analyze = process.env.ANALYZE === "true";

  return {
    plugins: [
      tailwindcss(),
      analyze &&
        visualizer({
          filename: "dist/stats.html",
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),
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
        external: ["effect", "zod", "fuse.js"],
        output: {
          // Provide global variables for externalized deps
          globals: {
            effect: "Effect",
            zod: "Zod",
            "fuse.js": "Fuse",
          },
        },
      },
      // Keep CSS separate (users can import it)
      cssCodeSplit: true,
    },
  };
});
