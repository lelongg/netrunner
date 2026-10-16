import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../mobile/.env.production", import.meta.url), "utf8")
    .split("\n")
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const out = new URL("../mobile/dist/agent/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [new URL("src/server.ts", import.meta.url).pathname],
  outfile: `${out}server.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: ["./engine.mjs"],
  define: {
    "import.meta.env.VITE_RELAY_URL": JSON.stringify(process.env.VITE_RELAY_URL ?? env.VITE_RELAY_URL ?? ""),
    "import.meta.env.VITE_ICE_SERVERS": "undefined",
    "import.meta.env.PROD": "true",
  },
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "warning",
});
copyFileSync(new URL("../mobile/engine/engine.js", import.meta.url), `${out}engine.mjs`);
copyFileSync(new URL("launch.mjs", import.meta.url), `${out}launch.mjs`);
console.log(`agent built in ${out}`);
