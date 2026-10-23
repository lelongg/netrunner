import { useEffect, useMemo, useRef, useState } from "preact/hooks";
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
type Review = { stars?: number; status?: "ok" | "issue"; note?: string };
type Notes = Record<string, Review>;
const noteKey = (title: string, kind: Kind) => `${title} · ${KIND_LABEL[kind]}`;
const reviewed = (r?: Review) => !!r && (!!r.stars || !!r.status || !!r.note?.trim());
const mark = (r?: Review) => (!reviewed(r) ? "" : r!.status === "issue" ? "issue" : r!.status === "ok" ? "ok" : "noted");
const line = (k: string, r: Review) => [`- ${k}`, r.status === "ok" ? "OK" : r.status === "issue" ? "ISSUE" : "", r.stars ? `${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}` : "", r.note?.trim() ?? ""].filter(Boolean).join(" · ");

function loadNotes(): Notes {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTES) ?? "{}") as Record<string, Review | string>;
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" ? { note: v } : v]));
  } catch {
    return {};
  }
}

function saveNotes(n: Notes) {
  try {
    localStorage.setItem(NOTES, JSON.stringify(n));
  } catch {}
}

export function FxGlLab() {
  const [pick, setPick] = useState(0);
  const [kind, setKind] = useState<Kind>(CARDS[0].kinds[0]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tile, setTile] = useState(false);
  const [aimed, setAimed] = useState(false);
  const [notes, setNotes] = useState<Notes>(loadNotes);
  const [sent, setSent] = useState("");
  const img = useRef<HTMLImageElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const run = useRef(0);
  const pending = useRef(false);
  const card = CARDS[pick];
  const shown = useMemo(() => CARDS.map((c, i) => ({ c, i })).filter(({ c }) => c.title.toLowerCase().includes(query.trim().toLowerCase())), [query]);

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
    strip.current?.querySelector(".on")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
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
  const update = (patch: Review) => {
    const r = { ...review, ...patch };
    const next = { ...notes, [key]: r };
    if (!reviewed(r)) delete next[key];
    setNotes(next);
    saveNotes(next);
  };
  const send = async () => {
    const total = CARDS.reduce((n, c) => n + c.kinds.length, 0);
    const text = [`FX lab feedback (${filled.length}/${total} reviewed)`, ...filled.map(([k, v]) => line(k, v))].join("\n");
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
          <button role="tab" aria-selected={k === kind} class={[k === kind ? "on" : "", mark(notes[noteKey(card.title, k)])].join(" ")} onClick={() => setKind(k)}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div class="fxgl-controls">
        <button class="fxgl-play" disabled={busy} onClick={() => play()}>
          {busy ? "Playing…" : "Replay"}
        </button>
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
        <textarea rows={2} placeholder={`Feedback on ${key}`} value={review.note ?? ""} onInput={(e) => update({ note: (e.target as HTMLTextAreaElement).value })} />
        <div class="fxgl-note-actions">
          <button class="fxgl-play" disabled={!filled.length} onClick={send}>
            {sent || `Send ${filled.length} review${filled.length === 1 ? "" : "s"}`}
          </button>
          <button disabled={!filled.length} onClick={clearNotes}>
            Clear
          </button>
        </div>
      </div>

      <input class="fxgl-search" type="search" placeholder={`Search ${CARDS.length} cards`} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
      <div class="fxgl-strip" ref={strip}>
        {shown.map(({ c, i }) => (
          <button class={[i === pick ? "on" : "", (c.kinds.map((k) => mark(notes[noteKey(c.title, k)])).find((m) => m === "issue") ?? c.kinds.map((k) => mark(notes[noteKey(c.title, k)])).find(Boolean) ?? "")].join(" ")} onClick={() => choose(i)} aria-label={c.title}>
            <img src={thumb(c.code)} alt="" loading="lazy" />
            <span>{c.title}</span>
            <small>{c.kinds.map((k) => KIND_LABEL[k]).join(" · ")}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
