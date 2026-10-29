import type { Side } from "../engine";

export interface Command {
  label: string;
  command: string;
  args?: unknown;
  enabled?: boolean;
  hint?: string;
  kind?: "primary" | "danger" | "normal" | "score";
  then?: "install-list";
  choose?: string;
  confirm?: string;
  check?: "disable" | "hide";
  guess?: boolean;
}

export const pendingChoice: { value?: string } = {};

export const sideName = (s: Side) => (s === "corp" ? "Corp" : "Runner");
export const otherSide = (s: Side): Side => (s === "corp" ? "runner" : "corp");

export function cardRef(card: any): any {
  if (!card) return card;
  const ref: any = { cid: card.cid, zone: card.zone, side: card.side, type: card.type };
  if (card.host) ref.host = cardRef(card.host);
  return ref;
}

export const zone0 = (card: any): string | undefined => card?.zone?.[0];

export function promptOf(view: any, side: Side): any {
  return view?.[side]?.["prompt-state"] ?? null;
}

export function awaitingMove(view: any, side: Side) {
  const ptype = promptOf(view, side)?.["prompt-type"];
  return !view?.winner && (ptype ? ptype !== "waiting" && ptype !== "run" : view?.["active-player"] === side && !view.run && (view[side]?.click ?? 0) > 0);
}

export function owesMove(view: any, side: Side) {
  const ptype = promptOf(view, side)?.["prompt-type"];
  return !view?.winner && (ptype ? ptype !== "waiting" && ptype !== "run" : view?.["active-player"] === side && !view.run && !view["end-turn"]);
}

export function hasBlockingPrompt(view: any, side: Side) {
  const p = promptOf(view, side);
  return !!p && p["prompt-type"] !== "run";
}

export function anyPrompt(view: any, side: Side) {
  return !!promptOf(view, side);
}

export const advancement = (card: any) => (card["advance-counter"] ?? 0) + (card["extra-advance-counter"] ?? 0);

export function isFaceup(card: any) {
  return !!(card.seen || card.rezzed);
}

export function canAdvance(card: any) {
  const installed = zone0(card) === "servers" || zone0(card) === "onhost";
  return (card.type === "Agenda" && installed) || card.advanceable === "always" || (card.rezzed && card.advanceable === "while-rezzed") || (!card.rezzed && card.advanceable === "while-unrezzed");
}

function actionList(card: any, view: any, side: Side): string[] {
  const z = zone0(card);
  const out: string[] = [];
  const installed = z === "servers" || z === "onhost";
  if (canAdvance(card)) out.push("advance");
  if (card.type === "Agenda" && installed && view["active-player"] === side && advancement(card) >= (card["current-advancement-requirement"] ?? card.advancementcost ?? Infinity)) out.push("score");
  if (["ICE", "Program"].includes(card.type) && (installed || z === "rig")) out.push("trash");
  if (["Asset", "Upgrade"].includes(card.type) && installed && !card.rezzed) out.push("rez");
  if (card.type === "ICE" && installed && !card.rezzed && view.run?.phase === "approach-ice" && currentIce(view)?.cid === card.cid) out.push("rez");
  return out;
}

function runnerPassed(view: any, ice: any) {
  const enc = view.encounters;
  return !!ice && !!enc && enc["no-action"] === "runner" && currentIce(view)?.cid === ice.cid;
}

const ACTION_LABELS: Record<string, string> = {
  advance: "Advance",
  score: "Score",
  trash: "Trash",
  rez: "Rez",
};

const RESOLVE: Record<string, string> = { always: "Always", never: "Never", ask: "Ask" };

const CYCLE: Record<string, string> = { ask: "Always", always: "Never", never: "Ask" };

function autoSetting(card: any): string {
  return Object.values<string>(card?.autoresolve ?? {})[0] ?? "ask";
}

export function abilityLabel(ab: any, card?: any): string {
  if (typeof ab.label === "string" && ab.label.startsWith("Toggle auto-resolve")) {
    return `Auto-resolve: ${RESOLVE[autoSetting(card)] ?? "Ask"}`;
  }
  const base = ab.label ?? (typeof ab.msg === "string" ? ab.msg.charAt(0).toUpperCase() + ab.msg.slice(1) : "Ability");
  return ab["cost-label"] ? `${ab["cost-label"]} : ${base}` : base;
}

function idlePump(ab: any, card: any, view: any): boolean {
  const label = typeof ab.label === "string" ? ab.label : "";
  if (!(card.subtypes ?? []).includes("Icebreaker") || !/strength/i.test(label) || /break/i.test(label) || /remainder of the turn/i.test(label)) return false;
  return /remainder of the run/i.test(label) ? !view.run : !view.encounters;
}

const ACTIVE_ZONES = new Set(["current", "onhost", "play-area", "scored", "servers", "rig"]);

export function clickLocked(view: any, side: Side): boolean {
  return !!(view["corp-phase-12"] || view["runner-phase-12"] || view["corp-post-discard"] || view["runner-post-discard"] || view["end-turn"]) || view["active-player"] !== side;
}

const clickAbility = (ab: any) => /\[click\]/i.test(String(ab?.["cost-label"] ?? ab?.label ?? ""));

export function cardCommands(card: any, view: any, side: Side): Command[] {
  const out: Command[] = [];
  if (!card || !view) return out;
  const mine = card.side === sideName(side);
  const z = zone0(card);
  const prompt = promptOf(view, side);
  const ptype = prompt?.["prompt-type"];
  const ref = cardRef(card);
  const locked = clickLocked(view, side);

  if (ptype === "select") {
    const selectable = (prompt.selectable ?? []).includes(card.cid);
    const max = prompt["select-max"] ?? 1;
    const counted = max > 1 || !!prompt["select-all"];
    const picked = counted ? (prompt.selectable ?? []).filter((cid: unknown) => findCard(view, cid)?.selected).length : 0;
    if (selectable || card.selected)
      out.push({
        label: `${card.selected ? "Deselect" : "Select"}${counted ? ` · ${picked}/${max}` : ""}`,
        command: "select",
        args: { card: ref, eid: prompt.eid },
        kind: card.selected ? undefined : "primary",
        enabled: card.selected || picked < max,
      });
  } else if (prompt && Array.isArray(prompt.choices) && (prompt.selectable ?? []).includes(card.cid)) {
    const choice = prompt.choices.find((c: any) => c?.value?.cid === card.cid);
    if (choice) out.push({ label: "Choose this card", command: "choice", args: { eid: prompt.eid, choice: { uuid: choice.uuid } }, kind: "primary" });
  }

  if (mine && !prompt && !locked) {
    const fromHand = (z === "hand" && card.playable) || card["playable-as-if-in-hand"];
    const flashback = z === "discard" && card["flashback-playable"];
    if (fromHand || flashback) {
      const command = flashback ? "flashback" : "play";
      if (side === "corp" && card.type !== "Operation") {
        out.push({ label: "Install", command: "generate-install-list", args: { card: ref }, kind: "primary", then: "install-list" });
      } else {
        const verb = card.type === "Operation" || card.type === "Event" ? "Play" : "Install";
        const cost = card["current-cost"];
        out.push({ label: `${flashback ? `${verb} (flashback)` : verb}${cost != null ? ` · ${cost}[credit]` : ""}`, command, args: { card: ref }, kind: "primary", check: "hide" });
      }
    }
  }

  const active = ACTIVE_ZONES.has(z ?? "") || card.type === "Identity";
  if (mine && active) {
    if (side === "corp") {
      for (const a of actionList(card, view, side)) {
        if (a === "advance" && locked) continue;
        const me = view[side] ?? {};
        const rezCost = card["current-rez-cost"] ?? card.cost;
        const guess = a === "advance" ? me.click > 0 && me.credit > 0 : a === "rez" ? (me.credit ?? 0) >= Number(rezCost ?? 0) : undefined;
        const label = a === "rez" && rezCost != null ? `${ACTION_LABELS[a]} · ${rezCost}[credit]` : a === "advance" ? `${ACTION_LABELS[a]} · 1[click] 1[credit]` : ACTION_LABELS[a];
        out.push({ label, command: a, args: { card: ref }, kind: a === "trash" ? "danger" : a === "score" ? "score" : "normal", guess, check: a === "trash" ? undefined : "disable" });
      }
    } else if (card.type === "Program" && z === "rig") {
      out.push({ label: ACTION_LABELS.trash, command: "trash", args: { card: ref }, kind: "danger" });
    }
    (card.abilities ?? []).forEach((ab: any, i: number) => {
      if (locked && clickAbility(ab)) return;
      out.push(ab.dynamic ? { label: abilityLabel(ab, card), command: "dynamic-ability", args: { card: ref, dynamic: ab.dynamic, source: ab.source, index: ab.index }, enabled: !!ab.playable && !idlePump(ab, card, view), check: "disable" } : { label: abilityLabel(ab, card), command: "ability", args: { card: ref, ability: i }, enabled: !!ab.playable && !idlePump(ab, card, view), check: "disable", choose: typeof ab.label === "string" && ab.label.startsWith("Toggle auto-resolve") ? CYCLE[autoSetting(card)] : undefined });
    });
  }

  if (!mine && side === "corp") (card["corp-abilities"] ?? []).forEach((ab: any, i: number) => out.push({ label: abilityLabel(ab), command: "corp-ability", args: { card: ref, ability: i }, enabled: ab.playable !== false, check: "disable" }));
  if (!mine && side === "runner") (card["runner-abilities"] ?? []).forEach((ab: any, i: number) => out.push({ label: abilityLabel(ab), command: "runner-ability", args: { card: ref, ability: i }, enabled: ab.playable !== false, check: "disable" }));

  const subs: any[] = card.subroutines ?? [];
  if (side === "corp" && mine && subs.length && z === "servers" && runnerPassed(view, card)) {
    if (card.rezzed && subs.some((s) => !s.fired && !s.broken)) out.push({ label: "Fire unbroken subroutines", command: "unbroken-subroutines", args: { card: ref } });
    subs.forEach((s, i) => !s.broken && !s.fired && out.push({ label: s.label ?? `Subroutine ${i + 1}`, command: "subroutine", args: { card: ref, subroutine: i } }));
  }
  return out;
}

export function basicCommands(view: any, side: Side): Command[] {
  const me = view[side];
  const out: Command[] = [];
  if (!me) return out;
  const abilities = me["basic-action-card"]?.abilities ?? [];
  const playable = (i: number) => !!abilities[i]?.playable;
  const myTurn = view["active-player"] === side;
  const post = view[`${view["active-player"]}-post-discard`];
  const phaseLocked = !!(view["corp-phase-12"] || view["runner-phase-12"] || view["corp-post-discard"] || view["runner-post-discard"]);

  if (post) {
    if (myTurn) {
      out.push(post["requires-consent"] ? { label: "Continue end of turn", command: "post-discard-pass-priority", enabled: !post[side], kind: "primary" } : { label: "Continue end of turn", command: "end-post-discard", kind: "primary" });
    } else if (post["requires-consent"]) {
      out.push({ label: "Allow end of turn", command: "post-discard-pass-priority", enabled: !post[side], kind: "primary" });
    }
    return out;
  }
  const p12 = view["corp-phase-12"] || view["runner-phase-12"];
  if (p12) {
    const label = view["active-player"] === "corp" ? "Mandatory draw" : "Take clicks";
    if (myTurn) {
      out.push(p12["requires-consent"] ? { label, command: "phase-12-pass-priority", enabled: !p12[side], kind: "primary" } : { label, command: "end-phase-12", kind: "primary" });
    } else if (p12["requires-consent"]) {
      out.push({ label: `Allow ${label.toLowerCase()}`, command: "phase-12-pass-priority", enabled: !p12[side], kind: "primary" });
    }
    return out;
  }
  if (!myTurn) {
    if (view["end-turn"]) out.push({ label: "Start turn", command: "start-turn", kind: "primary" });
    return out;
  }
  if (me.click === 0 && !view["end-turn"]) out.push({ label: "End turn", command: "end-turn", kind: "primary" });
  if (playable(0)) out.push({ label: "Gain 1[credit]", command: "credit" });
  if (playable(1) && (me["deck-count"] ?? 0) > 0) out.push({ label: "Draw", command: "draw" });
  if (side === "runner") {
    if (!phaseLocked && me.click > 0) out.push({ label: "Run", command: "generate-runnable-zones", then: "install-list" });
    if (!phaseLocked && (me.tag?.base ?? 0) > 0) out.push({ label: "Remove tag · 1[click] 2[credit]", command: "remove-tag", enabled: playable(5) });
  } else {
    if (playable(6)) out.push({ label: "Purge · 3[click]", command: "purge", confirm: "Confirm" });
    const tagged = view.runner?.tag?.["is-tagged"] || (view.runner?.tag?.total ?? 0) > 0;
    if (tagged) out.push({ label: "Trash resource · 1[click] 2[credit]", command: "trash-resource", enabled: playable(5) });
  }
  return out;
}

export function currentIce(view: any): any {
  const run = view.run;
  if (view.encounters?.ice) return view.encounters.ice;
  if (!run) return null;
  if (run.phase === "movement" || run["approached-ice-in-position?"]) {
    const ices = view.corp?.servers?.[run.server?.[0]]?.ices ?? [];
    return ices[run.position - 1] ?? null;
  }
  return null;
}

function nextPhaseLabel(view: any): string {
  const run = view.run;
  const ice = currentIce(view);
  switch (run?.phase) {
    case "initiation":
      return run.position === 0 ? "Approach server" : "Approach ice";
    case "approach-ice":
      return ice?.rezzed ? "Encounter ice" : "Movement";
    case "encounter-ice":
      return "Movement";
    case "movement":
      return run.position === 0 ? "Breach server" : "Approach ice";
    default:
      return "End run";
  }
}

function corpPassLabel(view: any): string {
  const run = view.run;
  const ice = currentIce(view);
  switch (run?.phase) {
    case "initiation":
      return run.position === 0 ? "Let Runner approach server" : "Let Runner approach ice";
    case "approach-ice":
      return ice?.rezzed ? "Let Runner encounter" : "Leave ice unrezzed";
    case "movement":
      return run.position === 0 ? "Let Runner breach" : "Let Runner approach ice";
    default:
      return "Continue";
  }
}

export function runCommands(view: any, side: Side, autoContinue = false): Command[] {
  const run = view.run;
  const enc = view.encounters;
  const out: Command[] = [];
  const ice = currentIce(view);
  if (side === "corp") {
    if (run?.phase === "approach-ice" && ice && !ice.rezzed) out.push({ label: `Rez ${ice.title ?? "ice"}${(ice["current-rez-cost"] ?? ice.cost) != null ? ` · ${ice["current-rez-cost"] ?? ice.cost}[credit]` : ""}`, command: "rez", args: { card: cardRef(ice), "press-continue": autoContinue }, kind: "primary", enabled: run["no-action"] !== "corp", guess: (view.corp?.credit ?? 0) >= Number(ice["current-rez-cost"] ?? ice.cost ?? 0), check: "disable" });
    const fire = (run?.phase === "encounter-ice" || enc) && ice && runnerPassed(view, ice) && (ice.subroutines ?? []).some((s: any) => !s.broken && !s.fired && s.resolve !== false);
    if (fire) out.push({ label: "Fire subs", command: "unbroken-subroutines", args: { card: cardRef(ice) }, kind: "primary" });
    else if (enc) {
      out.push({ label: "Continue", command: "continue", enabled: enc["no-action"] !== "corp", kind: "primary" });
    } else if (run) {
      const label = run.phase !== "initiation" && (run["next-phase"] || run.position === 0) ? "No further actions" : corpPassLabel(view);
      out.push({
        label,
        command: "continue",
        enabled: run["no-action"] !== "corp" && (run.phase === "initiation" || run.phase !== "success"),
        kind: "primary",
      });
    }
    if (run && (enc?.["encounter-count"] ?? 0) <= 1 && run.phase !== "success") out.push({ label: run["corp-auto-no-action"] ? "Stop auto-passing" : "Auto-pass", command: "toggle-auto-no-action" });
    return out;
  }
  const waiting = (enc ?? run)?.["no-action"] === "runner";
  const label = (text: string) => (waiting ? "Waiting for Corp…" : text);
  if (enc) {
    const live: any[] = ice?.rezzed ? (ice.subroutines ?? []).filter((s: any) => !s.broken && !s.fired && s.resolve !== false) : [];
    out.push({ label: label(live.length ? "Let it fire" : "Continue"), command: "continue", enabled: !waiting, kind: live.length ? "danger" : "primary" });
  } else if (run) {
    if (run["next-phase"] && run.phase !== "initiation") out.push({ label: nextPhaseLabel(view), command: "start-next-phase", enabled: !run["no-action"], kind: "primary" });
    else if (run.phase === "initiation" || (!run["next-phase"] && run.position !== 0)) out.push({ label: label(nextPhaseLabel(view)), command: "continue", enabled: !waiting, kind: "primary" });
    else if (run.position === 0 && run.phase === "movement") out.push({ label: label("Breach server"), command: "continue", enabled: !waiting, kind: "primary" });
  }
  if (run && !view["forced-encounter"] && run.phase !== "success")
    out.push({
      label: "Jack out",
      command: "jack-out",
      enabled: run.phase === "movement" && !run["cannot-jack-out"] && run["no-action"] !== "runner",
      kind: "danger",
    });
  return out;
}

export type BreakPlan = { ice: unknown; breaker: unknown; want: string[]; stage: "pump" | "break" | "pick"; steps: number };

export function breakStep(view: any, side: Side, p: BreakPlan, render: (msg: unknown) => string, payFromPool = false): { command: string; args: unknown } | "wait" | null {
  const cur = currentIce(view);
  if (!view.encounters || cur?.cid !== p.ice || ++p.steps > 24) return null;
  const left = (cur.subroutines ?? []).filter((s: any) => !s.broken && !s.fired && p.want.includes(s.label));
  const pr = promptOf(view, side);
  if (pr && pr["prompt-type"] === "select" && /^Choose a credit providing card/.test(render(pr.msg))) {
    if (!payFromPool) return "wait";
    const funded = ((pr.selectable ?? []) as unknown[]).map((cid) => findCard(view, cid)).find((c: any) => Number(c?.counter?.credit ?? 0) > 0);
    if (funded) return { command: "select", args: { card: cardRef(funded), eid: pr.eid, "shift-key-held": true } };
    const done = (Array.isArray(pr.choices) ? pr.choices : []).find((c: any) => c.value === "Done");
    return done ? { command: "choice", args: { eid: pr.eid, choice: { uuid: done.uuid } } } : null;
  }
  if (pr && pr["prompt-type"] !== "run") {
    if (!/^Break a subroutine/i.test(render(pr.msg)) || (pr.card?.cid != null && pr.card.cid !== p.breaker)) return null;
    const choices: any[] = Array.isArray(pr.choices) ? pr.choices : [];
    const pick = choices.find((c) => left.some((s: any) => s.label === c.value)) ?? choices.find((c) => c.value === "Done");
    return pick ? { command: "choice", args: { eid: pr.eid, choice: { uuid: pick.uuid } } } : null;
  }
  const card = findCard(view, p.breaker);
  const abilities: any[] = card?.abilities ?? [];
  if (p.stage === "pump") {
    p.stage = "break";
    const pump = abilities.find((a) => a.dynamic === "auto-pump" && a.playable);
    if (pump) return { command: "dynamic-ability", args: { card: cardRef(card), dynamic: pump.dynamic, source: pump.source, index: pump.index } };
  }
  const i = abilities.findIndex((a) => !a.dynamic && /^break /i.test(a.label ?? "") && a.playable);
  if (!left.length || i < 0) return null;
  p.stage = "pick";
  return { command: "ability", args: { card: cardRef(card), ability: i } };
}

export function findCard(view: any, cid: unknown): any {
  let found: any = null;
  const walk = (x: any) => {
    if (found || !x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(walk);
    if (x.cid === cid && (x.zone || x.type === "Identity")) {
      found = x;
      return;
    }
    for (const k of ["corp", "runner", "identity", "servers", "rig", "hosted", "content", "ices", "hq", "rd", "archives", "hand", "deck", "scored", "discard", "current", "play-area", "rfg", "set-aside", "program", "hardware", "resource", "facedown"]) {
      if (k in x) walk(x[k]);
    }
    for (const k of Object.keys(x)) if (k.startsWith("remote")) walk(x[k]);
  };
  walk(view);
  return found;
}

export function siblingsOf(view: any, cid: unknown): any[] {
  let found: any[] | null = null;
  const walk = (x: any) => {
    if (found || !x || typeof x !== "object") return;
    if (Array.isArray(x)) {
      if (x.some((c) => c?.cid === cid && (c.zone || c.type === "Identity"))) found = x;
      else x.forEach(walk);
      return;
    }
    for (const v of Object.values(x)) if (v && typeof v === "object") walk(v);
  };
  walk(view);
  return found ?? [];
}
