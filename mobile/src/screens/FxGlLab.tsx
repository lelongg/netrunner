import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { FIRE, INSTALL, PLAY, REZ, SCORE, fireSignature } from "../fx/signatures";
import { FX, type Kind, glEffect, setGlOff } from "../fx/gl";
import { setAim } from "../fx/gl/aim";
import { setFxSpeed } from "../fx/gl/stage";
import { type Card, cardScene, extraScenes, plain } from "./FxLab";
import { DockButton, LabScene, LabSheet, useSwipe } from "./LabScene";
import { Icon } from "../icons";
import { Picker } from "../ui";
import { KINDS, KIND_LABEL, ReviewBox, noteKey, useReviews } from "./labReview";

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

const SPEEDS = [1, 0.5, 0.25];
const DOM: Partial<Record<Kind, Record<string, (r: DOMRect) => void>>> = { play: PLAY, install: INSTALL, rez: REZ, score: SCORE };

export interface LabCard {
  title: string;
  code: string;
  card?: Card;
  ice: boolean;
  kinds: Kind[];
  gl: Set<Kind>;
  dom: Set<Kind>;
}

const hasDom = (kind: Kind, title: string) => (kind === "use" ? FIRE.includes(title) : !!DOM[kind]?.[title]);

export function labCards(byPlain: Map<string, Card>): LabCard[] {
  const titles = new Set([...KINDS.flatMap((k) => Object.keys(FX[k])), ...Object.values(DOM).flatMap((m) => Object.keys(m ?? {})), ...FIRE]);
  return [...titles]
    .map((title) => {
      const card = byPlain.get(plain(title));
      const gl = new Set(KINDS.filter((k) => FX[k][title]));
      const dom = new Set(KINDS.filter((k) => hasDom(k, title)));
      return { title, card, code: CODES[title] ?? card?.code ?? "", ice: card?.type === "ICE", kinds: KINDS.filter((k) => gl.has(k) || dom.has(k)), gl, dom };
    })
    .filter((c) => c.code && c.kinds.length)
    .sort((a, b) => a.title.localeCompare(b.title));
}

const art = (code: string) => `https://card-images.netrunnerdb.com/v2/large/${code}.jpg`;
const thumb = (code: string) => `https://card-images.netrunnerdb.com/v2/small/${code}.jpg`;
const box = (el: Element | null | undefined) => el?.getBoundingClientRect() ?? null;

const VIEW = "nsg.fxlab";
type Mode = "isolated" | "game";
type View = { title?: string; kind?: Kind; query?: string; speed?: number; tile?: boolean; aimed?: boolean; todo?: boolean; mode?: Mode; dom?: boolean; type?: string; set?: string; gl?: "all" | "gl" | "dom" };

function loadView(): View {
  try {
    return JSON.parse(localStorage.getItem(VIEW) ?? "{}") as View;
  } catch {
    return {};
  }
}

export interface CardGroup {
  key: string;
  label: string;
  cards: LabCard[];
}

type Sheet = "list" | "options" | "review" | null;

export interface CardSets {
  of: Map<string, Set<string>>;
  list: { key: string; name: string }[];
}

export function FxGlLab({ groups, byPlain, sets }: { groups: CardGroup[]; byPlain: Map<string, Card>; sets: CardSets }) {
  const [saved] = useState(loadView);
  const [type, setType] = useState(() => new URLSearchParams(location.search).get("type") ?? saved.type ?? "all");
  const [set, setSet] = useState(saved.set ?? "");
  const [gl, setGl] = useState<"all" | "gl" | "dom">(saved.gl ?? "all");
  const group = groups.find((g) => g.key === type) ?? groups[0];
  const inSet = (c: LabCard, key = set, g = gl) => (!key || !!sets.of.get(c.title)?.has(key)) && (g === "all" || (g === "gl") === c.gl.size > 0);
  const CARDS = useMemo(() => {
    const list = group.cards.filter((c) => inSet(c));
    return list.length ? list : group.cards;
  }, [group, set, gl]);
  const setOptions = useMemo(() => sets.list.filter((s) => group.cards.some((c) => inSet(c, s.key))), [group, sets]);
  const [pick, setPick] = useState(() => Math.max(0, CARDS.findIndex((c) => c.title === saved.title)));
  const [kind, setKind] = useState<Kind>(() => (saved.kind && CARDS[pick]?.kinds.includes(saved.kind) ? saved.kind : CARDS[pick].kinds[0]));
  const [query, setQuery] = useState(saved.query ?? "");
  const [busy, setBusy] = useState(false);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(saved.speed && SPEEDS.includes(saved.speed) ? saved.speed : 1);
  const [tile, setTile] = useState(!!saved.tile);
  const [aimed, setAimed] = useState(!!saved.aimed);
  const [todo, setTodo] = useState(!!saved.todo);
  const [mode, setMode] = useState<Mode>(saved.mode === "game" ? "game" : "isolated");
  const [preferDom, setPreferDom] = useState(!!saved.dom);
  const [nonce, setNonce] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const reviews = useReviews();
  const img = useRef<HTMLImageElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const run = useRef(0);
  const pending = useRef(false);
  const card = CARDS[Math.min(pick, CARDS.length - 1)];
  const dom = card.dom.has(kind) && (preferDom || !card.gl.has(kind));
  const both = card.dom.has(kind) && card.gl.has(kind);

  useEffect(() => {
    setGlOff(dom);
  }, [dom]);
  useEffect(() => () => setGlOff(false), []);
  useEffect(() => {
    history.replaceState(null, "", `${location.pathname}?lab${group.key === "all" ? "" : `&type=${group.key}`}`);
  }, [group.key]);

  const play = async () => {
    if (mode === "game") return setNonce((n) => n + 1);
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
    if (dom) {
      if (kind === "use") fireSignature(card.title, rect, [rect.left + rect.width / 2, rect.bottom + 60]);
      else DOM[kind]?.[card.title]?.(rect);
      await new Promise((r) => setTimeout(r, 2400));
    } else await glEffect(kind, card.title, rect, card.code, el, "runner", aimed && kind === "use" ? (stage.current?.querySelector(".fxgl-target") ?? null) : null);
    setBusy(false);
    if (run.current === id) run.current = 0;
  };

  const scene = useMemo(() => {
    const c = card.card;
    if (mode !== "game" || !c) return undefined;
    const extra = extraScenes(byPlain).find((e) => plain(e.label) === card.title && e.group.toLowerCase() === (kind === "use" ? "use" : kind));
    if (extra) return extra.scene();
    return cardScene(c, kind === "use" && card.ice ? "fire" : kind);
  }, [mode, card, kind, nonce, byPlain]);

  useEffect(() => setFxSpeed(speed), [speed]);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW, JSON.stringify({ title: card.title, kind, speed, tile, aimed, mode, dom: preferDom, type: group.key, set, gl, query, todo }));
    } catch {}
  }, [card, kind, speed, tile, aimed, mode, preferDom, group.key, set, gl, query, todo]);
  useEffect(() => () => setFxSpeed(1), []);

  useEffect(() => {
    if (mode === "game") return;
    const t = setTimeout(() => void play(), 450);
    return () => clearTimeout(t);
  }, [card, kind, tile, aimed, mode, dom]);

  useEffect(() => {
    if (busy) return;
    if (pending.current) {
      pending.current = false;
      const t = setTimeout(() => void play(), 120);
      return () => clearTimeout(t);
    }
    if (!loop) return;
    const t = setTimeout(() => void play(), mode === "game" ? 3200 : 500);
    return () => clearTimeout(t);
  }, [loop, busy, nonce]);

  const choose = (i: number) => {
    const next = (i + CARDS.length) % CARDS.length;
    setPick(next);
    if (!CARDS[next].kinds.includes(kind)) setKind(CARDS[next].kinds[0]);
    if (mode === "game") setNonce((n) => n + 1);
  };
  const refilter = (list: LabCard[]) => {
    const at = list.findIndex((c) => c.title === card.title);
    setPick(Math.max(0, at));
    if (at < 0 && list[0] && !list[0].kinds.includes(kind)) setKind(list[0].kinds[0]);
  };
  const pickType = (key: string) => {
    const next = groups.find((g) => g.key === key) ?? groups[0];
    setType(next.key);
    const list = next.cards.filter((c) => inSet(c));
    if (!list.length) setSet("");
    refilter(list.length ? list : next.cards);
  };
  const pickGl = (g: "all" | "gl" | "dom") => {
    setGl(g);
    const list = group.cards.filter((c) => inSet(c, set, g));
    refilter(list.length ? list : group.cards);
  };
  const pickSet = (key: string) => {
    setSet(key);
    const list = group.cards.filter((c) => inSet(c, key));
    refilter(list.length ? list : group.cards);
  };
  const swipe = useSwipe((dir) => choose(pick + dir));

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") choose(pick + 1);
      else if (e.key === "ArrowLeft") choose(pick - 1);
      else if (e.key === " ") void play();
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });

  const keyOf = (c: LabCard, k: Kind, d = c.dom.has(k) && (preferDom || !c.gl.has(k))) => noteKey(c.title, k, d);
  const key = keyOf(card, kind, dom);
  const { tag, changed } = reviews;
  const pendingCount = CARDS.reduce((n, c) => n + c.kinds.filter((k) => changed(noteKey(c.title, k))).length, 0);
  const shown = CARDS.map((c, i) => ({ c, i })).filter(({ c }) => c.title.toLowerCase().includes(query.trim().toLowerCase()) && (!todo || c.kinds.some((k) => changed(noteKey(c.title, k)))));
  const allKeys = CARDS.flatMap((c) => c.kinds.map((k) => noteKey(c.title, k)));
  const cardMark = (c: LabCard) => ["changed", "issue"].find((m) => c.kinds.some((k) => tag(keyOf(c, k)) === m)) ?? c.kinds.map((k) => tag(keyOf(c, k))).find(Boolean) ?? "";
  const classes = ["fxgl-card", card.ice ? "ice" : "", card.ice && kind === "install" ? "unrezzed" : "", tile ? "tile-size" : ""].join(" ");

  return (
    <div class="lab-view">
      <div class="lab-stage" {...swipe}>
        {mode === "game" ? (
          <LabScene scene={scene} byPlain={byPlain} />
        ) : (
          <div class={`fxgl-stage ${tile ? "small" : ""}`} ref={stage} onClick={() => void play()}>
            <img ref={img} data-cid="lab-self" class={classes} src={art(card.code)} alt={card.title} crossOrigin="anonymous" draggable={false} />
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
        )}
      </div>
      <header class="lab-bar">
        <button class="lab-nav" onClick={() => choose(pick - 1)} aria-label="Previous card">
          <Icon name="chevron-left" />
        </button>
        <button class="lab-title" onClick={() => setSheet("list")}>
          <span class="label">
            {set ? (sets.list.find((s) => s.key === set)?.name ?? group.label) : group.label} · {pick + 1}/{CARDS.length}
            {card.gl.size ? "" : " · no WebGL"}
          </span>
          <strong>{card.title}</strong>
        </button>
        <button class="lab-nav" onClick={() => choose(pick + 1)} aria-label="Next card">
          <Icon name="chevron-right" />
        </button>
      </header>
      <div class="lab-kinds" role="tablist">
        {card.kinds.map((k) => (
          <button role="tab" aria-selected={k === kind} class={[k === kind ? "on" : "", k === kind && busy ? "playing" : "", tag(keyOf(card, k))].join(" ")} onClick={() => (k === kind ? void play() : (setKind(k), mode === "game" && setNonce((n) => n + 1)))}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <nav class="lab-dock">
        <DockButton icon="eye" label={mode === "game" ? "In game" : "Isolated"} on={mode === "game"} onClick={() => setMode(mode === "game" ? "isolated" : "game")} />
        <DockButton icon="bolt" label={dom ? "No GL" : "WebGL"} on={dom} disabled={!both} onClick={() => setPreferDom(!preferDom)} />
        <DockButton icon="play" label="Replay" onClick={() => void play()} />
        <DockButton icon="search" label="Cards" onClick={() => setSheet("list")} />
        <DockButton icon="menu" label="Options" onClick={() => setSheet("options")} />
        <DockButton icon="star" label="Review" mark={tag(key)} onClick={() => setSheet("review")} />
      </nav>
      {sheet === "list" && (
        <LabSheet title="Cards" onClose={() => setSheet(null)}>
          <div class="lab-chips">
            {groups.map((g) => (
              <button class={g.key === group.key ? "on" : ""} onClick={() => pickType(g.key)}>
                {g.label} <span>{g.cards.length}</span>
              </button>
            ))}
          </div>
          <div class="lab-chips">
            {(["all", "gl", "dom"] as const).map((g) => (
              <button class={g === gl ? "on" : ""} onClick={() => pickGl(g)}>
                {g === "all" ? "Any effect" : g === "gl" ? "WebGL" : "No WebGL"} <span>{group.cards.filter((c) => inSet(c, set, g)).length}</span>
              </button>
            ))}
          </div>
          <div class="sort-select lab-set">
            <Picker title="Set" value={set} onChange={pickSet} options={[{ key: "", label: "All sets" }, ...setOptions.map((s) => ({ key: s.key, label: s.name }))]} />
          </div>
          <input class="fxgl-search" type="search" placeholder={`Search ${CARDS.length} cards`} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
          <button class={`lab-filter ${todo ? "on" : ""}`} disabled={!pendingCount} onClick={() => setTodo(!todo)}>
            Changed, not reviewed ({pendingCount})
          </button>
          <div class="lab-grid">
            {shown.map(({ c, i }) => (
              <button class={[i === pick ? "on" : "", cardMark(c)].join(" ")} onClick={() => (choose(i), setSheet(null))} aria-label={c.title}>
                <img src={thumb(c.code)} alt="" loading="lazy" />
                <span>{c.title}</span>
              </button>
            ))}
          </div>
        </LabSheet>
      )}
      {sheet === "options" && (
        <LabSheet title="Options" onClose={() => setSheet(null)}>
          <div class="lab-options">
            <button class={loop ? "on" : ""} onClick={() => setLoop(!loop)}>
              Loop
            </button>
            <button onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>Speed {speed === 1 ? "1×" : speed === 0.5 ? "½×" : "¼×"}</button>
            <button class={tile ? "on" : ""} disabled={mode === "game"} onClick={() => setTile(!tile)}>
              {tile ? "Tile size" : "Big card"}
            </button>
            <button class={aimed ? "on" : ""} disabled={mode === "game"} onClick={() => setAimed(!aimed)}>
              Targets
            </button>
          </div>
        </LabSheet>
      )}
      {sheet === "review" && (
        <LabSheet title={key} onClose={() => setSheet(null)}>
          <ReviewBox reviews={reviews} k={key} keys={allKeys} />
        </LabSheet>
      )}
    </div>
  );
}
