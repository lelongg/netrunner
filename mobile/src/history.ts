import { type SavedGame, saveId } from "./session";

export interface Archived {
  id: string;
  endedAt: number;
  save: SavedGame;
}

const MAX_ARCHIVED = 100;
let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, Archived>();

function open(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open("pocket-rig", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("history", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function request<T>(run: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode = "readonly"): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const req = run(db.transaction("history", mode).objectStore("history"));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export async function listHistory(): Promise<Archived[]> {
  const stored = (await request((s) => s.getAll() as IDBRequest<Archived[]>)) ?? [];
  const all = new Map(stored.map((a) => [a.id, a]));
  for (const [id, a] of memory) if (!all.has(id)) all.set(id, a);
  return [...all.values()].sort((a, b) => b.endedAt - a.endedAt);
}

export async function archive(save: SavedGame) {
  if (!save.summary?.winner) return;
  const id = saveId(save);
  const known = (await request((s) => s.get(id) as IDBRequest<Archived | undefined>)) ?? memory.get(id);
  const entry: Archived = { id, endedAt: known?.endedAt ?? save.savedAt ?? Date.now(), save };
  memory.set(id, entry);
  const saved = await request((s) => s.put(entry), "readwrite");
  if (saved !== undefined) memory.delete(id);
  const all = await listHistory();
  for (const old of all.slice(MAX_ARCHIVED)) await removeHistory(old.id);
}

export async function removeHistory(id: string) {
  memory.delete(id);
  await request((s) => s.delete(id), "readwrite");
}

export async function archiveFinished(saves: SavedGame[]) {
  const known = new Set((await listHistory()).map((a) => a.id));
  for (const save of saves) if (save.summary?.winner && !known.has(saveId(save))) await archive(save);
}
