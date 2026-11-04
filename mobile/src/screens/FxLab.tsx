import { useEffect, useMemo, useState } from "preact/hooks";
import type { Side } from "../engine";
import { FIRE, INSTALL, PLAY, REZ, SCORE } from "../fx/signatures";
import { motionOff, settings } from "../settings";
import { Icon } from "../icons";
import { DockButton, LabScene, LabSheet, useSwipe } from "./LabScene";
import { ReviewBox, useReviews } from "./labReview";

export interface Card {
  title: string;
  text?: string;
  set_code?: string;
  setname?: string;
  code?: string;
  type: string;
  side: string;
  subtypes?: string[];
  agendapoints?: number;
}

export interface Slot {
  cid: string;
  title: string;
  code?: string;
  type: string;
  subtypes?: string[];
  side: "Corp" | "Runner";
  zone: string[];
  holder?: Side;
  rezzed?: boolean;
  virus?: number;
  strength?: number;
  adv?: number;
}

export interface Model {
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

export interface Scene {
  before: Model;
  after: Model;
  lines?: string[];
  me?: Side;
  move?: Move;
  then?: { lines: string[]; after: number };
}

export interface Entry {
  id: string;
  label: string;
  group: string;
  code?: string;
  scene: () => Scene;
}

export const plain = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function base(): Model {
  return {
    slots: [
      { cid: "ice-barrier", title: "Ice Wall", type: "ICE", subtypes: ["Barrier"], side: "Corp", zone: ["servers", "remote1", "ices"], rezzed: true },
      { cid: "ice-gate", title: "Enigma", type: "ICE", subtypes: ["Code Gate"], side: "Corp", zone: ["servers", "remote1", "ices"], rezzed: true },
      { cid: "ice-sentry", title: "Archer", type: "ICE", subtypes: ["Sentry"], side: "Corp", zone: ["servers", "remote1", "ices"], rezzed: true },
      { cid: "asset", title: "PAD Campaign", type: "Asset", side: "Corp", zone: ["servers", "remote1", "content"], rezzed: false },
      { cid: "brk-fracter", title: "Corroder", type: "Program", subtypes: ["Icebreaker", "Fracter"], side: "Runner", zone: ["rig", "program"], strength: 2 },
      { cid: "brk-decoder", title: "Gordian Blade", type: "Program", subtypes: ["Icebreaker", "Decoder"], side: "Runner", zone: ["rig", "program"], strength: 2 },
      { cid: "brk-killer", title: "Mimic", type: "Program", subtypes: ["Icebreaker", "Killer"], side: "Runner", zone: ["rig", "program"], strength: 3 },
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

const BREAKS: [string, string, number, string][] = [
  ["Fracter", "ice-barrier", 1, "Ice Wall"],
  ["Decoder", "ice-gate", 2, "Enigma"],
  ["Killer", "ice-sentry", 3, "Archer"],
];

function ability(card: Card) {
  const text = (card.text ?? "").replace(/<[^>]+>/g, "");
  const raw = text.match(/\[click\][^:\n]*:\s*([^.\n]+)/i)?.[1] ?? text.match(/(?:^|\n)(?:[^:\n]{0,40}):\s*([^.\n]+)/)?.[1] ?? text.match(/you may ([^.\n]+)/i)?.[1];
  if (!raw) return { line: "use its ability", credits: 0 };
  const line = raw.charAt(0).toLowerCase() + raw.slice(1);
  return { line: line.replace(/\[credit\]/gi, " [Credits]"), credits: Number(line.match(/(?:gain|take) (\d+)\s*\[credit/i)?.[1] ?? 0) };
}

function useScene(card: Card, m: Model): Scene {
  const { line, credits } = ability(card);
  if (card.side === "Corp") {
    const before = edit(m, (x) => x.slots.push({ cid: "subject", title: card.title, type: card.type, subtypes: card.subtypes, side: "Corp", zone: ["servers", "remote1", "content"], rezzed: true }));
    return { before, after: edit(before, (x) => (x.credits.corp += credits)), me: "runner", lines: [`Corp uses ${card.title} to ${line}.`] };
  }
  const zone = ["rig", card.type === "Hardware" ? "hardware" : card.type === "Resource" ? "resource" : "program"];
  const subject: Slot = { cid: "subject", title: card.title, type: card.type, subtypes: card.subtypes, side: "Runner", zone, strength: 3 };
  if ((card.subtypes ?? []).includes("Icebreaker")) {
    const [, ice, position, iceTitle] = BREAKS.find(([t]) => card.subtypes?.includes(t)) ?? BREAKS[2];
    const before = edit(m, (x) => {
      x.slots.push(subject);
      x.run = { server: "remote1", position, phase: "encounter-ice" };
      x.encounter = { cid: ice, count: 1 };
    });
    return { before, after: before, me: "runner", lines: [`Gerald pays 1 [Credits] to use ${card.title} to break 1 subroutine on ${iceTitle}.`] };
  }
  const before = edit(m, (x) => x.slots.push(subject));
  return { before, after: edit(before, (x) => (x.credits.runner += credits)), me: "runner", lines: [`Gerald uses ${card.title} to ${line}.`] };
}

export function cardScene(card: Card, kind: string): Scene {
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
    const sub = card.text?.match(/\[subroutine\]\s*([^\n]+)/i)?.[1].replace(/<[^>]+>/g, "").replace(/\.$/, "");
    const text = sub ? sub.charAt(0).toLowerCase() + sub.slice(1) : "end the run";
    return { before, after, me: "runner", lines: [`Corp uses ${card.title} to ${text}.`] };
  }
  if (kind === "use") return useScene(card, m);
  return { before: m, after: m };
}

export function extraScenes(byPlain: Map<string, Card>): Entry[] {
  const code = (t: string) => byPlain.get(plain(t))?.code;
  const real = (t: string) => byPlain.get(plain(t));
  const out: Entry[] = [];
  const orbital = real("Orbital Superiority");
  if (orbital) out.push({ id: "c:orbital", label: orbital.title, group: "Score", code: orbital.code, scene: () => cardScene(orbital, "score") });
  const atl = real("Above the Law");
  if (atl)
    out.push({
      id: "c:atl",
      label: atl.title,
      group: "Score",
      code: atl.code,
      scene: () => {
        const s = cardScene(atl, "score");
        s.after = edit(s.after, (x) => (slot(x, "res").zone = ["discard"]));
        s.lines = [...(s.lines ?? []), "Corp uses Above the Law to trash Daily Casts."];
        return s;
      },
    });
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

export function generic(byPlain: Map<string, Card>, plainEvent: string, plainAgenda: string, plainIce: string): Entry[] {
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
        x.slots.push({ cid: "stolen", title: agenda.title, type: "Agenda", side: "Corp", zone: ["scored"], holder: "runner" });
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
    g("Break with a killer", "Run", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => run(x)), me: "runner", lines: ["Gerald pays 1 [Credits] to use Mimic to break 1 subroutine on Archer."] })),
    g("Break with a fracter", "Run", () => ({ before: edit(base(), (x) => run(x, 1, "ice-barrier")), after: edit(base(), (x) => run(x, 1, "ice-barrier")), me: "runner", lines: ["Gerald pays 1 [Credits] to use Corroder to break 1 subroutine on Ice Wall."] })),
    g("Break with a decoder", "Run", () => ({ before: edit(base(), (x) => run(x, 2, "ice-gate")), after: edit(base(), (x) => run(x, 2, "ice-gate")), me: "runner", lines: ["Gerald pays 1 [Credits] to use Gordian Blade to break 1 subroutine on Enigma."] })),
    g("Break every subroutine", "Run", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => run(x)), me: "runner", lines: ["Gerald pays 2 [Credits] to use Mimic to break all 2 subroutines on Archer."] })),
    g("Pass a piece of ice", "Run", () => ({ before: edit(base(), (x) => run(x, 3)), after: edit(base(), (x) => ((x.run = { server: "remote1", position: 2, phase: "approach-ice" }), (x.encounter = { cid: "ice-gate", count: 1 }))), me: "runner" })),
    g("Subroutine: end the run", "Subroutines", () => ({ before: edit(base(), (x) => run(x, 1, "ice-barrier")), after: edit(base(), (x) => run(x, 1, "ice-barrier")), me: "runner", lines: ["Corp uses Ice Wall to end the run."] })),
    g("Subroutine: net damage", "Subroutines", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => run(x)), me: "runner", lines: ["Corp uses Archer to do 2 net damage."] })),
    g("Subroutine: trash a program", "Subroutines", () => {
      const before = edit(base(), (x) => run(x));
      const after = edit(before, (x) => (slot(x, "brk-decoder").zone = ["discard"]));
      return { before, after, me: "runner", lines: ["Corp uses Archer to trash Gordian Blade."], move: { cid: "brk-decoder", from: ["rig", "program"], to: ["discard"], holder: "runner" } };
    }),
    g("Subroutine: lose credits", "Subroutines", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => ((x.credits.runner -= 3), run(x))), me: "runner", lines: ["Corp uses Archer to make the Runner lose 3 [Credits]."] })),
    g("Subroutine: give a tag", "Subroutines", () => ({ before: edit(base(), (x) => run(x)), after: edit(base(), (x) => ((x.tags += 1), run(x))), me: "runner", lines: ["Corp uses Archer to give the Runner 1 tag."] })),
    g("Subroutine: derez", "Subroutines", () => {
      const before = edit(base(), (x) => run(x));
      return { before, after: edit(before, (x) => (slot(x, "ice-gate").rezzed = false)), me: "runner", lines: ["Corp uses Archer to derez Enigma."] };
    }),
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
    g("Purge virus counters", "Other", () => {
      const sucker: Slot = { cid: "virus", title: "Datasucker", type: "Program", subtypes: ["Virus"], side: "Runner", zone: ["rig", "program"], virus: 3 };
      const before = edit(base(), (x) => x.slots.push(sucker));
      return { before, after: edit(base(), (x) => x.slots.push({ ...sucker, virus: 0 })), me: "runner", lines: ["Corp purges virus counters."] };
    }),
    g("Expose a card", "Other", () => ({ before: base(), after: base(), me: "runner", lines: ["Gerald exposes PAD Campaign."] })),
    g("Identity flips", "Other", () => ({ before: base(), after: edit(base(), (x) => (x.face = "back")), me: "corp" })),
    g("Victory", "Game end", () => ({ before: base(), after: edit(base(), (x) => (x.winner = "runner")), me: "runner" })),
    g("Defeat", "Game end", () => ({ before: base(), after: edit(base(), (x) => (x.winner = "corp")), me: "runner" })),
  ];
}

export type SceneScope = "game" | "runs";

const RUN_GROUPS = new Set(["Run", "Subroutines", "Run end"]);

export function useLabCards() {
  const [cards, setCards] = useState<Card[]>();
  useEffect(() => {
    fetch("data/cards.json")
      .then((r) => r.json())
      .then((all: Card[]) => setCards(all))
      .catch(() => setCards([]));
  }, []);
  const byPlain = useMemo(() => new Map((cards ?? []).map((c) => [plain(c.title), c])), [cards]);
  return { cards, byPlain };
}

export function FxLab({ scope }: { scope: SceneScope }) {
  const { cards, byPlain } = useLabCards();
  const reviews = useReviews();
  const [group, setGroup] = useState("All");
  const [current, setCurrent] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [auto, setAuto] = useState(false);
  const [sheet, setSheet] = useState<"list" | "review" | null>(null);

  const entries = useMemo<Entry[]>(() => {
    if (!cards) return [];
    const animated = new Set([...Object.keys(PLAY), ...Object.keys(SCORE), ...Object.keys(REZ), ...Object.keys(INSTALL), ...FIRE]);
    const pick = (type: string, side: string) => cards.find((c) => c.type === type && c.side === side && !animated.has(plain(c.title)) && c.code)?.title ?? "";
    return generic(byPlain, plain(pick("Event", "Runner")), plain(pick("Agenda", "Corp")), plain(pick("ICE", "Corp"))).filter((e) => RUN_GROUPS.has(e.group) === (scope === "runs"));
  }, [cards, byPlain, scope]);

  const groups = useMemo(() => ["All", ...new Set(entries.map((e) => e.group))], [entries]);
  const shown = entries.filter((e) => group === "All" || e.group === group);
  const entry = shown[Math.min(current, shown.length - 1)];
  const label = scope === "runs" ? "Runs" : "Game";
  const keyOf = (e: Entry) => `${label} · ${e.label}`;
  const scene = useMemo(() => entry?.scene(), [entry, nonce]);
  const go = (i: number) => {
    setCurrent((i + shown.length) % shown.length);
    setNonce((n) => n + 1);
  };
  const swipe = useSwipe((dir) => go(current + dir));

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => (current + 1 < shown.length ? go(current + 1) : setAuto(false)), 2800);
    return () => clearTimeout(t);
  }, [auto, current, nonce]);

  if (!entry) return <div class="lab-loading label">Loading…</div>;
  const at = Math.min(current, shown.length - 1);
  return (
    <div class="lab-view">
      <div class="lab-stage" {...swipe}>
        <LabScene scene={scene} byPlain={byPlain} />
      </div>
      <header class="lab-bar">
        <button class="lab-nav" onClick={() => go(current - 1)} aria-label="Previous scene">
          <Icon name="chevron-left" />
        </button>
        <button class="lab-title" onClick={() => setSheet("list")}>
          <span class="label">
            {entry.group} · {at + 1}/{shown.length}
          </span>
          <strong>{entry.label}</strong>
        </button>
        <button class="lab-nav" onClick={() => go(current + 1)} aria-label="Next scene">
          <Icon name="chevron-right" />
        </button>
      </header>
      {(motionOff() || !settings.sound) && <p class="fxlab-note">{motionOff() ? "Animations are turned off in Settings, so only sounds will play." : "Sounds are turned off in Settings."}</p>}
      <nav class="lab-dock">
        <DockButton icon="play" label="Replay" onClick={() => setNonce((n) => n + 1)} />
        <DockButton icon="step-forward" label={auto ? "Stop" : "Play all"} on={auto} onClick={() => setAuto(!auto)} />
        <DockButton icon="search" label="Scenes" onClick={() => setSheet("list")} />
        <DockButton icon="star" label="Review" mark={reviews.tag(keyOf(entry))} onClick={() => setSheet("review")} />
      </nav>
      {sheet === "list" && (
        <LabSheet title={`${label} scenes`} onClose={() => setSheet(null)}>
          <div class="lab-chips">
            {groups.map((g) => (
              <button class={g === group ? "on" : ""} onClick={() => (setGroup(g), setCurrent(0), setNonce((n) => n + 1))}>
                {g}
              </button>
            ))}
          </div>
          <div class="lab-rows">
            {shown.map((e, i) => (
              <button class={[i === at ? "on" : "", reviews.tag(keyOf(e))].join(" ")} onClick={() => (go(i), setSheet(null))}>
                <span>{e.label}</span>
                <small>{e.group}</small>
              </button>
            ))}
          </div>
        </LabSheet>
      )}
      {sheet === "review" && (
        <LabSheet title={keyOf(entry)} onClose={() => setSheet(null)}>
          <ReviewBox reviews={reviews} k={keyOf(entry)} keys={entries.map(keyOf)} />
        </LabSheet>
      )}
    </div>
  );
}
