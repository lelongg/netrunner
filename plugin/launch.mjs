#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const base = (process.env.POCKET_RIG_URL ?? "https://lelongg.github.io/netrunner/").replace(/\/?$/, "/");
const dir = join(process.env.POCKET_RIG_HOME ?? join(homedir(), ".pocket-rig"), "server");
mkdirSync(dir, { recursive: true });

for (const file of ["server.mjs", "engine.mjs"]) {
  const target = join(dir, file);
  try {
    const res = await fetch(new URL(`agent/${file}`, base), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  } catch (e) {
    if (!existsSync(target)) {
      console.error(`pocket-rig: cannot download ${file} from ${base}: ${e.message}`);
      process.exit(1);
    }
  }
}

process.env.POCKET_RIG_URL = base;
await import(pathToFileURL(join(dir, "server.mjs")).href);
