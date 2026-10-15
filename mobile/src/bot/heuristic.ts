import type { Side } from "../engine.ts";
import { type Command, basicCommands, cardCommands, cardRef, currentIce, findCard, promptOf, runCommands } from "../game/actions.ts";

export interface Move {
  command: string;
  args?: unknown;
  say?: string;
}

export interface CardInfo {
  text?: string;
  memoryunits?: number;
  subtypes?: string[];
  type?: string;
}

export type Lookup = (title: string) => CardInfo | undefined;

const BREAKS: Record<string, string> = { Fracter: "Barrier", Decoder: "Code Gate", Killer: "Sentry" };
const TURN_COMMANDS = new Set(["start-turn", "end-phase-12", "phase-12-pass-priority", "end-post-discard", "post-discard-pass-priority"]);

const subtypes = (card: any): string[] => card?.subtypes ?? [];
const remoteKeys = (servers: Record<string, any>) => Object.keys(servers).filter((k) => k.startsWith("remote"));
const remoteLabel = (key: string) => `Server ${key.slice(6)}`;
const serverLabel = (key: string) => (key === "hq" ? "HQ" : key === "rd" ? "R&D" : key === "archives" ? "Archives" : remoteLabel(key));
const gainOf = (text = "") => Number(text.match(/gain (\d+)\[credit\]/i)?.[1] ?? 0);
const isTrap = (text = "") => /when the runner accesses this/i.test(text) && !/agenda/i.test(text.slice(0, 20));
const isEconomy = (text = "") => /\[credit\]/i.test(text) && /(gain|take|place|load)/i.test(text);

export class HeuristicBot {
  private turn = "";
  private runs = 0;
  private banned = new Set<string>();
  private last = { key: "", signature: "", count: 0 };

  readonly side: Side;
  private lookup: Lookup;
  private random: () => number;

  constructor(side: Side, lookup: Lookup, random: () => number = Math.random) {
    this.side = side;
    this.lookup = lookup;
    this.random = random;
  }

  decide(view: any): Move | null {
    if (!view || view.winner) return null;
    const turnKey = `${view.turn}:${view["active-player"]}`;
    if (turnKey !== this.turn) {
      this.turn = turnKey;
      this.runs = 0;
      this.banned.clear();
    }
    const move = this.pick(view);
    if (!move) return null;
    const key = `${move.command}:${move.say ?? ""}:${JSON.stringify(move.args ?? null)}`;
    const signature = this.signature(view);
    if (key === this.last.key && signature === this.last.signature) {
      if (++this.last.count >= 2) {
        this.banned.add(key);
        this.last = { key: "", signature: "", count: 0 };
        return this.fallback(view);
      }
    } else this.last = { key, signature, count: 0 };
    if (move.command === "run") this.runs++;
    return move;
  }

  private signature(view: any) {
    const me = view[this.side] ?? {};
    return JSON.stringify([me.click, me.credit, me.hand?.length, promptOf(view, this.side)?.eid, view.run?.phase, view.run?.position, view.run?.["no-action"], view.encounters?.["no-action"], (view.log ?? []).length]);
  }

  private allowed(move: Move | null | undefined): Move | null {
    if (!move) return null;
    return this.banned.has(`${move.command}:${move.say ?? ""}:${JSON.stringify(move.args ?? null)}`) ? null : move;
  }

  private fallback(view: any): Move | null {
    const prompt = promptOf(view, this.side);
    if (prompt && prompt["prompt-type"] !== "run") return { command: "say", say: "/close-prompt" };
    const lead = [...runCommands(view, this.side), ...basicCommands(view, this.side)].find((c) => c.enabled !== false && ["continue", "end-turn", "jack-out"].includes(c.command));
    return lead ? { command: lead.command, args: lead.args } : null;
  }

  private pick(view: any): Move | null {
    const toast = view[this.side]?.toast?.[0];
    if (toast) return { command: "toast", args: { id: toast.id } };
    const prompt = promptOf(view, this.side);
    if (prompt && prompt["prompt-type"] !== "run") return this.answer(view, prompt);
    if (view.run || view.encounters) return this.duringRun(view);
    const turn = basicCommands(view, this.side);
    const step = turn.find((c) => TURN_COMMANDS.has(c.command) && c.enabled !== false);
    if (step) return this.allowed({ command: step.command, args: step.args });
    if (view["active-player"] !== this.side) return null;
    const me = view[this.side];
    if ((me.click ?? 0) > 0) {
      const move = this.side === "corp" ? this.corpClick(view) : this.runnerClick(view);
      if (move) return move;
    } else {
      const free = this.side === "corp" ? this.corpFree(view) : null;
      if (free) return free;
    }
    const end = turn.find((c) => c.command === "end-turn");
    return end ? { command: "end-turn" } : null;
  }

  private info(card: any): CardInfo {
    return (card?.title && this.lookup(card.title)) || {};
  }

  private cardMove(view: any, card: any, command: string, label?: RegExp): Move | null {
    const found = cardCommands(card, view, this.side).find((c) => c.command === command && c.enabled !== false && (!label || label.test(c.label)));
    return found ? this.allowed({ command: found.command, args: found.args }) : null;
  }

  private play(card: any, server?: string): Move | null {
    return this.allowed({ command: "play", args: server ? { card: cardRef(card), server } : { card: cardRef(card) } });
  }

  // ---------- prompts ----------

  private answer(view: any, prompt: any): Move | null {
    const me = view[this.side] ?? {};
    const ptype = prompt["prompt-type"];
    const eid = prompt.eid;
    const choices = prompt.choices;
    if (ptype === "waiting") return null;

    if (ptype === "select") return this.select(view, prompt);

    if (ptype === "trace") {
      const max = Number(choices ?? 0);
      let spend = 0;
      if (prompt.strength == null) spend = Math.min(max, Math.max(0, (me.credit ?? 0) - 2), 3);
      else {
        const needed = Math.max(0, Number(prompt.strength) - Number(prompt.link ?? 0));
        spend = needed <= max ? needed : 0;
      }
      return { command: "choice", args: { eid, choice: spend } };
    }
    if (choices === "credit") return { command: "choice", args: { eid, choice: 0 } };
    if (choices && !Array.isArray(choices) && typeof choices === "object") {
      if (choices.number != null) return { command: "choice", args: { eid, choice: Number(choices.default ?? choices.minimum ?? 0) } };
      if (choices.counter) {
        const card = findCard(view, prompt.card?.cid);
        return { command: "choice", args: { eid, choice: Number(card?.counter?.[choices.counter] ?? 0) } };
      }
      if (choices["card-title"] !== undefined) return { command: "choice", args: { eid, choice: this.side === "corp" ? "Hedge Fund" : "Sure Gamble" } };
    }
    if (Array.isArray(choices) && choices.length) {
      const scored = choices
        .filter((c: any) => c.value !== "Hide")
        .map((c: any) => ({ c, score: this.scoreChoice(view, prompt, c.value) + this.random() * 0.01 }))
        .filter(({ c }: any) => !this.banned.has(`choice::${JSON.stringify({ eid, choice: { uuid: c.uuid } })}`))
        .sort((a: any, b: any) => b.score - a.score);
      if (scored.length) return { command: "choice", args: { eid, choice: { uuid: scored[0].c.uuid } } };
    }
    return { command: "say", say: "/close-prompt" };
  }

  private scoreChoice(view: any, prompt: any, value: any): number {
    const me = view[this.side] ?? {};
    if (value && typeof value === "object") return value.cid ? 20 : 10;
    const label = String(value);
    if (label === "Keep") return this.side === "corp" && !(me.hand ?? []).some((c: any) => c.type === "ICE") ? 0 : 50;
    if (label === "Mulligan") return 10;
    if (/^steal/i.test(label)) return 100;
    const trash = label.match(/pay (\d+) \[credits?\] to trash/i);
    if (trash) return (me.credit ?? 0) - Number(trash[1]) >= 2 ? 60 : -10;
    if (/^(no action|done|ok|carry on!?|continue)$/i.test(label)) return 15;
    if (/^cancel$/i.test(label)) return 0;
    if (/^yes$/i.test(label)) return 30;
    if (/^no$/i.test(label)) return 5;
    const bet = label.match(/^(\d) \[credits?\]$/i);
    if (bet) return Number(bet[1]) <= Math.min(1, me.credit ?? 0) ? 20 + this.random() * 5 : 0;
    if (/^(hq|r&d|archives|server \d+|new remote)$/i.test(label)) return 18 + this.random();
    return 16;
  }

  private cardValue(card: any): number {
    const type = card?.type;
    if (this.side === "corp") return type === "Agenda" ? 100 : type === "ICE" ? 40 : type === "Asset" || type === "Upgrade" ? 25 : 15 + Number(card?.cost ?? 0);
    if (subtypes(card).includes("Icebreaker")) return 60;
    return type === "Hardware" ? 35 : type === "Resource" ? 30 : type === "Program" ? 40 : 15 + Number(card?.cost ?? 0);
  }

  private select(view: any, prompt: any): Move | null {
    const selectable = new Set<unknown>(prompt.selectable ?? []);
    const done = (prompt.choices ?? []).find((c: any) => c.value === "Done");
    const all: any[] = [];
    const walk = (x: any) => {
      if (!x || typeof x !== "object") return;
      if (Array.isArray(x)) return x.forEach(walk);
      if (x.cid && selectable.has(x.cid) && !x.selected) all.push(x);
      for (const v of Object.values(x)) if (v && typeof v === "object") walk(v);
    };
    walk(view.corp);
    walk(view.runner);
    const unique = [...new Map(all.map((c) => [c.cid, c])).values()];
    const msg = String(typeof prompt.msg === "string" ? prompt.msg : "");
    let pick: any;
    if (/discard/i.test(msg)) pick = [...unique].sort((a, b) => this.cardValue(a) - this.cardValue(b))[0];
    else {
      const mine = (c: any) => c.side === (this.side === "corp" ? "Corp" : "Runner");
      const hostile = /(trash|derez|expose|damage|destroy|remove)/i.test(msg);
      pick = unique.find((c) => (hostile ? !mine(c) : mine(c))) ?? unique[0];
    }
    const move = pick ? this.allowed({ command: "select", args: { card: cardRef(pick), eid: prompt.eid } }) : null;
    if (move) return move;
    if (done) return { command: "choice", args: { eid: prompt.eid, choice: { uuid: done.uuid } } };
    return { command: "say", say: "/close-prompt" };
  }

  // ---------- runs ----------

  private duringRun(view: any): Move | null {
    const me = view[this.side] ?? {};
    const commands = runCommands(view, this.side).filter((c) => c.enabled !== false);
    if (this.side === "corp") {
      const rez = commands.find((c) => c.command === "rez");
      const ice = currentIce(view);
      if (rez && ice && Number(ice.cost ?? 0) <= (me.credit ?? 0)) return this.allowed({ command: "rez", args: rez.args }) ?? this.continueRun(commands);
      const fire = commands.find((c) => c.command === "unbroken-subroutines");
      if (fire) return this.allowed({ command: fire.command, args: fire.args }) ?? this.continueRun(commands);
      return this.continueRun(commands);
    }
    if (view.encounters) {
      for (const card of this.rig(view)) {
        const brk = this.cardMove(view, card, "dynamic-ability", /fully break/i);
        if (brk) return brk;
      }
    }
    return this.continueRun(commands);
  }

  private continueRun(commands: Command[]): Move | null {
    const next = commands.find((c) => c.command === "start-next-phase") ?? commands.find((c) => c.command === "continue");
    return next ? this.allowed({ command: next.command, args: next.args }) : null;
  }

  private rig(view: any): any[] {
    const rig = view.runner?.rig ?? {};
    return [...(rig.program ?? []), ...(rig.hardware ?? []), ...(rig.resource ?? [])];
  }

  // ---------- corp ----------

  private corpFree(view: any): Move | null {
    const me = view.corp;
    for (const key of remoteKeys(me.servers ?? {})) {
      for (const card of me.servers[key].content ?? []) {
        if (card.rezzed || card.type !== "Asset") continue;
        const text = this.info(card).text;
        if (isTrap(text) || !isEconomy(text) || Number(card.cost ?? 0) > me.credit) continue;
        const rez = this.cardMove(view, card, "rez");
        if (rez) return rez;
      }
    }
    return null;
  }

  private corpClick(view: any): Move | null {
    const me = view.corp;
    const servers = me.servers ?? {};
    const hand: any[] = me.hand ?? [];
    const installed = Object.values(servers).flatMap((s: any) => [...(s.content ?? []), ...(s.ices ?? [])]);

    for (const card of installed) {
      const score = this.cardMove(view, card, "score");
      if (score) return score;
    }
    const free = this.corpFree(view);
    if (free) return free;
    for (const card of installed) {
      if (card.type !== "Agenda" || me.credit < 1) continue;
      const adv = this.cardMove(view, card, "advance");
      if (adv) return adv;
    }

    const iceCount = (key: string) => (servers[key]?.ices ?? []).length;
    const emptyProtected = remoteKeys(servers).find((k) => iceCount(k) > 0 && !(servers[k].content ?? []).length);
    const agendas = hand.filter((c) => c.type === "Agenda" && c.playable);
    if (agendas.length && emptyProtected) {
      const move = this.play(agendas[0], remoteLabel(emptyProtected));
      if (move) return move;
    }

    const playable = hand.filter((c) => c.playable);
    if (me.credit < 6) {
      const op = playable
        .filter((c) => c.type === "Operation" && gainOf(this.info(c).text) > Number(c.cost ?? 0))
        .sort((a, b) => gainOf(this.info(b).text) - Number(b.cost ?? 0) - (gainOf(this.info(a).text) - Number(a.cost ?? 0)))[0];
      if (op) {
        const move = this.play(op);
        if (move) return move;
      }
      const asset = playable.find((c) => c.type === "Asset" && isEconomy(this.info(c).text) && !isTrap(this.info(c).text));
      if (asset && remoteKeys(servers).length < 4) {
        const move = this.play(asset, "New remote");
        if (move) return move;
      }
    }

    const ice = playable.filter((c) => c.type === "ICE").sort((a, b) => Number(b.strength ?? 0) - Number(a.strength ?? 0));
    if (ice.length) {
      const targets: [string, number][] = [];
      if (agendas.length && !emptyProtected) targets.push(["New remote", 0]);
      if (iceCount("hq") === 0) targets.push(["HQ", 0]);
      if (iceCount("rd") === 0) targets.push(["R&D", 0]);
      if (emptyProtected && iceCount(emptyProtected) < 2) targets.push([remoteLabel(emptyProtected), iceCount(emptyProtected)]);
      if (me.credit >= 6) {
        targets.push(["R&D", iceCount("rd")], ["HQ", iceCount("hq")]);
        const scoring = remoteKeys(servers).find((k) => (servers[k].content ?? []).some((c: any) => c.type === "Agenda"));
        if (scoring) targets.push([remoteLabel(scoring), iceCount(scoring)]);
      }
      for (const [server, cost] of targets) {
        if (cost > me.credit) continue;
        const move = this.play(ice[0], server);
        if (move) return move;
      }
    }

    if (agendas.length && hand.length > 5) {
      const move = this.play(agendas[0], "New remote");
      if (move) return move;
    }
    const trap = playable.find((c) => c.type === "Asset" && isTrap(this.info(c).text));
    if (trap && remoteKeys(servers).length < 3 && me.credit >= 3) {
      const move = this.play(trap, "New remote");
      if (move) return move;
    }
    if (view.runner?.tag?.["is-tagged"] || (view.runner?.tag?.total ?? 0) > 0) {
      const trash = basicCommands(view, "corp").find((c) => c.command === "trash-resource" && c.enabled !== false);
      if (trash && me.credit >= 4) {
        const move = this.allowed({ command: "trash-resource" });
        if (move) return move;
      }
    }
    if (hand.length < 4 && (me["deck-count"] ?? 0) > 0) return this.allowed({ command: "draw" }) ?? this.allowed({ command: "credit" });
    return this.allowed({ command: "credit" }) ?? this.allowed({ command: "draw" });
  }

  // ---------- runner ----------

  private coverage(view: any): Set<string> {
    const covered = new Set<string>();
    for (const card of view.runner?.rig?.program ?? []) {
      const subs = subtypes(card);
      if (subs.includes("AI")) ["Barrier", "Code Gate", "Sentry"].forEach((s) => covered.add(s));
      for (const [breaker, ice] of Object.entries(BREAKS)) if (subs.includes(breaker)) covered.add(ice);
    }
    return covered;
  }

  private runTarget(view: any): string | null {
    const me = view.runner;
    const servers = view.corp?.servers ?? {};
    const covered = this.coverage(view);
    const hand = (me.hand ?? []).length;
    if (hand < 3) return null;
    let best: { label: string; value: number } | null = null;
    for (const key of ["hq", "rd", "archives", ...remoteKeys(servers)]) {
      const server = servers[key] ?? { ices: [], content: [] };
      const content: any[] = server.content ?? [];
      let value = key === "rd" ? 3 : key === "hq" ? 2 + Number(view.corp?.["hand-count"] ?? 0) / 5 : key === "archives" ? ((view.corp?.discard ?? []).some((c: any) => !c.seen && !c.title) ? 1.5 : 0) : 0;
      if (key.startsWith("remote")) {
        if (!content.length) continue;
        const advanced = content.some((c: any) => Number(c["advance-counter"] ?? 0) > 0);
        if (advanced && hand < 5) continue;
        value = content.some((c: any) => !c.title || c.type === "Agenda") ? 5 + Number(content[0]?.["advance-counter"] ?? 0) : 2.5;
      }
      if (value <= 0) continue;
      let cost = 0;
      let blocked = false;
      for (const ice of server.ices ?? []) {
        if (!ice.rezzed) {
          if (covered.size < 2) blocked = true;
          cost += 3;
          continue;
        }
        const types = subtypes(ice).filter((s) => ["Barrier", "Code Gate", "Sentry"].includes(s));
        if (types.length && !types.some((t) => covered.has(t))) blocked = true;
        cost += 2 + Math.max(0, Number(ice["current-strength"] ?? ice.strength ?? 0) - 2);
      }
      if (blocked || cost > (me.credit ?? 0)) continue;
      const score = value - cost * 0.3 + this.random() * 0.5;
      if (!best || score > best.value) best = { label: serverLabel(key), value: score };
    }
    return best?.label ?? null;
  }

  private runnerClick(view: any): Move | null {
    const me = view.runner;
    const hand: any[] = me.hand ?? [];
    const playable = hand.filter((c) => c.playable);

    if ((me.tag?.base ?? 0) > 0 && me.credit >= 2) {
      const move = this.allowed({ command: "remove-tag" });
      if (move && basicCommands(view, "runner").some((c) => c.command === "remove-tag" && c.enabled !== false)) return move;
    }

    if (me.credit < 5) {
      const event = playable
        .filter((c) => c.type === "Event" && gainOf(this.info(c).text) > Number(c.cost ?? 0))
        .sort((a, b) => gainOf(this.info(b).text) - gainOf(this.info(a).text))[0];
      if (event) {
        const move = this.play(event);
        if (move) return move;
      }
      const resource = playable.find((c) => c.type === "Resource" && isEconomy(this.info(c).text) && me.credit >= Number(c.cost ?? 0) + 1);
      if (resource) {
        const move = this.play(resource);
        if (move) return move;
      }
    }

    const covered = this.coverage(view);
    const breaker = playable.find((c) => {
      const subs = subtypes(c);
      if (!subs.includes("Icebreaker")) return false;
      if (subs.includes("AI")) return covered.size < 3;
      return Object.entries(BREAKS).some(([b, ice]) => subs.includes(b) && !covered.has(ice));
    });
    if (breaker) {
      const move = this.play(breaker);
      if (move) return move;
    }

    if (this.runs < 2) {
      const target = this.runTarget(view);
      if (target) {
        const move = this.allowed({ command: "run", args: { server: target } });
        if (move) return move;
      }
    }

    const extra = playable
      .filter((c) => c.type !== "Event" && !subtypes(c).includes("Icebreaker") && me.credit >= Number(c.cost ?? 0) + 2)
      .sort((a, b) => this.cardValue(b) - this.cardValue(a))[0];
    if (extra) {
      const move = this.play(extra);
      if (move) return move;
    }
    const event = playable.find((c) => c.type === "Event" && !subtypes(c).includes("Run") && me.credit >= Number(c.cost ?? 0) + 2);
    if (event) {
      const move = this.play(event);
      if (move) return move;
    }

    if (hand.length < 4 && (me["deck-count"] ?? 0) > 0) return this.allowed({ command: "draw" }) ?? this.allowed({ command: "credit" });
    return this.allowed({ command: "credit" }) ?? this.allowed({ command: "draw" });
  }
}
