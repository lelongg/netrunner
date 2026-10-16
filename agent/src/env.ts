import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const home = process.env.POCKET_RIG_HOME ?? join(homedir(), ".pocket-rig");
mkdirSync(home, { recursive: true });
const file = join(home, "storage.json");

let data: Record<string, string> = {};
try {
  data = JSON.parse(readFileSync(file, "utf8"));
} catch {}

const save = () => writeFileSync(file, JSON.stringify(data));

const storage = {
  get length() {
    return Object.keys(data).length;
  },
  key: (i: number) => Object.keys(data)[i] ?? null,
  getItem: (k: string) => (k in data ? data[k] : null),
  setItem: (k: string, v: string) => {
    data[k] = String(v);
    save();
  },
  removeItem: (k: string) => {
    delete data[k];
    save();
  },
  clear: () => {
    data = {};
    save();
  },
};

for (const level of ["log", "info", "warn", "debug"] as const) console[level] = console.error;

const g = globalThis as any;
g.window ??= g;
g.location ??= new URL(process.env.POCKET_RIG_URL ?? "https://lelongg.github.io/netrunner/");
g.addEventListener ??= () => {};
g.removeEventListener ??= () => {};
g.localStorage = storage;
g.sessionStorage ??= storage;
g.document ??= { visibilityState: "visible", addEventListener() {}, removeEventListener() {}, baseURI: "file:///" };
