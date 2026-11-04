import { useEffect, useState } from "preact/hooks";
import { FX, type Kind } from "../fx/gl";

export const KINDS: Kind[] = ["play", "install", "rez", "use", "score"];
export const KIND_LABEL: Record<Kind, string> = { play: "Play", install: "Install", rez: "Rez", use: "Effect", score: "Score" };

const NOTES = "nsg.fxnotes";
const PASS = "nsg.fxpass";

export type Review = { stars?: number; status?: "ok" | "issue"; note?: string; v?: string };
type Notes = Record<string, Review>;
type Pass = { n: number; prev: Notes };

export const noteKey = (title: string, kind: Kind, dom = false) => `${title} · ${KIND_LABEL[kind]}${dom ? " · no WebGL" : ""}`;

const nameOf = (key: string) => {
  const at = key.lastIndexOf(" · ");
  const kind = KINDS.find((k) => KIND_LABEL[k] === key.slice(at + 3));
  return kind ? (FX[kind][key.slice(0, at)] ?? "") : "";
};

export const reviewed = (r?: Review) => !!r && (!!r.stars || !!r.status || !!r.note?.trim());
const mark = (r?: Review) => (!reviewed(r) ? "" : r!.status === "issue" ? "issue" : r!.status === "ok" ? "ok" : "noted");
const stars = (n?: number) => (n ? `${"★".repeat(n)}${"☆".repeat(5 - n)}` : "");
const summary = (r: Review) => [r.status === "ok" ? "OK" : r.status === "issue" ? "ISSUE" : "", stars(r.stars), r.note?.trim() ?? ""].filter(Boolean).join(" · ");
const line = (k: string, r: Review) => [`- ${k}`, r.v ? `v:${r.v}` : "", r.status === "ok" ? "OK" : r.status === "issue" ? "ISSUE" : "", stars(r.stars), r.note?.trim() ?? ""].filter(Boolean).join(" · ");

function read<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function loadNotes(): Notes {
  const raw = read<Record<string, Review | string>>(NOTES, {});
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" ? { note: v } : v]));
}

function loadPass(): Pass {
  const p = read<Pass | null>(PASS, null);
  return p && typeof p.n === "number" ? { n: p.n, prev: p.prev ?? {} } : { n: 1, prev: {} };
}

export type Reviews = ReturnType<typeof useReviews>;

export function useReviews() {
  const [notes, setNotes] = useState<Notes>(loadNotes);
  const [pass, setPass] = useState<Pass>(loadPass);
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [sent, setSent] = useState("");
  useEffect(() => {
    void Promise.all([import("../fx/gl/versions").then((m) => m.fxVersions()), import("../fx/gl/baseline.json").then((m) => m.default as Record<string, string>)]).then(([cur, base]) => {
      setVersions(cur);
      const stamp = (n: Notes) => Object.fromEntries(Object.entries(n).map(([k, r]) => [k, r.v || !base[nameOf(k)] ? r : { ...r, v: base[nameOf(k)] }]));
      const fixed = stamp(loadNotes());
      const p = loadPass();
      const next = { n: p.n, prev: stamp(p.prev) };
      setNotes(fixed);
      write(NOTES, fixed);
      setPass(next);
      write(PASS, next);
    });
  }, []);
  const filled = Object.entries(notes).filter(([, v]) => reviewed(v));
  const versionOf = (k: string) => versions[nameOf(k)];
  const last = (k: string) => (reviewed(notes[k]) ? notes[k] : pass.prev[k]);
  const changed = (k: string) => {
    const r = last(k);
    const v = versionOf(k);
    return !!r?.v && !!v && r.v !== v;
  };
  const tag = (k: string) => (changed(k) ? "changed" : mark(notes[k]));
  const update = (k: string, patch: Review) => {
    const r = { ...notes[k], ...patch, v: versionOf(k) };
    const next = { ...notes, [k]: r };
    if (!reviewed(r)) delete next[k];
    setNotes(next);
    write(NOTES, next);
  };
  const send = async (keys: string[]) => {
    const stale = keys.filter((k) => changed(k));
    const text = [`FX lab review · pass ${pass.n} (${filled.length} reviewed)`, ...filled.map(([k, v]) => line(k, v)), ...(stale.length ? ["", `Changed since an earlier review, not re-reviewed yet (${stale.length}):`, ...stale.map((k) => `- ${k} · v:${versionOf(k)}`)] : [])].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ text });
        setSent("Shared");
      } else {
        await navigator.clipboard.writeText(text);
        setSent("Copied");
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        setSent("Copied");
      } catch {
        setSent("Copy failed");
      }
    }
    setTimeout(() => setSent(""), 2000);
  };
  const newPass = () => {
    if (!confirm(`Start review pass ${pass.n + 1}? Pass ${pass.n} reviews stay visible as "previous".`)) return;
    const next = { n: pass.n + 1, prev: { ...pass.prev, ...Object.fromEntries(filled) } };
    setPass(next);
    write(PASS, next);
    setNotes({});
    write(NOTES, {});
  };
  const clear = () => {
    if (!confirm(`Delete ${filled.length} reviews?`)) return;
    setNotes({});
    write(NOTES, {});
  };
  return { notes, pass, filled, sent, versionOf, changed, tag, update, send, newPass, clear };
}

export function ReviewBox({ reviews, k, keys }: { reviews: Reviews; k: string; keys: string[] }) {
  const { notes, pass, filled, sent, versionOf, changed, update, send, newPass, clear } = reviews;
  const review = notes[k] ?? {};
  const before = pass.prev[k];
  return (
    <div class="fxgl-note">
      <div class="fxgl-rate">
        <div class="fxgl-stars" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button role="radio" aria-checked={review.stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} class={(review.stars ?? 0) >= n ? "on" : ""} onClick={() => update(k, { stars: review.stars === n ? undefined : n })}>
              ★
            </button>
          ))}
        </div>
        <button class={`fxgl-status ok ${review.status === "ok" ? "on" : ""}`} onClick={() => update(k, { status: review.status === "ok" ? undefined : "ok" })}>
          OK
        </button>
        <button class={`fxgl-status issue ${review.status === "issue" ? "on" : ""}`} onClick={() => update(k, { status: review.status === "issue" ? undefined : "issue" })}>
          Issue
        </button>
      </div>
      <div class="fxgl-review-meta">
        <span>Pass {pass.n}</span>
        {versionOf(k) && <span>v:{versionOf(k)}</span>}
        {changed(k) && <span class="fxgl-changed">Changed since your {reviewed(review) ? "" : "last "}review</span>}
      </div>
      {before && reviewed(before) && !reviewed(review) && (
        <div class="fxgl-prev">
          Previously: {summary(before)}
          {before.v && before.v !== versionOf(k) ? ` (v:${before.v})` : ""}
        </div>
      )}
      <textarea rows={2} placeholder={`Feedback on ${k}`} value={review.note ?? ""} onInput={(e) => update(k, { note: (e.target as HTMLTextAreaElement).value })} />
      <div class="fxgl-note-actions">
        <button class="fxgl-play" disabled={!filled.length} onClick={() => send(keys)}>
          {sent || `Send ${filled.length} review${filled.length === 1 ? "" : "s"}`}
        </button>
        <button disabled={!filled.length} onClick={newPass}>
          New pass
        </button>
        <button disabled={!filled.length} onClick={clear}>
          Clear
        </button>
      </div>
    </div>
  );
}
