import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { cardImage, type Side } from "../engine";
import { Count } from "../fx/ui";
import { Meter } from "../ui";
import { replayFx, setCardCodes } from "../fx/director";
import type { Info, Plan } from "../fx/cards";
import { FIRE, INSTALL, PLAY, REZ, SCORE } from "../fx/signatures";
import { tileEl } from "../fx/core";
import { motionOff, settings } from "../settings";

interface Card {
  title: string;
  code?: string;
  type: string;
  side: string;
  subtypes?: string[];
  agendapoints?: number;
}

interface Slot {
  cid: string;
  title: string;
  code?: string;
  type: string;
  subtypes?: string[];
  side: "Corp" | "Runner";
  zone: string[];
  rezzed?: boolean;
  strength?: number;
  adv?: number;
}

interface Model {
  slots: Slot[];
  credits: Record<Side, number>;
  clicks: Record<Side, number>;
  points: Record<Side, number>;
  tags: number;
  active: Side;
  run?: { server: string; position: number; phase: string };
  encounter?: { cid: string; count: number };
  winner?: Side;
  face?: string;
  hidden?: string[];
}

interface Move {
  cid: string;
  from?: string[];
  to?: string[];
  holder?: Side;
}

interface Scene {
  before: Model;
  after: Model;
  lines?: string[];
  me?: Side;
  move?: Move;
  then?: { lines: string[]; after: number };
}

interface Entry {
  id: string;
  label: string;
  group: string;
  code?: string;
  scene: () => Scene;
}

const plain = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

function base(): Model {
  return {
    slots: [
      { cid: "ice-barrier", title: "Ice Wall", type: "ICE", subtypes: ["Barrier"], side: "Corp", zone: ["servers", "remote1", "ices"], rezzed: true },
      { cid: "ice-gate", title: "Enigma", type: "ICE", subtypes: ["Code Gate"], side: "Corp", zone: ["servers", "remote1", "ices"], rezzed: true },
      { cid: "ice-sentry", title: "Archer", type: "ICE", subtypes: ["Sentry"], side: "Corp", zone: ["servers", "remote1", "ices"], rezzed: true },
      { cid: "asset", title: "PAD Campaign", type: "Asset", side: "Corp", zone: ["servers", "remote1", "content"], rezzed: false },
      { cid: "brk-fracter", title: "Corroder", type: "Program", subtypes: ["Icebreaker", "Fracter"], side: "Runner", zone: ["rig", "program"], strength: 2 },
      { cid: "brk-decoder", title: "Unity", type: "Program", subtypes: ["Icebreaker", "Decoder"], side: "Runner", zone: ["rig", "program"], strength: 1 },
      { cid: "brk-killer", title: "Carmen", type: "Program", subtypes: ["Icebreaker", "Killer"], side: "Runner", zone: ["rig", "program"], strength: 2 },
      { cid: "res", title: "Daily Casts", type: "Resource", side: "Runner", zone: ["rig", "resource"] },
      { cid: "hand-1", title: "Sure Gamble", type: "Event", side: "Runner", zone: ["hand"] },
      { cid: "hand-2", title: "Diesel", type: "Event", side: "Runner", zone: ["hand"] },
    ],
    credits: { corp: 8, runner: 5 },
    clicks: { corp: 0, runner: 4 },
    points: { corp: 2, runner: 1 },
    tags: 0,
    active: "runner",
    face: "front",
  };
}

const clone = (m: Model): Model => structuredClone(m);

function edit(m: Model, fn: (m: Model) => void) {
  const out = clone(m);
  fn(out);
  return out;
}

function slot(m: Model, cid: string) {
  return m.slots.find((s) => s.cid === cid)!;
}

function toView(m: Model, codes: Map<string, Card>) {
  const card = (s: Slot) => ({
    cid: s.cid,
    title: s.title,
    code: codes.get(plain(s.title))?.code,
    type: s.type,
    subtypes: s.subtypes ?? [],
    side: s.side,
    zone: s.zone,
    rezzed: s.rezzed,
    "current-strength": s.strength,
    "advance-counter": s.adv,
  });
  const at = (...zone: string[]) => m.slots.filter((s) => zone.every((z, i) => s.zone[i] === z)).map(card);
  const ice = m.encounter ? m.slots.find((s) => s.cid === m.encounter!.cid) : undefined;
  return {
    "active-player": m.active,
    winner: m.winner,
    corp: {
      credit: m.credits.corp,
      click: m.clicks.corp,
      "agenda-point": m.points.corp,
      identity: { cid: "id-corp", title: "Nebula Talent Management: Making Stars", type: "Identity", side: "Corp", face: m.face },
      hand: at("hand").filter((c) => c.side === "Corp"),
      servers: {
        hq: { ices: [], content: [] },
        remote1: { ices: at("servers", "remote1", "ices"), content: at("servers", "remote1", "content") },
      },
    },
    runner: {
      credit: m.credits.runner,
      click: m.clicks.runner,
      "agenda-point": m.points.runner,
      tag: { base: m.tags },
      hand: at("hand").filter((c) => c.side === "Runner"),
      rig: { program: at("rig", "program"), hardware: at("rig", "hardware"), resource: at("rig", "resource") },
    },
    run: m.run ? { server: [m.run.server], phase: m.run.phase, position: m.run.position } : undefined,
    encounters: ice ? { ice: card(ice), "encounter-count": m.encounter!.count } : undefined,
    log: [],
  };
}

function info(s: Slot | undefined, zone: string[] | undefined, holder: Side, codes: Map<string, Card>): Info | undefined {
  if (!s || !zone) return undefined;
  const c = codes.get(plain(s.title));
  return { cid: s.cid, zone: zone.join("/"), holder, owner: s.side === "Corp" ? "corp" : "runner", code: c?.code, type: s.type, title: s.title, facedown: false, points: c?.agendapoints ?? 0 };
}

function cardScene(card: Card, kind: string): Scene {
  const corp = card.side === "Corp";
  const me: Side = corp ? "corp" : "runner";
  const who = corp ? "Corp" : "Gerald";
  const subject: Slot = { cid: "subject", title: card.title, type: card.type, subtypes: card.subtypes, side: corp ? "Corp" : "Runner", zone: ["hand"] };
  const m = base();
  if (kind === "play") {
    const before = edit(m, (x) => x.slots.push({ ...subject }));
    const after = edit(m, (x) => x.slots.push({ ...subject, zone: ["play-area"] }));
    return { before, after, me, lines: [`${who} plays ${card.title}.`], move: { cid: "subject", from: ["hand"], to: ["play-area"], holder: me } };
  }
  if (kind === "install") {
    const zone = corp ? (card.type === "ICE" ? ["servers", "remote1", "ices"] : ["servers", "remote1", "content"]) : ["rig", card.type === "Hardware" ? "hardware" : card.type === "Resource" ? "resource" : "program"];
    const before = edit(m, (x) => x.slots.push({ ...subject }));
    const after = edit(m, (x) => x.slots.push({ ...subject, zone, rezzed: corp ? false : undefined }));
    return { before, after, me, lines: [`${who} installs ${card.title}.`], move: { cid: "subject", from: ["hand"], to: zone, holder: me } };
  }
  if (kind === "score") {
    const before = edit(m, (x) => x.slots.push({ ...subject, zone: ["servers", "remote1", "content"], adv: 3 }));
    const after = edit(m, (x) => {
      x.slots.push({ ...subject, zone: ["scored"] });
      x.points.corp += card.agendapoints ?? 2;
    });
    return { before, after, me: "corp", lines: [`Corp scores ${card.title} and gains ${card.agendapoints ?? 2} agenda points.`], move: { cid: "subject", from: ["servers", "remote1", "content"], to: ["scored"], holder: "corp" } };
  }
  if (kind === "rez") {
    const zone = card.type === "ICE" ? ["servers", "remote1", "ices"] : ["servers", "remote1", "content"];
    const before = edit(m, (x) => x.slots.push({ ...subject, zone, rezzed: false }));
    const after = edit(m, (x) => x.slots.push({ ...subject, zone, rezzed: true }));
    return { before, after, me: "runner", lines: [`Corp pays 3 [Credits] to rez ${card.title}.`] };
  }
  if (kind === "fire") {
    const zone = ["servers", "remote1", "ices"];
    const running = (x: Model) => {
      x.slots.push({ ...subject, zone, rezzed: true });
      x.run = { server: "remote1", position: 4, phase: "encounter-ice" };
      x.encounter = { cid: "subject", count: 1 };
    };
    const before = edit(m, running);
    const after = edit(before, () => {});
    const text = card.title === "Tithe" ? "do 1 net damage" : card.title === "Anoetic Void" ? "end the run" : "do 2 net damage";
    return { before, after, me: "runner", lines: [`Corp uses ${card.title} to ${text}.`] };
  }
  return { before: m, after: m };
}

function extraScenes(byPlain: Map<string, Card>): Entry[] {
  const code = (t: string) => byPlain.get(plain(t))?.code;
  const real = (t: string) => byPlain.get(plain(t));
  const out: Entry[] = [];
  const orbital = real("Orbital Superiority");
  if (orbital) out.push({ id: "c:orbital", label: orbital.title, group: "Score", code: orbital.code, scene: () => cardScene(orbital, "score") });
  const sam = real("Send a Message");
  if (sam)
    out.push({
      id: "c:sam",
      label: sam.title,
      group: "Score",
      code: sam.code,
      scene: () => {
        const s = cardScene(sam, "score");
        s.after = edit(s.after, (x) => (slot(x, "ice-gate").rezzed = true));
        s.before = edit(s.before, (x) => (slot(x, "ice-gate").rezzed = false));
        s.lines = [...(s.lines ?? []), "Corp uses Send a Message to rez Enigma."];
        return s;
      },
    });
  const leech = real("Leech");
  if (leech)
    out.push({
      id: "c:leech",
      label: leech.title,
      group: "Use",
      code: leech.code,
      scene: () => {
        const before = edit(base(), (x) => {
          x.slots.push({ cid: "leech", title: "Leech", type: "Program", side: "Runner", zone: ["rig", "program"] });
          x.run = { server: "remote1", position: 3, phase: "encounter-ice" };
          x.encounter = { cid: "ice-sentry", count: 1 };
        });
        return { before, after: before, me: "runner", lines: ["Gerald uses Leech to give -1 strength to Archer."] };
      },
    });
  const planogram = real("Predictive Planogram");
  if (planogram)
    for (const [key, text] of [["gain", "gain 3 [Credits]"], ["draw", "draw 3 cards"], ["both", "gain 3 [Credits] and draw 3 cards"]])
      out.push({
        id: `c:planogram-${key}`,
        label: `${planogram.title} · ${text.replace(" [Credits]", "¢")}`,
        group: "Use",
        code: planogram.code,
        scene: () => {
          const before = base();
          const after = edit(before, (x) => {
            if (key !== "draw") x.credits.corp += 3;
          });
          return { before, after, me: "runner", lines: [`Corp uses Predictive Planogram to ${text}.`] };
        },
      });
  const regolith = real("Regolith Mining License");
  if (regolith)
    out.push({
      id: "c:regolith",
      label: regolith.title,
      group: "Use",
      code: regolith.code,
      scene: () => {
        const before = edit(base(), (x) => x.slots.push({ cid: "regolith", title: regolith.title, type: "Asset", side: "Corp", zone: ["servers", "remote1", "content"], rezzed: true }));
        const after = edit(before, (x) => (x.credits.corp += 3));
        return { before, after, me: "runner", lines: ["Corp uses Regolith Mining License to take 3 [Credits]."] };
      },
    });
  const cleaver = real("Cleaver");
  if (cleaver)
    out.push({
      id: "c:cleaver",
      label: cleaver.title,
      group: "Use",
      code: cleaver.code,
      scene: () => {
        const before = edit(base(), (x) => {
          x.slots.push({ cid: "cleaver", title: "Cleaver", type: "Program", subtypes: ["Icebreaker", "Fracter"], side: "Runner", zone: ["rig", "program"], strength: 3 });
          x.run = { server: "remote1", position: 1, phase: "encounter-ice" };
          x.encounter = { cid: "ice-barrier", count: 1 };
        });
        return { before, after: before, me: "runner", lines: ["Gerald pays 2 [Credits] to use Cleaver to break 2 subroutines on Ice Wall."] };
      },
    });
  const snare = real("Snare!");
  if (snare)
    out.push({
      id: "c:snare",
      label: snare.title,
      group: "Use",
      code: snare.code,
      scene: () => {
        const before = edit(base(), (x) => x.slots.push({ cid: "snare", title: "Snare!", type: "Asset", side: "Corp", zone: ["servers", "remote1", "content"], rezzed: false }));
        const after = edit(before, (x) => (x.tags += 1));
        return { before, after, me: "runner", lines: ["Corp uses Snare! to do 3 net damage and give the Runner 1 tag."] };
      },
    });
  return out.map((e) => ({ ...e, code: e.code ?? code(e.label) }));
}

function generic(byPlain: Map<string, Card>, plainEvent: string, plainAgenda: string, plainIce: string): Entry[] {
  const g = (label: string, group: string, scene: () => Scene): Entry => ({ id: `g:${label}`, label, group, scene });
  const run = (x: Model, position = 3, ice = "ice-sentry") => {
    x.run = { server: "remote1", position, phase: "encounter-ice" };
    x.encounter = { cid: ice, count: 1 };
  };
  const event = byPlain.get(plainEvent)!;
  const agenda = byPlain.get(plainAgenda)!;
  const ice = byPlain.get(plainIce)!;
  return [
    g("Your turn begins", "Turn", () => ({ before: edit(base(), (x) => (x.active = "corp")), after: base(), me: "runner" })),
    g("Opponent's turn begins", "Turn", () => ({ before: base(), after: edit(base(), (x) => ((x.active = "corp"), (x.clicks.corp = 3))), me: "runner" })),
    g("Gain 1 credit", "Credits", () => ({ before: base(), after: edit(base(), (x) => ((x.credits.runner += 1), (x.clicks.runner -= 1))), me: "runner" })),
    g("Gain 9 credits", "Credits", () => ({ before: base(), after: edit(base(), (x) => (x.credits.runner += 9)), me: "runner" })),
    g("Spend credits", "Credits", () => ({ before: base(), after: edit(base(), (x) => (x.credits.runner -= 3)), me: "runner" })),
    g("Corp gains credits", "Credits", () => ({ before: base(), after: edit(base(), (x) => (x.credits.corp += 3)), me: "runner" })),
    g("Draw a card", "Cards", () => {
      const before = base();
      const after = edit(base(), (x) => {
        x.slots.push({ cid: "drawn", title: "Dirty Laundry", type: "Event", side: "Runner", zone: ["hand"] });
        x.clicks.runner -= 1;
      });
      return { before, after, me: "runner", move: { cid: "drawn", from: ["deck"], to: ["hand"], holder: "runner" } };
    }),
    g("Install a program", "Cards", () => cardScene({ title: "Gordian Blade", type: "Program", side: "Runner", subtypes: ["Icebreaker", "Decoder"] }, "install")),
    g("Install a piece of ice", "Cards", () => cardScene({ title: "Hadrian's Wall", type: "ICE", side: "Corp", subtypes: ["Barrier"] }, "install")),
    g("Play an event", "Cards", () => cardScene(event, "play")),
    g("Trash an installed card", "Cards", () => {
      const before = base();
      const after = edit(base(), (x) => (slot(x, "res").zone = ["discard"]));
      return { before, after, me: "runner", lines: ["Corp trashes Daily Casts."], move: { cid: "res", from: ["rig", "resource"], to: ["discard"], holder: "runner" } };
    }),
    g("Discard from hand", "Cards", () => {
      const before = base();
      const after = edit(base(), (x) => (slot(x, "hand-2").zone = ["discard"]));
      return { before, after, me: "runner", lines: ["Gerald discards Diesel."], move: { cid: "hand-2", from: ["hand"], to: ["discard"], holder: "runner" } };
    }),
    g("Score an agenda", "Agendas", () => cardScene(agenda, "score")),
    g("Steal an agenda", "Agendas", () => {
      const before = edit(base(), (x) => x.slots.push({ cid: "stolen", title: agenda.title, type: "Agenda", side: "Corp", zone: ["servers", "remote1", "content"] }));
      const after = edit(base(), (x) => {
        x.slots.push({ cid: "stolen", title: agenda.title, type: "Agenda", side: "Corp", zone: ["scored"] });
        x.points.runner += agenda.agendapoints ?? 2;
      });
      return { before, after, me: "runner", lines: [`Gerald steals ${agenda.title} and gains ${agenda.agendapoints ?? 2} agenda points.`], move: { cid: "stolen", from: ["servers", "remote1", "content"], to: ["scored"], holder: "runner" } };
    }),
    g("Advance a card", "Agendas", () => ({ before: base(), after: edit(base(), (x) => (slot(x, "asset").adv = 1)), me: "runner" })),
    g("Rez a piece of ice", "Rez", () => cardScene(ice, "rez")),
    g("Rez an asset", "Rez", () => ({ before: base(), after: edit(base(), (x) => (slot(x, "asset").rezzed = true)), me: "runner" })),
    g("Derez", "Rez", () => ({ before: base(), after: edit(base(), (x) => (slot(x, "ice-gate").rezzed = false)), me: "runner", lines: ["Gerald derezzes Enigma."] })),
    g("Make a run", "Run", () => ({ before: base(), after: edit(base(), (x) => (x.run = { server: "remote1", position: 3, phase: "approach-ice" })), me: "runner" })),
    g("Encounter a piece of ice", "Run", () => ({ before: edit(base(), (x) => (x.run = { server: "remote1", position: 3, phase: "approach-ice" })), after: edit(base(), (x) => run(x)), me: "runner" })),
    g("Pump breaker strength", "Run", () => {
      const before = edit(base(), (x) => run(x, 1, "ice-barrier"));
      const after = edit(before, (x) => (slot(x, "brk-fracter").strength = 4));
      return { before, after, me: "runner", lines: ["Gerald pays 2 [Credits] to use Corroder to add 2 strength."] };
    }),
    g("Break with a killer", "Run", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => run(x)), me: "runner", lines: ["Gerald pays 1 [Credits] to use Carmen to break 1 subroutine on Archer."] })),
    g("Break with a fracter", "Run", () => ({ before: edit(base(), (x) => run(x, 1, "ice-barrier")), after: edit(base(), (x) => run(x, 1, "ice-barrier")), me: "runner", lines: ["Gerald pays 1 [Credits] to use Corroder to break 1 subroutine on Ice Wall."] })),
    g("Break with a decoder", "Run", () => ({ before: edit(base(), (x) => run(x, 2, "ice-gate")), after: edit(base(), (x) => run(x, 2, "ice-gate")), me: "runner", lines: ["Gerald pays 1 [Credits] to use Unity to break 1 subroutine on Enigma."] })),
    g("Break every subroutine", "Run", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => run(x)), me: "runner", lines: ["Gerald pays 3 [Credits] to use Carmen to break all 3 subroutines on Archer."] })),
    g("Pass a piece of ice", "Run", () => ({ before: edit(base(), (x) => run(x, 3)), after: edit(base(), (x) => ((x.run = { server: "remote1", position: 2, phase: "approach-ice" }), (x.encounter = { cid: "ice-gate", count: 1 }))), me: "runner" })),
    g("Subroutine: end the run", "Subroutines", () => ({ before: edit(base(), (x) => run(x, 1, "ice-barrier")), after: edit(base(), (x) => run(x, 1, "ice-barrier")), me: "runner", lines: ["Corp uses Ice Wall to end the run."] })),
    g("Subroutine: net damage", "Subroutines", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => run(x)), me: "runner", lines: ["Corp uses Archer to do 2 net damage."] })),
    g("Subroutine: trash a program", "Subroutines", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => run(x)), me: "runner", lines: ["Corp uses Archer to trash 1 installed program."] })),
    g("Subroutine: lose credits", "Subroutines", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => ((x.credits.runner -= 3), run(x))), me: "runner", lines: ["Corp uses Archer to make the Runner lose 3 [Credits]."] })),
    g("Subroutine: give a tag", "Subroutines", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => ((x.tags += 1), run(x))), me: "runner", lines: ["Corp uses Archer to give the Runner 1 tag."] })),
    g("Subroutine: derez", "Subroutines", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => run(x)), me: "runner", lines: ["Corp uses Archer to derez Daily Casts."] })),
    g("Net damage", "Damage", () => ({ before: base(), after: base(), me: "runner", lines: ["Corp does 2 net damage."] })),
    g("Meat damage", "Damage", () => ({ before: base(), after: base(), me: "runner", lines: ["Corp does 2 meat damage."] })),
    g("Core damage", "Damage", () => ({ before: base(), after: base(), me: "runner", lines: ["Corp does 1 core damage."] })),
    g("Tag received", "Tags", () => ({ before: base(), after: edit(base(), (x) => (x.tags += 1)), me: "runner" })),
    g("Tag removed", "Tags", () => ({ before: edit(base(), (x) => (x.tags = 1)), after: base(), me: "runner", lines: ["Gerald removes 1 tag."] })),
    g("Jack out", "Run end", () => ({ before: edit(base(), (x) => run(x)), after: base(), me: "runner", lines: ["Gerald jacks out."] })),
    g("Run ended", "Run end", () => ({ before: edit(base(), (x) => run(x)), after: base(), me: "runner" })),
    g("Breach (Runner)", "Run end", () => ({ before: edit(base(), (x) => ((x.run = { server: "remote1", position: 0, phase: "approach-server" }))), after: base(), me: "runner", lines: ["Gerald breaches Server 1."] })),
    g("Breach (Corp)", "Run end", () => ({ before: edit(base(), (x) => ((x.run = { server: "remote1", position: 0, phase: "approach-server" }))), after: base(), me: "corp", lines: ["Gerald breaches Server 1."] })),
    g("Card accessed (Corp view)", "Run end", () => ({ before: base(), after: base(), me: "corp", lines: [`Gerald accesses ${agenda.title} from HQ.`], then: { lines: ["Gerald's run on HQ ends."], after: 2500 } })),
    g("R&D card left in place (Corp view)", "Run end", () => ({ before: base(), after: base(), me: "corp", lines: [`Gerald accesses ${agenda.title} from R&D.`], then: { lines: ["Gerald's run on R&D ends."], after: 2000 } })),
    g("Unseen R&D card trashed (Corp view)", "Run end", () => ({ before: base(), after: base(), me: "corp", lines: ["Gerald accesses an unseen card from R&D."], then: { lines: ["Gerald pays 0 [Credits] to trash Hedge Fund from R&D."], after: 2000 } })),
    g("Unseen R&D card stolen (Corp view)", "Run end", () => ({ before: base(), after: base(), me: "corp", lines: ["Gerald accesses an unseen card from R&D."], then: { lines: [`Gerald steals ${agenda.title} from R&D.`], after: 2000 } })),
    g("Purge virus counters", "Other", () => ({ before: base(), after: base(), me: "runner", lines: ["Corp purges virus counters."] })),
    g("Expose a card", "Other", () => ({ before: base(), after: base(), me: "runner", lines: ["Gerald exposes PAD Campaign."] })),
    g("Identity flips", "Other", () => ({ before: base(), after: edit(base(), (x) => (x.face = "back")), me: "runner" })),
    g("Victory", "Game end", () => ({ before: base(), after: edit(base(), (x) => (x.winner = "runner")), me: "runner" })),
    g("Defeat", "Game end", () => ({ before: base(), after: edit(base(), (x) => (x.winner = "corp")), me: "runner" })),
  ];
}

function Tile({ s, codes, hidden }: { s: Slot; codes: Map<string, Card>; hidden?: boolean }) {
  const code = codes.get(plain(s.title))?.code;
  const faceup = s.side === "Runner" || s.rezzed !== false;
  return (
    <div class="tile-wrap" style={hidden ? { visibility: "hidden" } : undefined}>
      <div class={`tile fxlab-tile ${s.side === "Corp" ? "corp" : "runner"}`} data-cid={s.cid}>
        {faceup && code ? <img class="card-image" src={cardImage(code, "small")} alt={s.title} crossOrigin="anonymous" /> : <span class="fxlab-back">{s.side === "Corp" ? "CORP" : "RUNNER"}</span>}
      </div>
      {s.adv ? <span class="fxlab-adv">▲ {s.adv}</span> : null}
    </div>
  );
}

function Board({ m, codes }: { m: Model; codes: Map<string, Card> }) {
  const at = (...zone: string[]) => m.slots.filter((s) => zone.every((z, i) => s.zone[i] === z));
  const pips = (side: Side, n: number) => (
    <div class="fxlab-points" data-anchor={`${side}-points`}>
      {Array.from({ length: 7 }, (_, i) => (
        <i class={i < n ? "on" : ""} />
      ))}
    </div>
  );
  return (
    <div class="fxlab-board">
      <div class="fxlab-panel" data-anchor="corp-panel">
        <span class="big">
          <Count value={m.credits.corp} anchor="corp-credits" />
        </span>
        <Meter value={m.clicks.corp} max={3} anchor="corp-clicks" />
        {pips("corp", m.points.corp)}
        <span class="fxlab-pile" data-anchor="corp-deck">
          R&D
        </span>
        <span class="fxlab-pile" data-anchor="corp-hand">
          HQ
        </span>
      </div>
      <div class={`server fxlab-server ${m.run ? "running" : ""}`}>
        <div class="tile-wrap">
          <div class="tile fxlab-tile corp" data-cid="id-corp">
            <img class="card-image" src={cardImage(m.face === "back" ? "35057-0" : "35057", "small")} alt="Identity" crossOrigin="anonymous" />
          </div>
        </div>
        {at("servers", "remote1", "ices").map((s) => (
          <Tile s={s} codes={codes} hidden={m.hidden?.includes(s.cid)} />
        ))}
        {at("servers", "remote1", "content").map((s) => (
          <Tile s={s} codes={codes} hidden={m.hidden?.includes(s.cid)} />
        ))}
      </div>
      <div class="fxlab-rig">
        {at("rig").map((s) => (
          <Tile s={s} codes={codes} hidden={m.hidden?.includes(s.cid)} />
        ))}
      </div>
      <div class="fxlab-hand" data-anchor="runner-hand">
        {at("hand").map((s) => (
          <Tile s={s} codes={codes} hidden={m.hidden?.includes(s.cid)} />
        ))}
      </div>
      <div class="fxlab-panel" data-anchor="runner-panel">
        <span class="big">
          <Count value={m.credits.runner} anchor="runner-credits" />
        </span>
        <Meter value={m.clicks.runner} max={4} anchor="runner-clicks" />
        {pips("runner", m.points.runner)}
        <span class="fxlab-pile" data-anchor="runner-deck">
          Stack
        </span>
        <span class="fxlab-tags">{m.tags ? `${m.tags} tag` : ""}</span>
      </div>
    </div>
  );
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export function FxLab() {
  const [cards, setCards] = useState<Card[]>();
  const [model, setModel] = useState<Model>(base);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [current, setCurrent] = useState<string>();
  const [auto, setAuto] = useState(false);
  const busy = useRef(false);
  const pending = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const replay = pending.current;
    pending.current = null;
    replay?.();
  }, [model]);

  useEffect(() => {
    fetch("data/cards.json")
      .then((r) => r.json())
      .then((all: Card[]) => setCards(all));
  }, []);

  const byPlain = useMemo(() => new Map((cards ?? []).map((c) => [plain(c.title), c])), [cards]);

  const entries = useMemo<Entry[]>(() => {
    if (!cards) return [];
    const animated = new Set([...Object.keys(PLAY), ...Object.keys(SCORE), ...Object.keys(REZ), ...Object.keys(INSTALL), ...FIRE]);
    const pick = (type: string, side: string) => cards.find((c) => c.type === type && c.side === side && !animated.has(plain(c.title)) && c.code)?.title ?? "";
    const list = generic(byPlain, plain(pick("Event", "Runner")), plain(pick("Agenda", "Corp")), plain(pick("ICE", "Corp")));
    const add = (titles: string[], kind: string, label: string) => {
      for (const t of titles) {
        const c = byPlain.get(t);
        if (c) list.push({ id: `c:${kind}:${t}`, label: c.title, group: label, code: c.code, scene: () => cardScene(c, kind) });
      }
    };
    add(Object.keys(PLAY), "play", "Play");
    add(Object.keys(INSTALL), "install", "Install");
    add(Object.keys(REZ), "rez", "Rez");
    add(Object.keys(SCORE), "score", "Score");
    add(FIRE, "fire", "Subroutine");
    list.push(...extraScenes(byPlain));
    return list;
  }, [cards, byPlain]);

  const groups = useMemo(() => ["All", ...new Set(entries.map((e) => e.group))], [entries]);
  const shown = entries.filter((e) => (group === "All" || e.group === group) && (!query || e.label.toLowerCase().includes(query.toLowerCase())));

  async function run(e: Entry) {
    if (busy.current) return;
    busy.current = true;
    setCurrent(e.id);
    document.querySelector(".fx-layer")?.replaceChildren();
    const scene = e.scene();
    const me = scene.me ?? "runner";
    const known = new Set(base().slots.map((x) => x.cid));
    setModel({ ...scene.before, hidden: scene.before.slots.filter((x) => !known.has(x.cid)).map((x) => x.cid) });
    await frame();
    let plan: Plan | undefined;
    if (scene.move) {
      const mv = scene.move;
      const holder = mv.holder ?? me;
      const src = mv.from?.[0] === "deck" ? document.querySelector(`[data-anchor="${holder}-deck"]`)?.getBoundingClientRect() : tileEl(mv.cid)?.getBoundingClientRect();
      const s = scene.after.slots.find((x) => x.cid === mv.cid) ?? scene.before.slots.find((x) => x.cid === mv.cid);
      plan = { moves: [{ cid: mv.cid, from: info(s, mv.from, holder, byPlain), to: info(s, mv.to, holder, byPlain), src: src ?? null, clone: null }] };
    }
    setCardCodes((t) => byPlain.get(plain(t))?.code);
    pending.current = () => {
      replayFx(toView(scene.before, byPlain), toView(scene.after, byPlain), me, scene.lines ?? [], plan);
      const then = scene.then;
      if (then) setTimeout(() => replayFx(toView(scene.after, byPlain), toView(scene.after, byPlain), me, then.lines), then.after);
    };
    setModel(scene.after);
    setTimeout(() => (busy.current = false), 400);
  }

  useEffect(() => {
    if (!auto) return;
    let i = Math.max(0, shown.findIndex((e) => e.id === current) + 1);
    let stop = false;
    const step = async () => {
      if (stop || i >= shown.length) return setAuto(false);
      await run(shown[i++]);
      setTimeout(step, 2800);
    };
    step();
    return () => {
      stop = true;
    };
  }, [auto]);

  return (
    <div class="fxlab">
      <Board m={model} codes={byPlain} />
      <div class="fxlab-controls">
        <div class="fxlab-row">
          <input class="fxlab-search" placeholder={`Search ${entries.length} animations`} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
          <button class={auto ? "primary" : ""} onClick={() => setAuto(!auto)}>
            {auto ? "Stop" : "Play all"}
          </button>
        </div>
        <div class="fxlab-groups">
          {groups.map((g) => (
            <button class={g === group ? "on" : ""} onClick={() => setGroup(g)}>
              {g}
            </button>
          ))}
        </div>
        {motionOff() && <p class="fxlab-note">Animations are turned off in Settings, so only sounds will play.</p>}
        {!settings.sound && <p class="fxlab-note">Sounds are turned off in Settings.</p>}
      </div>
      <div class="fxlab-list">
        {shown.map((e) => (
          <button class={`fxlab-item ${e.id === current ? "on" : ""}`} onClick={() => run(e)}>
            {e.code ? <img src={cardImage(e.code, "small")} alt="" loading="lazy" crossOrigin="anonymous" /> : <span class="fxlab-dot" />}
            <span>
              <b>{e.label}</b>
              <small>{e.group}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
