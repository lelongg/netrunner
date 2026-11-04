import { motionOff } from "../../settings";
import type { Board } from "./kit";
import { aim } from "./aim";

export type Kind = "play" | "install" | "rez" | "use" | "score";

export const FX: Record<Kind, Record<string, string>> = {
  play: {
    "Sure Gamble": "sureGamble",
    "Hedge Fund": "hedgeFund",
    Overclock: "overclock",
    "Creative Commission": "creativeCommission",
    "Petty Cash": "pettyCash",
    "Predictive Planogram": "predictivePlanogram",
    Jailbreak: "jailbreak",
    Ritual: "ritual",
    "Pinhole Threading": "pinholeThreading",
    "Mutual Favor": "mutualFavor",
    "Clean Getaway": "cleanGetaway",
    "Transfer of Wealth": "transferOfWealth",
    "Measured Response": "measuredResponse",
    "Key Performance Indicators": "keyPerformanceIndicators",
    "Seamless Launch": "seamlessLaunch",
    "Hansei Review": "hanseiReview",
    "Wildcat Strike": "wildcatStrike",
    "Government Subsidy": "governmentSubsidy",
    "Bigger Picture": "biggerPicture",
    "Top-Down Solutions": "topDownSolutions",
    Myoshu: "myoshu",
    "Reanimation Protocol": "reanimationProtocol",
    "Tread Lightly": "treadLightly",
    "Lie Low": "lieLow",
    Unleash: "unleash",
    "Public Trail": "publicTrail",
    Tailgate: "tailgate",
    "Flood the Market": "floodTheMarket",
    Retribution: "retribution",
    "Beta Build": "betaBuild",
    Scrounge: "scrounge",
    "Vulture Fund": "vultureFund",
    Cultivate: "cultivate",
    VRcation: "vrcation",
    Sprint: "sprint",
    Neurospike: "neurospike",
    "Charm Offensive": "charmOffensive",
    Shred: "shred",
    "Maintenance Access": "maintenanceAccess",
    Illumination: "illumination",
    Nanomanagement: "nanomanagement",
    "Peer Review": "peerReview",
    "IP Enforcement": "ipEnforcement",
    "Touch-ups": "touchUps",
  },
  install: {
    "DZMZ Optimizer": "dzmzInstall",
    "Docklands Pass": "docklandsPass",
    "Daily Casts": "dailyCasts",
    "Telework Contract": "teleworkContract",
    Touchstone: "touchstone",
    Fermenter: "fermenterPose",
    "Rising Tide": "risingTidePose",
    Echelon: "echelonPose",
    Carmen: "carmenPose",
    Botulus: "botulusPose",
    Unity: "unityPose",
    Conduit: "conduitPose",
    Gourmand: "gourmandPose",
    Ping: "pingPose",
    Flyswatter: "flyswatterPose",
    "Event Horizon": "eventHorizonPose",
    Pharos: "pharosPose",
    Sleipnir: "sleipnirPose",
    Tocsin: "tocsinPose",
    "Semak-samun": "semakPose",
    "Verbal Plasticity": "verbalPlasticity",
    "The Tungsten Tailor": "tungstenTailor",
    Buzzsaw: "buzzsawPose",
    "Self-modifying Code": "selfModifyingCodePose",
    Principia: "principiaPose",
    Azimat: "azimatPose",
    "Bumi 1.0": "bumiPose",
    Biawak: "biawakPose",
    Funhouse: "funhousePose",
    "Bran 1.0": "branPose",
    Doomscroll: "doomscrollPose",
    "Devadatta Drone": "devadattaDrone",
    "Open Market": "openMarket",
    "Smartware Distributor": "smartwareDistributor",
    "Rent Rioters": "rentRioters",
    "Sang Kancil": "sangKancilPose",
    Chromatophores: "chromatophores",
    Whitespace: "whitespacePose",
    Syailendra: "syailendraPose",
    Flywheel: "flywheelPose",
    Kessleroid: "kessleroidPose",
    Pennyshaver: "pennyshaver",
    Mayfly: "mayflyPose",
    Stowaway: "stowawayPose",
    Cookbook: "cookbook",
    Hantu: "hantuPose",
    Lethe: "lethePose",
    "Scatter Field": "scatterFieldPose",
    Lionsmane: "lionsmanePose",
    Empiricist: "empiricistPose",
    Vicsek: "vicsekPose",
    Carnivore: "carnivorePose",
    Cleaver: "cleaverPose",
    Leech: "leechPose",
    Marjanah: "marjanahPose",
    Tranquilizer: "tranquilizerPose",
    "Red Team": "redTeamPose",
    Pantograph: "pantographPose",
    "T400 Memory Diamond": "t400Pose",
    "Ansel 1.0": "anselPose",
    Diviner: "divinerPose",
    Karuna: "karunaPose",
    Ballista: "ballistaPose",
    Palisade: "palisadePose",
    Tithe: "tithePose",
    Bling: "blingPose",
    Cacophony: "cacophonyPose",
    Detente: "detentePose",
    "Maglectric Rapid (748 Mod)": "maglectricPose",
    "Fransofia Ward": "fransofiaWard",
    "GAMEDRAGON™ Pro": "gamedragonPose",
    Madani: "madaniPose",
    '"Knickknack" O\'Brian': "knickknack",
    "Side Hustle": "sideHustlePose",
    Mycoweb: "mycowebPose",
    "N-Pot": "nPotPose",
    Lamplighter: "lamplighterPose",
  },
  rez: {
    "Spin Doctor": "spinDoctor",
    Ping: "pingRez",
    Flyswatter: "flyswatter",
    "Event Horizon": "eventHorizon",
    Pharos: "pharos",
    Sleipnir: "sleipnir",
    Tocsin: "tocsin",
    "Semak-samun": "semakSamun",
    "Humanoid Resources": "humanoidResources",
    "Nihilo Agent": "nihiloAgent",
    "Anthill Excavation Contract": "anthillExcavation",
    "Byte!": "byte",
    "Manegarm Skunkworks": "manegarmSkunkworks",
    "Bumi 1.0": "bumi",
    Biawak: "biawak",
    Funhouse: "funhouse",
    "Bran 1.0": "bran",
    Doomscroll: "doomscroll",
    "Phat Gioan Baotixita": "phatGioan",
    "Public Access Plaza": "publicAccessPlaza",
    Whitespace: "whitespace",
    Syailendra: "syailendra",
    Flywheel: "flywheel",
    Kessleroid: "kessleroid",
    Idiosyncresis: "idiosyncresis",
    "Malapert Data Vault": "malapertDataVault",
    Synchrocyclotron: "synchrocyclotron",
    "Nico Campaign": "nicoCampaign",
    "Mercia B4LL4RD": "merciaBallard",
    "Mitra Aman": "mitraAman",
    "Magistrate Revontulet": "magistrateRevontulet",
    Lethe: "lethe",
    "Scatter Field": "scatterField",
    Lionsmane: "lionsmane",
    Empiricist: "empiricist",
    Vicsek: "vicsek",
    "Ansel 1.0": "ansel",
    Diviner: "diviner",
    Karuna: "karuna",
    "Anoetic Void": "anoeticVoid",
    "AMAZE Amusements": "amazeAmusements",
    Clearinghouse: "clearinghouse",
    Ballista: "ballista",
    "Regolith Mining License": "regolith",
    Palisade: "palisade",
    Tithe: "tithe",
    "Otto Campaign": "ottoCampaign",
    Mycoweb: "mycoweb",
    "N-Pot": "nPot",
    Plutus: "plutus",
    Lamplighter: "lamplighter",
    "Mahkota Langit Grid": "mahkotaLangit",
  },
  use: {
    Fermenter: "fermenter",
    "Rising Tide": "risingTide",
    Echelon: "echelon",
    Carmen: "carmen",
    Botulus: "botulus",
    Unity: "unity",
    Conduit: "conduit",
    Gourmand: "gourmand",
    Ping: "pingFire",
    Flyswatter: "flyswatterFire",
    "Event Horizon": "eventHorizonFire",
    Pharos: "pharosFire",
    Sleipnir: "sleipnirFire",
    Tocsin: "tocsinFire",
    "Semak-samun": "semakFire",
    Buzzsaw: "buzzsaw",
    "Self-modifying Code": "selfModifyingCode",
    Principia: "principia",
    Azimat: "azimat",
    "Bumi 1.0": "bumiFire",
    Biawak: "biawakFire",
    Funhouse: "funhouseFire",
    "Bran 1.0": "branFire",
    Doomscroll: "doomscrollFire",
    "Sang Kancil": "sangKancil",
    Chromatophores: "chromatophoresEffect",
    Whitespace: "whitespaceFire",
    Syailendra: "syailendraFire",
    Flywheel: "flywheelFire",
    Kessleroid: "kessleroidFire",
    Mayfly: "mayfly",
    Hantu: "hantu",
    Lethe: "letheFire",
    "Scatter Field": "scatterFieldFire",
    Lionsmane: "lionsmaneFire",
    Empiricist: "empiricistFire",
    Vicsek: "vicsekFire",
    Carnivore: "carnivore",
    Cleaver: "cleaver",
    Leech: "leech",
    Marjanah: "marjanah",
    "Red Team": "redTeam",
    "Ansel 1.0": "anselFire",
    Diviner: "divinerFire",
    Karuna: "karunaFire",
    Clearinghouse: "clearinghouseFire",
    Ballista: "ballistaFire",
    "Regolith Mining License": "regolithUse",
    Palisade: "palisadeFire",
    Tithe: "titheFire",
    Cacophony: "cacophony",
    Detente: "detente",
    "Maglectric Rapid (748 Mod)": "maglectric",
    Madani: "madani",
    Mycoweb: "mycowebFire",
    "N-Pot": "nPotFire",
    Lamplighter: "lamplighterFire",
  },
  score: {
    "Luminal Transubstantiation": "luminalScore",
    "Longevity Serum": "longevityScore",
    "Tomorrow's Headline": "tomorrowsHeadline",
    "Above the Law": "aboveTheLaw",
    "Offworld Office": "offworldOfficeScore",
    "Orbital Superiority": "orbitalScore",
    "Send a Message": "sendAMessage",
    "Superconducting Hub": "superconductingHubScore",
    "Aggressive Trendsetting": "aggressiveTrendsettingScore",
    "Project Ingatan": "projectIngatanScore",
    Proprionegation: "proprionegationScore",
    "Sericulture Expansion": "sericultureScore",
    "Embedded Reporting": "embeddedReportingScore",
    "Next Big Thing": "nextBigThingScore",
    Greenmail: "greenmailScore",
    "Off the Books": "offTheBooksScore",
  },
};

let ok: boolean | undefined;
let off = false;

export function setGlOff(value: boolean) {
  off = value;
}
const hidden = new WeakMap<HTMLElement, number>();
const LIMIT = 6000;
const live = new Set<() => void>();
const landed = new WeakMap<Element, Element>();

export function handOff(from: Element, to: Element) {
  landed.set(from, to);
}

function covered(at: Element, r: DOMRect) {
  if (at.closest(".fx-layer")) return false;
  const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
  return !!top && !at.contains(top) && !top.contains(at);
}

function seen(el: Element) {
  const at = el.isConnected ? el : landed.get(el);
  const r = at?.isConnected ? at.getBoundingClientRect() : null;
  return r && r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && !covered(at!, r) ? r : null;
}

export function letGoEffects() {
  for (const f of live) f();
  live.clear();
}

function glOk() {
  if (off) return false;
  if (ok === undefined) {
    try {
      ok = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      ok = false;
    }
  }
  return ok;
}

const rect = (sel: string) => {
  const r = document.querySelector(sel)?.getBoundingClientRect();
  return r && r.width > 0 ? r : null;
};

function boardFor(owner: string | undefined, self: Element | null | undefined, strike?: Element | null): Board {
  const others = [...document.querySelectorAll(".playfield .tile[data-cid]")]
    .filter((el) => el !== self && !self?.contains(el))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.bottom > 0 && r.top < innerHeight);
  const radius = self ? parseFloat(getComputedStyle(self).borderTopLeftRadius) || 0 : 0;
  const a = aim();
  const tile = (cid: string) => rect(`.playfield .tile[data-cid="${CSS.escape(cid)}"]`);
  const cid = (self as HTMLElement | null | undefined)?.dataset?.cid;
  const host = cid ? a.hostOf.get(cid) : undefined;
  return {
    hand: owner ? rect(`[data-anchor="${owner}-hand"]`) : null,
    others,
    radius,
    dim: !!self?.classList.contains("unrezzed"),
    track: self ? () => seen(self) : undefined,
    advanced: a.advanced.map(tile).filter((r): r is DOMRect => !!r),
    gone: a.gone,
    host: host ? tile(host) : null,
    drained: a.corpLost > 0 ? rect('[data-anchor="corp-credits"]') : null,
    grip: a.gripLost > 0 ? rect('[data-anchor="runner-hand"]') : null,
    access: rect(".fx-showdown .fx-showcase"),
    runner: rect('[data-anchor="runner-panel"]'),
    strike: strike ? strike.getBoundingClientRect() : null,
    strikeTrack: strike ? () => (strike.isConnected ? strike.getBoundingClientRect() : null) : undefined,
  };
}

const plain = (title: string) => title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const fxName = (kind: Kind, title: string | undefined) => (title ? (FX[kind][title] ?? FX[kind][plain(title)]) : undefined);

export function hasGl(kind: Kind, title: string | undefined) {
  return !!fxName(kind, title) && !motionOff() && glOk();
}

export function glEffect(kind: Kind, title: string | undefined, at: DOMRect, code: string | undefined, hide?: HTMLElement | null, owner?: string, strike?: Element | null): Promise<void> | null {
  const name = fxName(kind, title);
  if (!name || !code || motionOff() || !glOk()) return null;
  const board = boardFor(owner, hide, strike);
  let restore = () => {};
  let over = false;
  const ready = () => {
    if (!hide || over) return;
    hidden.set(hide, (hidden.get(hide) ?? 0) + 1);
    hide.style.visibility = "hidden";
    restore = () => {
      restore = () => {};
      const n = (hidden.get(hide) ?? 1) - 1;
      if (n > 0) return void hidden.set(hide, n);
      hidden.delete(hide);
      hide.style.visibility = "";
    };
  };
  let freed: () => void = () => {};
  const early = new Promise<void>((r) => (freed = r));
  if (!strike) {
    let release: (() => void) | null = null;
    const until = Number(hide?.dataset.until) || 0;
    const shown = until > 0;
    const cap = Math.max(0, until - performance.now()) / 1000;
    if (shown) board.cap = cap;
    board.free = () => {
      restore();
      freed();
    };
    board.hook = (letGo) => {
      live.add(letGo);
      release = letGo;
      if (over) letGo();
    };
    if (shown && !(window as any).__fxManual)
      setTimeout(() => {
        over = true;
        if (release) release();
        else freed();
      }, cap * 1000);
  }
  const play = import("./cards").then((m) => (m as unknown as Record<string, (...a: unknown[]) => Promise<void>>)[name](at, code, ready, board)).catch((e) => console.error("fx", name, e));
  return Promise.race([play, early, new Promise<void>((r) => setTimeout(r, (window as any).__fxManual ? 6e5 : LIMIT))]).finally(() => {
    restore();
    if (board.hook) live.clear();
  });
}

export function warmGl() {
  if (motionOff() || !glOk()) return;
  const go = () => import("./cards").then((m) => m.warm()).catch(() => (ok = false));
  if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}
