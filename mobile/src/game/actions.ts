import type { Side } from "../engine";

export interface Command {
  label: string;
  command: string;
  args?: unknown;
  enabled?: boolean;
  hint?: string;
  kind?: "primary" | "danger" | "normal";
  then?: "install-list";
}

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

function actionList(card: any, view: any, side: Side): string[] {
  const z = zone0(card);
  const out: string[] = [];
  const installed = z === "servers" || z === "onhost";
  if (
    (card.type === "Agenda" && installed) ||
    card.advanceable === "always" ||
    (card.rezzed && card.advanceable === "while-rezzed") ||
    (!card.rezzed && card.advanceable === "while-unrezzed")
  )
    out.push("advance");
  if (
    card.type === "Agenda" &&
    installed &&
    view["active-player"] === side &&
    advancement(card) >= (card["current-advancement-requirement"] ?? card.advancementcost ?? Infinity)
  )
    out.push("score");
  if (["ICE", "Program"].includes(card.type) && (installed || z === "rig")) out.push("trash");
  if (["Asset", "ICE", "Upgrade"].includes(card.type) && installed) out.push(card.rezzed ? "derez" : "rez");
  return out;
}

const ACTION_LABELS: Record<string, string> = {
  advance: "Advance",
  score: "Score",
  trash: "Trash",
  rez: "Rez",
  derez: "Derez",
};

export function abilityLabel(ab: any): string {
  const base = ab.label ?? (typeof ab.msg === "string" ? ab.msg.charAt(0).toUpperCase() + ab.msg.slice(1) : "Ability");
  return ab["cost-label"] ? `${ab["cost-label"]} : ${base}` : base;
}

const ACTIVE_ZONES = new Set(["current", "onhost", "play-area", "scored", "servers", "rig"]);

export function cardCommands(card: any, view: any, side: Side): Command[] {
  const out: Command[] = [];
  if (!card || !view) return out;
  const mine = card.side === sideName(side);
  const z = zone0(card);
  const prompt = promptOf(view, side);
  const ptype = prompt?.["prompt-type"];
  const ref = cardRef(card);

  if (ptype === "select") {
    const selectable = (prompt.selectable ?? []).includes(card.cid);
    if (selectable || card.selected)
      out.push({
        label: card.selected ? "Deselect" : "Select",
        command: "select",
        args: { card: ref, eid: prompt.eid },
        kind: "primary",
      });
  } else if (prompt && Array.isArray(prompt.choices) && (prompt.selectable ?? []).includes(card.cid)) {
    const choice = prompt.choices.find((c: any) => c?.value?.cid === card.cid);
    if (choice) out.push({ label: "Choose this card", command: "choice", args: { eid: prompt.eid, choice: { uuid: choice.uuid } }, kind: "primary" });
  }

  if (mine && !prompt) {
    const fromHand = (z === "hand" && card.playable) || card["playable-as-if-in-hand"];
    const flashback = z === "discard" && card["flashback-playable"];
    if (fromHand || flashback) {
      const command = flashback ? "flashback" : "play";
      if (side === "corp" && card.type !== "Operation") {
        out.push({ label: "Install…", command: "generate-install-list", args: { card: ref }, kind: "primary", then: "install-list" });
      } else {
        const verb = card.type === "Operation" || card.type === "Event" ? "Play" : "Install";
        out.push({ label: flashback ? `${verb} (flashback)` : verb, command, args: { card: ref }, kind: "primary" });
      }
    }
  }

  const active = ACTIVE_ZONES.has(z ?? "") || card.type === "Identity";
  if (mine && active) {
    if (side === "corp") {
      for (const a of actionList(card, view, side)) {
        const me = view[side] ?? {};
        const enabled = a === "advance" ? me.click > 0 && me.credit > 0 : undefined;
        const label = a === "rez" && card.cost != null ? `${ACTION_LABELS[a]} · ${card.cost}¢` : ACTION_LABELS[a];
        out.push({ label, command: a, args: { card: ref }, kind: a === "trash" ? "danger" : "normal", enabled });
      }
    } else if (card.type === "Program" && z === "rig") {
      out.push({ label: ACTION_LABELS.trash, command: "trash", args: { card: ref }, kind: "danger" });
    }
    (card.abilities ?? []).forEach((ab: any, i: number) => {
      out.push(
        ab.dynamic
          ? { label: abilityLabel(ab), command: "dynamic-ability", args: { card: ref, dynamic: ab.dynamic, source: ab.source, index: ab.index }, enabled: !!ab.playable }
          : { label: abilityLabel(ab), command: "ability", args: { card: ref, ability: i }, enabled: !!ab.playable },
      );
    });
  }

  if (!mine && side === "corp")
    (card["corp-abilities"] ?? []).forEach((ab: any, i: number) =>
      out.push({ label: abilityLabel(ab), command: "corp-ability", args: { card: ref, ability: i }, enabled: ab.playable !== false }),
    );
  if (!mine && side === "runner")
    (card["runner-abilities"] ?? []).forEach((ab: any, i: number) =>
      out.push({ label: abilityLabel(ab), command: "runner-ability", args: { card: ref, ability: i }, enabled: ab.playable !== false }),
    );

  const subs: any[] = card.subroutines ?? [];
  if (side === "corp" && mine && subs.length && z === "servers") {
    if (card.rezzed && subs.some((s) => !s.fired && !s.broken))
      out.push({ label: "Fire unbroken subroutines", command: "unbroken-subroutines", args: { card: ref } });
    subs.forEach((s, i) =>
      out.push({ label: `↳ ${s.label ?? `Subroutine ${i + 1}`}${s.broken ? " (broken)" : ""}`, command: "subroutine", args: { card: ref, subroutine: i } }),
    );
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
      out.push(
        post["requires-consent"]
          ? { label: "Continue end of turn", command: "post-discard-pass-priority", enabled: !post[side], kind: "primary" }
          : { label: "Continue end of turn", command: "end-post-discard", kind: "primary" },
      );
    } else if (post["requires-consent"]) {
      out.push({ label: "Allow end of turn", command: "post-discard-pass-priority", enabled: !post[side], kind: "primary" });
    }
    return out;
  }
  const p12 = view["corp-phase-12"] || view["runner-phase-12"];
  if (p12) {
    const label = view["active-player"] === "corp" ? "Mandatory draw" : "Take clicks";
    if (myTurn) {
      out.push(
        p12["requires-consent"]
          ? { label, command: "phase-12-pass-priority", enabled: !p12[side], kind: "primary" }
          : { label, command: "end-phase-12", kind: "primary" },
      );
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
  if (playable(0)) out.push({ label: "Gain credit", command: "credit" });
  if (playable(1) && (me["deck-count"] ?? 0) > 0) out.push({ label: "Draw", command: "draw" });
  if (side === "runner") {
    if (!phaseLocked && me.click > 0) out.push({ label: "Run…", command: "generate-runnable-zones", then: "install-list" });
    if (!phaseLocked && playable(5) && (me.tag?.base ?? 0) > 0) out.push({ label: "Remove tag", command: "remove-tag" });
  } else {
    if (playable(6)) out.push({ label: "Purge", command: "purge" });
    const tagged = view.runner?.tag?.["is-tagged"] || (view.runner?.tag?.total ?? 0) > 0;
    if (playable(5) && tagged) out.push({ label: "Trash resource", command: "trash-resource" });
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

export function runCommands(view: any, side: Side, autoContinue = false): Command[] {
  const run = view.run;
  const enc = view.encounters;
  const out: Command[] = [];
  const ice = currentIce(view);
  if (side === "corp") {
    if (run?.phase === "approach-ice" && ice && !ice.rezzed)
      out.push({ label: `Rez ${ice.title ?? "ice"}${ice.cost != null ? ` · ${ice.cost}¢` : ""}`, command: "rez", args: { card: cardRef(ice), "press-continue": autoContinue }, kind: "primary" });
    if ((run?.phase === "encounter-ice" || enc) && ice) {
      const subs: any[] = ice.subroutines ?? [];
      out.push({
        label: "Fire unbroken subroutines",
        command: "unbroken-subroutines",
        args: { card: cardRef(ice) },
        enabled: subs.some((s) => !s.broken && !s.fired && s.resolve !== false),
      });
    }
    if (enc) {
      out.push({ label: "Continue", command: "continue", enabled: enc["no-action"] !== "corp", kind: "primary" });
    } else if (run) {
      const label = run.phase === "initiation" ? nextPhaseLabel(view) : run["next-phase"] || run.position === 0 ? "No further actions" : nextPhaseLabel(view);
      out.push({
        label,
        command: "continue",
        enabled: run["no-action"] !== "corp" && (run.phase === "initiation" || run.phase !== "success"),
        kind: "primary",
      });
    }
    if (run && (enc?.["encounter-count"] ?? 0) <= 1 && run.phase !== "success")
      out.push({ label: run["corp-auto-no-action"] ? "Stop auto-passing" : "Auto-pass priority", command: "toggle-auto-no-action" });
    return out;
  }
  if (enc) {
    out.push({ label: "Continue", command: "continue", enabled: enc["no-action"] !== "runner", kind: "primary" });
  } else if (run) {
    if (run["next-phase"] && run.phase !== "initiation")
      out.push({ label: nextPhaseLabel(view), command: "start-next-phase", enabled: !run["no-action"], kind: "primary" });
    else if (run.phase === "initiation" || (!run["next-phase"] && run.position !== 0))
      out.push({ label: nextPhaseLabel(view), command: "continue", enabled: run["no-action"] !== "runner", kind: "primary" });
    else if (run.position === 0 && run.phase === "movement")
      out.push({ label: "Breach server", command: "continue", enabled: run["no-action"] !== "runner", kind: "primary" });
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
