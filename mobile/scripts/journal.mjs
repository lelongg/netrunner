import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "pocket-rig-journal-"));
const out = join(dir, "journal.test.mjs");
try {
  await build({
    entryPoints: [new URL("journal.test.ts", import.meta.url).pathname],
    outfile: out,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["../engine/engine.js"],
    define: { SCRIPTS: JSON.stringify(new URL("./", import.meta.url).href), "import.meta.env.VITE_RELAY_URL": '""', "import.meta.env.VITE_ICE_SERVERS": "undefined", "import.meta.env.PROD": "true" },
    banner: { js: `import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);` },
    plugins: [
      {
        name: "abs",
        setup(b) {
          b.onResolve({ filter: /^\.\.\/engine\/engine\.js$/ }, () => ({ path: new URL("../engine/engine.js", import.meta.url).href, external: true }));
        },
      },
    ],
    logLevel: "warning",
  });
  await import(out);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
