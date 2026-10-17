import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://card-images.netrunnerdb.com",
  "font-src 'self' data:",
  "connect-src 'self' https: wss: http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:*",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

export default defineConfig({
  base: "./",
  plugins: [
    preact(),
    {
      name: "csp",
      apply: "build",
      transformIndexHtml: (html) => html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  ],
  build: { target: "es2020", chunkSizeWarningLimit: 4000 },
  worker: { format: "es" },
});
