import { useEffect, useRef, useState } from "preact/hooks";
import { INSTALL, PLAY, REZ, SCORE } from "../fx/signatures";
import { FX, type Kind, glEffect } from "../fx/gl";
import { setAim } from "../fx/gl/aim";
import { setFxSpeed } from "../fx/gl/stage";

const CODES: Record<string, string> = {
  "Sure Gamble": "30030",
  "Hedge Fund": "30075",
  Overclock: "30029",
  "Creative Commission": "30020",
  "Petty Cash": "35081",
  "Predictive Planogram": "30056",
  Jailbreak: "30028",
  Ritual: "35026",
  "Pinhole Threading": "33013",
  "Mutual Favor": "30011",
  "Clean Getaway": "35014",
  "DZMZ Optimizer": "30022",
  Fermenter: "30007",
  "Rising Tide": "35009",
  Echelon: "30025",
  Carmen: "30015",
  "Docklands Pass": "30013",
  "Spin Doctor": "30053",
  Ping: "30055",
  Flyswatter: "35079",
  "Transfer of Wealth": "35017",
  "Daily Casts": "26094",
  "Measured Response": "35078",
  "Event Horizon": "36058",
  Botulus: "30004",
  "Key Performance Indicators": "35077",
  Pharos: "30063",
  Unity: "30026",
  "Seamless Launch": "30040",
  Sleipnir: "36030",
  Conduit: "30024",
  "Humanoid Resources": "35039",
  "Hansei Review": "30048",
  Gourmand: "35007",
  Touchstone: "36021",
  "Wildcat Strike": "30002",
  Tocsin: "36060",
  "Telework Contract": "30027",
  "Nihilo Agent": "36049",
  "Semak-samun": "35054",
  "Government Subsidy": "30064",
  "Verbal Plasticity": "30034",
  "Anthill Excavation Contract": "35072",
  "The Tungsten Tailor": "36003",
  "Byte!": "35050",
  "Bigger Picture": "35065",
  "Top-Down Solutions": "35044",
  "Bumi 1.0": "35041",
  Buzzsaw: "30005",
  Myoshu: "36061",
  Biawak: "35074",
  "Self-modifying Code": "26090",
  Funhouse: "30054",
  "Bran 1.0": "30039",
  "Reanimation Protocol": "36062",
  Principia: "35032",
  "Manegarm Skunkworks": "30042",
  Doomscroll: "35063",
  "Tread Lightly": "30012",
  Azimat: "35029",
  "Lie Low": "35015",
  Whitespace: "30074",
  "Phat Gioan Baotixita": "35051",
  "Devadatta Drone": "35031",
  "Open Market": "35022",
  "Smartware Distributor": "30033",
  Unleash: "36044",
  "Public Trail": "30057",
  Syailendra: "35076",
  "Rent Rioters": "35011",
  "Sang Kancil": "35020",
  Tailgate: "36012",
  "Flood the Market": "36053",
  Flywheel: "36059",
  Kessleroid: "35075",
  "Public Access Plaza": "35062",
  Retribution: "30065",
  "Beta Build": "36019",
  Scrounge: "35004",
  Chromatophores: "35030",
  Pennyshaver: "30014",
  Mayfly: "30032",
  Lethe: "36051",
  Idiosyncresis: "35061",
  Stowaway: "36024",
  "Malapert Data Vault": "30066",
  "Vulture Fund": "36063",
  Synchrocyclotron: "36027",
  "Scatter Field": "35042",
  Cultivate: "36043",
  VRcation: "30021",
  Cookbook: "30009",
  "Nico Campaign": "30037",
  "Mercia B4LL4RD": "35045",
  Lionsmane: "36041",
  Empiricist: "35052",
  "Mitra Aman": "35056",
  Hantu: "35008",
  "Magistrate Revontulet": "36048",
  Vicsek: "36042",
  Carnivore: "30003",
  Cleaver: "30006",
  Leech: "30008",
  Marjanah: "30016",
  Tranquilizer: "30017",
  "Red Team": "30018",
  Pantograph: "30023",
  "T400 Memory Diamond": "30031",
  "Ansel 1.0": "30038",
  Sprint: "30041",
  Diviner: "30046",
  Karuna: "30047",
  Neurospike: "30049",
  "Anoetic Void": "30050",
  "AMAZE Amusements": "30058",
  Clearinghouse: "30061",
  Ballista: "30062",
  "Regolith Mining License": "30071",
  Palisade: "30072",
  Tithe: "30073",
  "Charm Offensive": "35003",
  Shred: "35005",
  Bling: "35006",
  Cacophony: "35010",
  "Maintenance Access": "35016",
  Detente: "35018",
  "Maglectric Rapid (748 Mod)": "35019",
  "Fransofia Ward": "35021",
  Illumination: "35025",
  "GAMEDRAGON™ Pro": "35027",
  Madani: "35028",
  '"Knickknack" O\'Brian': "35033",
  "Side Hustle": "35034",
  "Otto Campaign": "35040",
  Nanomanagement: "35043",
  Mycoweb: "35053",
  "Peer Review": "35055",
  "N-Pot": "35064",
  "IP Enforcement": "35066",
  "Touch-ups": "35067",
  Plutus: "35073",
  Lamplighter: "35080",
  "Mahkota Langit Grid": "35082",
  "Luminal Transubstantiation": "30036",
  "Longevity Serum": "30044",
  "Tomorrow's Headline": "30052",
  "Above the Law": "30060",
  "Offworld Office": "30067",
  "Orbital Superiority": "30068",
  "Send a Message": "30069",
  "Superconducting Hub": "30070",
  "Aggressive Trendsetting": "35037",
  "Project Ingatan": "35038",
  Proprionegation: "35048",
  "Sericulture Expansion": "35049",
  "Embedded Reporting": "35059",
  "Next Big Thing": "35060",
  Greenmail: "35070",
  "Off the Books": "35071",
};

const ICE = new Set(["Ping", "Flyswatter", "Event Horizon", "Pharos", "Sleipnir", "Tocsin", "Semak-samun", "Bumi 1.0", "Biawak", "Funhouse", "Bran 1.0", "Doomscroll", "Whitespace", "Syailendra", "Flywheel", "Kessleroid", "Lethe", "Scatter Field", "Lionsmane", "Empiricist", "Vicsek", "Ansel 1.0", "Diviner", "Karuna", "Ballista", "Palisade", "Tithe", "Mycoweb", "N-Pot", "Lamplighter"]);
const KINDS: Kind[] = ["play", "install", "rez", "use", "score"];
const KIND_LABEL: Record<Kind, string> = { play: "Play", install: "Install", rez: "Rez", use: "Effect", score: "Score" };
const SPEEDS = [1, 0.5, 0.25];
const OLD: Partial<Record<Kind, Record<string, (r: DOMRect) => void>>> = { play: PLAY, install: INSTALL, rez: REZ, score: SCORE };

const CARDS = Object.keys(CODES)
  .map((title) => ({ title, code: CODES[title], ice: ICE.has(title), kinds: KINDS.filter((k) => FX[k][title]) }))
  .filter((c) => c.kinds.length)
  .sort((a, b) => a.title.localeCompare(b.title));

const art = (code: string) => `https://card-images.netrunnerdb.com/v2/large/${code}.jpg`;
const thumb = (code: string) => `https://card-images.netrunnerdb.com/v2/small/${code}.jpg`;
const box = (el: Element | null | undefined) => el?.getBoundingClientRect() ?? null;
const NOTES = "nsg.fxnotes";
type Review = { stars?: number; status?: "ok" | "issue"; note?: string; v?: string };
type Notes = Record<string, Review>;
const noteKey = (title: string, kind: Kind) => `${title} · ${KIND_LABEL[kind]}`;
const nameOf = (key: string) => {
  const at = key.lastIndexOf(" · ");
  const kind = KINDS.find((k) => KIND_LABEL[k] === key.slice(at + 3));
  return kind ? (FX[kind][key.slice(0, at)] ?? "") : "";
};
const reviewed = (r?: Review) => !!r && (!!r.stars || !!r.status || !!r.note?.trim());
const mark = (r?: Review) => (!reviewed(r) ? "" : r!.status === "issue" ? "issue" : r!.status === "ok" ? "ok" : "noted");
const stars = (n?: number) => (n ? `${"★".repeat(n)}${"☆".repeat(5 - n)}` : "");
const summary = (r: Review) => [r.status === "ok" ? "OK" : r.status === "issue" ? "ISSUE" : "", stars(r.stars), r.note?.trim() ?? ""].filter(Boolean).join(" · ");
const line = (k: string, r: Review) => [`- ${k}`, r.v ? `v:${r.v}` : "", r.status === "ok" ? "OK" : r.status === "issue" ? "ISSUE" : "", r.stars ? `${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}` : "", r.note?.trim() ?? ""].filter(Boolean).join(" · ");

function loadNotes(): Notes {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTES) ?? "{}") as Record<string, Review | string>;
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" ? { note: v } : v]));
  } catch {
    return {};
  }
}

const VIEW = "nsg.fxlab";
type View = { title?: string; kind?: Kind; query?: string; speed?: number; tile?: boolean; aimed?: boolean; todo?: boolean };

function loadView(): View {
  try {
    return JSON.parse(localStorage.getItem(VIEW) ?? "{}") as View;
  } catch {
    return {};
  }
}

const PASS = "nsg.fxpass";
type Pass = { n: number; prev: Notes };

function loadPass(): Pass {
  try {
    const p = JSON.parse(localStorage.getItem(PASS) ?? "null") as Pass | null;
    if (p && typeof p.n === "number") return { n: p.n, prev: p.prev ?? {} };
  } catch {}
  return { n: 1, prev: {} };
}

function savePass(p: Pass) {
  try {
    localStorage.setItem(PASS, JSON.stringify(p));
  } catch {}
}

function saveNotes(n: Notes) {
  try {
    localStorage.setItem(NOTES, JSON.stringify(n));
  } catch {}
}

export function FxGlLab() {
  const [saved] = useState(loadView);
  const [pick, setPick] = useState(() => Math.max(0, CARDS.findIndex((c) => c.title === saved.title)));
  const [kind, setKind] = useState<Kind>(() => (saved.kind && CARDS[pick]?.kinds.includes(saved.kind) ? saved.kind : CARDS[pick].kinds[0]));
  const [query, setQuery] = useState(saved.query ?? "");
  const [busy, setBusy] = useState(false);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(saved.speed && SPEEDS.includes(saved.speed) ? saved.speed : 1);
  const [tile, setTile] = useState(!!saved.tile);
  const [aimed, setAimed] = useState(!!saved.aimed);
  const [todo, setTodo] = useState(!!saved.todo);
  const [notes, setNotes] = useState<Notes>(loadNotes);
  const [pass, setPass] = useState<Pass>(loadPass);
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [sent, setSent] = useState("");
  const img = useRef<HTMLImageElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const run = useRef(0);
  const pending = useRef(false);
  const card = CARDS[pick];

  const play = async (old = false) => {
    const el = img.current;
    if (!el) return;
    if (busy) {
      pending.current = true;
      return;
    }
    const id = ++run.current;
    setBusy(true);
    const rect = el.getBoundingClientRect();
    const q = (sel: string) => box(stage.current?.querySelector(sel));
    setAim(aimed ? { advanced: ["lab-target"], gone: [q(".fxgl-gone")].filter((r): r is DOMRect => !!r), hostOf: new Map([["lab-self", "lab-target"]]), corpLost: 3, gripLost: 2 } : { advanced: [], gone: [], hostOf: new Map(), corpLost: 0, gripLost: 0 });
    if (old) {
      OLD[kind]?.[card.title]?.(rect);
      await new Promise((r) => setTimeout(r, 2400));
    } else await glEffect(kind, card.title, rect, card.code, el, "runner", aimed && kind === "use" ? (stage.current?.querySelector(".fxgl-target") ?? null) : null);
    setBusy(false);
    if (run.current === id) run.current = 0;
  };

  useEffect(() => setFxSpeed(speed), [speed]);
  useEffect(() => {
    void Promise.all([import("../fx/gl/versions").then((m) => m.fxVersions()), import("../fx/gl/baseline.json").then((m) => m.default as Record<string, string>)]).then(([cur, base]) => {
      setVersions(cur);
      const stamp = (n: Notes) => Object.fromEntries(Object.entries(n).map(([k, r]) => [k, r.v ? r : { ...r, v: base[nameOf(k)] }]));
      const fixed = stamp(loadNotes());
      const p = loadPass();
      const next = { n: p.n, prev: stamp(p.prev) };
      setNotes(fixed);
      saveNotes(fixed);
      setPass(next);
      savePass(next);
    });
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW, JSON.stringify({ title: CARDS[pick].title, kind, query, speed, tile, aimed, todo }));
    } catch {}
  }, [pick, kind, query, speed, tile, aimed, todo]);
  useEffect(() => () => setFxSpeed(1), []);

  useEffect(() => {
    const t = setTimeout(() => void play(), 450);
    return () => clearTimeout(t);
  }, [pick, kind, tile, aimed]);

  useEffect(() => {
    if (busy) return;
    if (pending.current) {
      pending.current = false;
      const t = setTimeout(() => void play(), 120);
      return () => clearTimeout(t);
    }
    if (!loop) return;
    const t = setTimeout(() => void play(), 500);
    return () => clearTimeout(t);
  }, [loop, busy]);

  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(".on");
    if (el && strip.current) strip.current.scrollTo({ left: el.offsetLeft - (strip.current.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [pick]);

  const choose = (i: number) => {
    const next = (i + CARDS.length) % CARDS.length;
    setPick(next);
    if (!CARDS[next].kinds.includes(kind)) setKind(CARDS[next].kinds[0]);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") choose(pick + 1);
      else if (e.key === "ArrowLeft") choose(pick - 1);
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const ks = card.kinds;
        setKind(ks[(ks.indexOf(kind) + (e.key === "ArrowDown" ? 1 : ks.length - 1)) % ks.length]);
      } else if (e.key === " ") void play();
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });

  const key = noteKey(card.title, kind);
  const filled = Object.entries(notes).filter(([, v]) => reviewed(v));
  const review = notes[key] ?? {};
  const before = pass.prev[key];
  const versionOf = (k: string) => versions[nameOf(k)];
  const last = (k: string) => (reviewed(notes[k]) ? notes[k] : pass.prev[k]);
  const changed = (k: string) => {
    const r = last(k);
    const v = versionOf(k);
    return !!r?.v && !!v && r.v !== v;
  };
  const tag = (k: string) => (changed(k) ? "changed" : mark(notes[k]));
  const toReview = (k: string) => changed(k) && !reviewed(notes[k]);
  const pendingCount = CARDS.reduce((n, c) => n + c.kinds.filter((k) => toReview(noteKey(c.title, k))).length, 0);
  const shown = CARDS.map((c, i) => ({ c, i })).filter(({ c, i }) => c.title.toLowerCase().includes(query.trim().toLowerCase()) && (!todo || i === pick || c.kinds.some((k) => toReview(noteKey(c.title, k)))));
  const update = (patch: Review) => {
    const r = { ...review, ...patch, v: versionOf(key) };
    const next = { ...notes, [key]: r };
    if (!reviewed(r)) delete next[key];
    setNotes(next);
    saveNotes(next);
  };
  const send = async () => {
    const total = CARDS.reduce((n, c) => n + c.kinds.length, 0);
    const stale = CARDS.flatMap((c) => c.kinds.map((k) => noteKey(c.title, k))).filter((k) => !reviewed(notes[k]) && changed(k));
    const text = [`FX lab review · pass ${pass.n} (${filled.length}/${total} reviewed)`, ...filled.map(([k, v]) => line(k, v)), ...(stale.length ? ["", `Changed since an earlier review, not re-reviewed yet (${stale.length}):`, ...stale.map((k) => `- ${k} · v:${versionOf(k)}`)] : [])].join("\n");
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
    savePass(next);
    setNotes({});
    saveNotes({});
  };
  const clearNotes = () => {
    if (!confirm(`Delete ${filled.length} reviews?`)) return;
    setNotes({});
    saveNotes({});
  };

  const classes = ["fxgl-card", card.ice ? "ice" : "", card.ice && kind === "install" ? "unrezzed" : "", tile ? "tile-size" : ""].join(" ");

  return (
    <div class="screen fxgl">
      <header class="fxgl-head">
        <button class="fxgl-nav" onClick={() => choose(pick - 1)} aria-label="Previous card">
          ‹
        </button>
        <div class="fxgl-name">
          <span class="label">FX lab</span>
          <strong>{card.title}</strong>
        </div>
        <button class="fxgl-nav" onClick={() => choose(pick + 1)} aria-label="Next card">
          ›
        </button>
      </header>

      <div class={`fxgl-stage ${tile ? "small" : ""}`} ref={stage}>
        <img ref={img} data-cid="lab-self" class={classes} src={art(card.code)} alt={card.title} crossOrigin="anonymous" />
        {aimed && (
          <div class="fxgl-aim" aria-hidden="true">
            <div class="playfield">
              <div class="tile fxgl-target" data-cid="lab-target">
                <span>ice</span>
              </div>
            </div>
            <div class="fxgl-gone">
              <span>trashed</span>
            </div>
            <div class="fxgl-credits" data-anchor="corp-credits">
              <span>corp ¢</span>
            </div>
            <div class="fxgl-grip" data-anchor="runner-hand">
              <span>grip</span>
            </div>
            <div class="fxgl-panel" data-anchor="runner-panel">
              <span>runner</span>
            </div>
          </div>
        )}
      </div>

      <div class="fxgl-kinds" role="tablist">
        {card.kinds.map((k) => (
          <button role="tab" aria-selected={k === kind} class={[k === kind ? "on" : "", k === kind && busy ? "playing" : "", tag(noteKey(card.title, k))].join(" ")} onClick={() => (k === kind ? void play() : setKind(k))}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div class="fxgl-controls">
        <button class={loop ? "on" : ""} onClick={() => setLoop(!loop)}>
          Loop
        </button>
        <button onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>{speed === 1 ? "1×" : speed === 0.5 ? "½×" : "¼×"}</button>
        <button class={tile ? "on" : ""} onClick={() => setTile(!tile)}>
          {tile ? "Tile" : "Big"}
        </button>
        <button class={aimed ? "on" : ""} onClick={() => setAimed(!aimed)}>
          Targets
        </button>
        <button disabled={busy || !OLD[kind]?.[card.title]} onClick={() => play(true)}>
          Old
        </button>
      </div>

      <div class="fxgl-note">
        <div class="fxgl-rate">
          <div class="fxgl-stars" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button role="radio" aria-checked={review.stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} class={(review.stars ?? 0) >= n ? "on" : ""} onClick={() => update({ stars: review.stars === n ? undefined : n })}>
                ★
              </button>
            ))}
          </div>
          <button class={`fxgl-status ok ${review.status === "ok" ? "on" : ""}`} onClick={() => update({ status: review.status === "ok" ? undefined : "ok" })}>
            OK
          </button>
          <button class={`fxgl-status issue ${review.status === "issue" ? "on" : ""}`} onClick={() => update({ status: review.status === "issue" ? undefined : "issue" })}>
            Issue
          </button>
        </div>
        <div class="fxgl-review-meta">
          <span>Pass {pass.n}</span>
          {versionOf(key) && <span>v:{versionOf(key)}</span>}
          {changed(key) && <span class="fxgl-changed">Changed since your {reviewed(review) ? "" : "last "}review</span>}
        </div>
        {before && reviewed(before) && !reviewed(review) && (
          <div class="fxgl-prev">
            Previously: {summary(before)}
            {before.v && before.v !== versionOf(key) ? ` (v:${before.v})` : ""}
          </div>
        )}
        <textarea rows={2} placeholder={`Feedback on ${key}`} value={review.note ?? ""} onInput={(e) => update({ note: (e.target as HTMLTextAreaElement).value })} />
        <div class="fxgl-note-actions">
          <button class="fxgl-play" disabled={!filled.length} onClick={send}>
            {sent || `Send ${filled.length} review${filled.length === 1 ? "" : "s"}`}
          </button>
          <button disabled={!filled.length} onClick={newPass}>
            New pass
          </button>
          <button disabled={!filled.length} onClick={clearNotes}>
            Clear
          </button>
        </div>
      </div>

      <div class="fxgl-filter">
        <button class={todo ? "on" : ""} onClick={() => setTodo(!todo)}>
          Changed, not reviewed ({pendingCount})
        </button>
      </div>
      <input class="fxgl-search" type="search" placeholder={`Search ${CARDS.length} cards`} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
      <div class="fxgl-strip" ref={strip}>
        {shown.map(({ c, i }) => (
          <button class={[i === pick ? "on" : "", (["changed", "issue"].find((m) => c.kinds.some((k) => tag(noteKey(c.title, k)) === m)) ?? c.kinds.map((k) => tag(noteKey(c.title, k))).find(Boolean) ?? "")].join(" ")} onClick={() => choose(i)} aria-label={c.title}>
            <img src={thumb(c.code)} alt="" loading="lazy" />
            <span>{c.title}</span>
            <small>{c.kinds.map((k) => KIND_LABEL[k]).join(" · ")}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
