import type { Candidate } from "../../game/candidates.ts";
import { byCommand } from "./observe.ts";
import { fromCandidate } from "./runs.ts";
import { ICE_TYPES, type IceType, agendaProgress, coverage, estimateRun, gainOf, iceThreat, isEconomy, isIcebreaker, isTrap, iceTypes, playCostOf, rezCostOf, strengthOf, subtypes, tagged, runTrialOf, serverSafety } from "./tactics.ts";
import type { Observation, Plan, Proposal } from "./types.ts";
import { centralValue } from "./value.ts";

export const playOf = (obs: Observation, card: any, server?: string): Candidate | undefined => byCommand(obs, "play", (c) => (c.args as any)?.card?.cid === card.cid && (server === undefined || (c.args as any)?.server === server))[0];
export const cardAction = (obs: Observation, card: any, command: string, label?: RegExp): Candidate | undefined => byCommand(obs, command, (c) => (c.args as any)?.card?.cid === card.cid && (!label || label.test(c.label)))[0];
export const proposal = (c: Candidate | undefined, score: number, why: string, kind: string, exact = true): Proposal | null => (c ? fromCandidate(c, score, why, kind, exact) : null);

export function genericPlan(obs: Observation, current: Plan | null): Plan {
  const keep = (kind: string, goal: string) => (current?.kind === kind ? current : { kind, goal, since: obs.turn });
  if (obs.side === "corp") {
    const scoring = obs.servers.some((s) => s.content.some((c) => c.type === "Agenda"));
    if (scoring) return keep("score", "advance and score the installed agenda");
    if (obs.credits < 5) return keep("economy", "rebuild credits before committing to a server");
    return keep("build", "ice the centrals and prepare a scoring remote");
  }
  if (!obs.rig.some((c) => isIcebreaker(c)) || obs.credits < 5) return keep("setup", "build economy and the breaker suite");
  return keep("pressure", "run the most valuable reachable server");
}

export function iceInstallCost(server: { ices: any[] }) {
  return server.ices.length;
}

export function corpProposals(obs: Observation): Proposal[] {
  const out: Proposal[] = [];
  const push = (p: Proposal | null) => p && out.push(p);
  const installed = obs.servers.flatMap((s) => s.content);
  for (const card of installed) {
    push(proposal(cardAction(obs, card, "score"), 100, `score ${card.title}`, "score"));
  }
  for (const server of obs.servers.filter((s) => s.remote)) {
    for (const card of server.content) {
      if (card.type !== "Agenda" || obs.credits < 1) continue;
      const { have, need } = agendaProgress(card);
      const finish = have + obs.clicks >= need && obs.credits >= need - have;
      const score = (finish ? 90 : server.ices.length ? 60 + have * 5 : 30) - (!finish && obs.credits <= 2 ? 25 : 0);
      push(proposal(cardAction(obs, card, "advance"), score, finish ? `advance ${card.title}: it scores this turn` : `advance ${card.title} (${have}/${need})`, "advance"));
    }
  }
  const staleBait = (s: any) => {
    const held = s.content.filter((c: any) => c.type !== "Upgrade");
    return held.length === 1 && held[0].type === "Asset" && !held[0].rezzed && (obs.memory.installedAt.get(held[0].cid) ?? obs.turn) <= obs.turn - 2;
  };
  const empty = obs.servers.filter((s) => s.remote && s.ices.length > 0 && (s.content.every((c: any) => c.type === "Upgrade") || staleBait(s)));
  const agendas = obs.hand.filter((c) => c.type === "Agenda");
  if (agendas.length && empty.length) {
    const agenda = [...agendas].sort((a, b) => agendaProgress(a).need - agendaProgress(b).need)[0];
    const target = [...empty].sort((a, b) => Number(staleBait(a)) - Number(staleBait(b)) || b.ices.length - a.ices.length)[0];
    push(proposal(playOf(obs, agenda, target.label), obs.credits >= 2 ? 70 : 40, `install ${agenda.title} behind ${target.ices.length} ice in ${target.label}${staleBait(target) ? " over the bait the Runner ignored" : ""}`, "install-agenda"));
  }
  for (const card of obs.hand) {
    if (card.type !== "Operation") continue;
    const gain = gainOf(obs.info(card).text);
    const cost = playCostOf(card);
    if (gain > cost && cost <= obs.credits) push(proposal(playOf(obs, card), obs.credits < 8 ? 65 + (gain - cost) : 45, `play ${card.title}: +${gain - cost} net`, "economy"));
  }
  const virus = (obs.view.runner?.rig?.program ?? []).map((c: any) => ({ title: c.title, counters: Number(c.counter?.virus ?? 0), text: obs.info(c).text ?? "" }));
  const virusCounters = virus.reduce((n: number, v: any) => n + v.counters, 0);
  const digger = virus.some((v: any) => /access|additional card/i.test(v.text));
  const digging = virus.filter((v: any) => v.counters >= 3 && /access|additional card/i.test(v.text));
  const purge = byCommand(obs, "purge")[0];
  if (purge && obs.clicks >= 3 && (digging.length || virusCounters >= 6)) {
    const worst = digging.sort((a: any, b: any) => b.counters - a.counters)[0];
    push(proposal(purge, Math.min(worst ? 52 + Math.min(30, worst.counters * 6) : 46, obs.credits < 4 ? 28 : 99), worst ? `purge: ${worst.title} holds ${worst.counters} virus counters` : `purge ${virusCounters} virus counters`, "purge"));
  }
  const openRemotes = obs.servers.filter((s) => s.remote && !s.content.length);
  const runnerCredits = Number(obs.view.runner?.credit ?? 0);
  for (const card of obs.hand) {
    if (card.type !== "Asset" || !isEconomy(obs.info(card).text) || isTrap(obs.info(card).text)) continue;
    const target = openRemotes.find((s) => !s.ices.length)?.label ?? (obs.servers.filter((s) => s.remote).length < 4 ? "New remote" : undefined);
    const exposed = runnerCredits >= Number(card.trash ?? 2) + 4;
    if (target) push(proposal(playOf(obs, card, target), (obs.credits < 6 ? 55 : 35) - (exposed ? 12 : 0), `install ${card.title} in ${target}${exposed ? " (the Runner can afford to trash it)" : ""}`, "install-economy"));
  }
  for (const server of obs.servers.filter((s) => s.remote)) {
    for (const card of server.content) {
      if (card.rezzed || card.type !== "Asset") continue;
      const text = obs.info(card).text;
      if (isTrap(text) || !isEconomy(text) || rezCostOf(card) > obs.credits) continue;
      push(proposal(cardAction(obs, card, "rez"), 58, `rez ${card.title}`, "rez-economy"));
    }
  }
  const ice = obs.hand.filter((c) => c.type === "ICE").sort((a, b) => strengthOf(b) - strengthOf(a));
  if (ice.length) {
    const hq = obs.servers.find((s) => s.key === "hq")!;
    const rd = obs.servers.find((s) => s.key === "rd")!;
    const targets: { server: { label: string; ices: any[] }; score: number; why: string; urgent?: boolean }[] = [];
    const recentRuns = (label: string) => obs.memory.notes.runsSeen && (obs.memory.notes.runsSeen as Record<string, number[]>)[label]?.filter((t) => t >= obs.turn - 2).length;
    const hqRuns = Number(recentRuns("HQ") ?? 0);
    const rdRuns = Number(recentRuns("R&D") ?? 0);
    if (!hq.ices.length) targets.push({ server: hq, score: (agendas.length ? 60 : 50) + (hqRuns >= 2 ? 20 : hqRuns ? 12 : 0), urgent: hqRuns >= 1, why: hqRuns ? `HQ is open and the Runner ran it ${hqRuns} times lately` : agendas.length ? "HQ is open with an agenda in hand" : "HQ is open" });
    if (!rd.ices.length) targets.push({ server: rd, score: 48 + (rdRuns >= 2 ? 22 : rdRuns ? 14 : 0), urgent: rdRuns >= 1, why: rdRuns ? `R&D is open and the Runner ran it ${rdRuns} times lately` : "R&D is open" });
    if (agendas.length && !empty.length) targets.push({ server: { label: "New remote", ices: [] }, score: hq.ices.length ? 52 : 45, why: "an agenda in hand needs a protected remote" });
    for (const s of obs.servers.filter((x) => x.remote && x.content.length && x.ices.length < 2)) {
      const upgradesOnly = s.content.every((c: any) => c.type === "Upgrade");
      targets.push({ server: s, score: upgradesOnly && agendas.length ? 56 : 45, why: upgradesOnly ? `${s.label} is the scoring remote: deepen it` : `${s.label} holds something worth protecting` });
    }
    if (obs.credits >= 12) {
      for (const s of obs.servers.filter((x) => x.remote && x.ices.length >= 2 && x.ices.length < 5 && (x.content.length ? x.content.every((c: any) => c.type === "Upgrade" || c.type === "Agenda") : agendas.length > 0))) {
        const safety = serverSafety(obs, s);
        if (safety.safe || safety.margin >= 0) continue;
        targets.push({ server: s, score: s.content.some((c: any) => c.type === "Agenda") ? 60 : 54, why: `deepen ${s.label}: the Runner still gets in with ${-safety.margin} to spare` });
      }
    }
    for (const s of [rd, hq].sort((a, b) => a.ices.length - b.ices.length)) {
      const runs = Number(recentRuns(s.label) ?? 0);
      const siege = runs >= 2 && (digger || s.key === "hq");
      const safety = s.ices.length ? serverSafety(obs, s) : null;
      const porous = !!safety && !safety.blocked && safety.runnerCost <= 2 && runs >= 1;
      if (s.ices.length >= (siege ? 4 : 3) && !(porous && s.ices.length < 4)) continue;
      if (obs.credits < 6 && runs < 2 && !porous) continue;
      targets.push({ server: s, score: 40 - s.ices.length * 3 + (runs >= 2 ? 18 : runs ? 9 : 0) + (siege ? 6 : 0) + (porous ? 12 : 0), urgent: runs >= 1, why: porous ? `ice ${s.label}: the Runner walks in for ${safety!.runnerCost} and ran it ${runs} times lately` : siege ? `ice ${s.label}: the Runner is digging it (${runs} runs lately)` : runs ? `deepen ${s.label}: the Runner ran it ${runs} times lately` : `deepen ${s.label}` });
    }
    const rezDebt = obs.servers.flatMap((s) => s.ices).filter((i: any) => !i.rezzed).reduce((n: number, i: any) => n + rezCostOf(i), 0);
    const endsRun = (c: any) => iceThreat({ ...c, subroutines: [] }, obs.info(c), 99).etr;
    const forRemote = [...ice].sort((a, b) => (endsRun(b) ? 6 : 0) + strengthOf(b) - ((endsRun(a) ? 6 : 0) + strengthOf(a)));
    const saveEnder = agendas.length > 0 && ice.length >= 2 && ice.filter(endsRun).length < ice.length;
    const forCentral = saveEnder ? [...ice].sort((a, b) => (endsRun(a) ? 6 : 0) - strengthOf(a) - ((endsRun(b) ? 6 : 0) - strengthOf(b))) : ice;
    for (const t of targets) {
      const pool = /Server|remote/.test(t.server.label) ? forRemote : forCentral;
      const spare = Math.max(0, obs.credits - rezDebt);
      const card = pool.find((c) => rezCostOf(c) <= spare + 1) ?? pool.find((c) => rezCostOf(c) <= obs.credits + 3) ?? pool[0];
      const installCost = iceInstallCost(t.server);
      if (installCost > obs.credits) continue;
      const left = obs.credits - installCost;
      const overIced = rezDebt + rezCostOf(card) > obs.credits + 6 && !(t.server.ices.length === 0 && rezCostOf(card) <= obs.credits) && !(t.urgent && rezCostOf(card) <= left);
      const penalty = (left < rezCostOf(card) ? 8 : 0) + (left < 3 ? 10 : 0) + (rezDebt + rezCostOf(card) > obs.credits + 4 && !(t.urgent && rezCostOf(card) <= left) ? 12 : 0);
      push(proposal(playOf(obs, card, t.server.label), overIced ? Math.min(t.score - penalty, 22) : t.score - penalty, `install ${card.title} on ${t.server.label}: ${t.why}${rezDebt + rezCostOf(card) > obs.credits + 4 ? " (more ice than the credits can rez)" : ""}`, "install-ice"));
    }
  }
  if (agendas.length && obs.hand.length > 5) push(proposal(playOf(obs, agendas[0], "New remote"), 25, `install ${agendas[0].title} naked to avoid discarding it`, "install-naked"));
  const trap = obs.hand.find((c) => c.type === "Asset" && isTrap(obs.info(c).text));
  if (trap && obs.servers.filter((s) => s.remote).length < 4 && obs.credits >= 3) push(proposal(playOf(obs, trap, "New remote"), 38, `install ${trap.title} as a bait`, "install-trap"));
  if (tagged(obs.view) && obs.credits >= (obs.hand.some((c) => c.type === "Agenda") ? 7 : 4) && (obs.view.runner?.rig?.resource ?? []).length) push(proposal(byCommand(obs, "trash-resource")[0], 45, "trash a resource while the Runner is tagged", "trash-resource"));
  const wantCredits = obs.hand.some((c) => c.type === "Operation" && gainOf(obs.info(c).text) > playCostOf(c) && playCostOf(c) > obs.credits);
  const nearly = obs.hand.some((c) => c.type === "Operation" && gainOf(obs.info(c).text) > playCostOf(c) + 3 && playCostOf(c) > obs.credits && playCostOf(c) <= obs.credits + obs.clicks);
  const deckLeft = Number(obs.me["deck-count"] ?? 0);
  const broke = obs.credits < 3 && obs.servers.some((s) => s.ices.some((i) => !i.rezzed && rezCostOf(i) > obs.credits));
  const rich = obs.credits >= 12 && obs.hand.length <= 2 && !ice.length;
  if (obs.hand.length < 4 && deckLeft > 8) push(proposal(byCommand(obs, "draw")[0], broke ? 29 : rich ? 50 : 35, rich ? "draw: rich but nothing to spend on" : "draw: the hand is thin", "draw"));
  if (obs.credits >= 15 && deckLeft > 8 && obs.hand.length < 5) push(proposal(byCommand(obs, "draw")[0], 40, "draw: credits are plentiful, cards are not", "draw"));
  if (obs.credits >= 12 && deckLeft > 8 && !ice.length && (obs.hand.length <= 5 || (obs.credits >= 18 && obs.hand.length <= 6 && obs.clicks >= 2)) && ((obs.memory.notes.kinds as string[] | undefined) ?? []).filter((k) => k === "draw").length < 2) push(proposal(byCommand(obs, "draw")[0], 42, "draw: rich with no ice in hand", "draw"));
  push(proposal(byCommand(obs, "credit")[0], 30 + (nearly ? 18 : wantCredits ? 10 : 0) + (obs.credits < 3 ? 4 : 0) + (broke ? 8 : 0), broke ? "take a credit: unrezzed ice cannot be rezzed" : nearly ? "take a credit: an economy operation in hand is playable this turn" : wantCredits ? "take a credit towards an economy operation in hand" : "take a credit", "credit"));
  if (deckLeft > 8) push(proposal(byCommand(obs, "draw")[0], 28, "draw a card", "draw"));
  return out;
}

export function serverValue(obs: Observation, server: Observation["servers"][number]): number {
  if (server.key === "rd") return obs.memory.notes.rdSeenTurn === obs.turn ? 0 : (centralValue(obs, server) ?? 3);
  if (server.key === "hq") return centralValue(obs, server) ?? 2 + Number(obs.opp["hand-count"] ?? 0) / 5;
  if (server.key === "archives") return (obs.opp.discard ?? []).filter((c: any) => !c.seen && !c.title).length >= 2 ? 1.5 : 0;
  if (!server.content.length) return 0;
  const adv = Math.max(0, ...server.content.map((c: any) => agendaProgress(c).have));
  const unknown = server.content.some((c: any) => {
    const known = c.title ? c : obs.memory.seen.get(c.cid);
    if (known) return known.type === "Agenda";
    return !obs.memory.duds.has(c.cid);
  });
  if (unknown) return 5 + adv * 3;
  const trashable = server.content.some((c: any) => c.rezzed && c.trash != null && obs.credits >= Number(c.trash) + 3 && isEconomy(obs.info(c).text));
  return trashable ? 2 : 0;
}

export function runProposals(obs: Observation, limit = 2): Proposal[] {
  const out: Proposal[] = [];
  if (obs.memory.runsThisTurn >= limit || obs.hand.length < 2) return out;
  const corpPoints = Number(obs.opp["agenda-point"] ?? 0);
  for (const server of obs.servers) {
    const value = serverValue(obs, server);
    if (value <= 0) continue;
    const adv = Math.max(0, ...server.content.map((c: any) => agendaProgress(c).have));
    const decisive = server.remote && corpPoints >= 5 && adv >= 1 && server.content.some((c: any) => !c.rezzed || c.type === "Agenda");
    const est = runTrialOf(obs, server) ?? estimateRun(obs, server, 3, obs.credits + (decisive ? 3 : 0));
    if (est.blocked || est.credits > obs.credits + (decisive ? 3 : 0)) continue;
    if (est.damage >= obs.hand.length) continue;
    if (adv > 1 && obs.hand.length < 1 + adv) continue;
    const run = byCommand(obs, "run", (c) => (c.args as any)?.server === server.label)[0];
    if (!run) continue;
    const base = Math.min(40 + (value - est.credits * 0.3 - est.damage * 1.5) * 4, value < 2 ? 32 : 200);
    const score = decisive ? Math.max(base, 72) : base;
    out.push(fromCandidate(run, score, `run ${server.label}: value ${value.toFixed(1)}, ${est.exact ? "costs" : "about"} ${est.credits}${est.damage ? `, ${est.damage} damage` : ""}${decisive ? " (decisive: the Corp scores out of there next turn)" : ""}`, "run", est.exact));
  }
  return out;
}

export function runnerProposals(obs: Observation): Proposal[] {
  const out: Proposal[] = [];
  const push = (p: Proposal | null) => p && out.push(p);
  if ((obs.me.tag?.base ?? 0) > 0 && obs.credits >= 2) push(proposal(byCommand(obs, "remove-tag")[0], 70, "remove a tag", "remove-tag"));
  for (const card of obs.hand) {
    const info = obs.info(card);
    const cost = playCostOf(card);
    if (card.type === "Event") {
      const gain = gainOf(info.text);
      if (gain > cost && cost <= obs.credits) push(proposal(playOf(obs, card), obs.credits < 8 ? 65 + (gain - cost) : 45, `play ${card.title}: +${gain - cost} net`, "economy"));
    } else if (card.type === "Resource" && isEconomy(info.text) && obs.credits >= cost + 1) push(proposal(playOf(obs, card), 55, `install ${card.title} for economy`, "install-economy"));
  }
  const covered = coverage(obs);
  const memoryLeft = Number(obs.me.memory?.available ?? 4) - Number(obs.me.memory?.used ?? 0);
  const seenIce = new Set<IceType>();
  for (const s of obs.servers) for (const ice of s.ices) if (ice.rezzed) iceTypes(ice).forEach((t) => seenIce.add(t));
  for (const card of obs.hand) {
    if (!isIcebreaker(card) || playCostOf(card) > obs.credits || Number(obs.info(card).memoryunits ?? 1) > memoryLeft) continue;
    const subs = subtypes(card);
    const ai = subs.includes("AI");
    const adds = ai ? ICE_TYPES.filter((t) => !covered.has(t)) : (["Fracter", "Decoder", "Killer"] as const).flatMap((b, i) => (subs.includes(b) && !covered.has(ICE_TYPES[i]) ? [ICE_TYPES[i]] : []));
    if (!adds.length) continue;
    const urgent = adds.some((t) => seenIce.has(t));
    push(proposal(playOf(obs, card), urgent ? 62 : 48, `install ${card.title}: covers ${adds.join(", ")}${urgent ? " (ice seen)" : ""}`, "install-breaker"));
  }
  out.push(...runProposals(obs, obs.credits >= 8 ? 3 : 2));
  for (const card of obs.rig) {
    for (const c of byCommand(obs, "ability", (x) => (x.args as any)?.card?.cid === card.cid && /\[click\]/i.test(x.label))) {
      const take = c.label.match(/take (\d+)\s*\[credit/i);
      const place = c.label.match(/place (\d+)\s*\[credit/i);
      const all = /take all/i.test(c.label);
      const added = all ? c.label.match(/(?:gain|place) (\d+)\s*\[credit/i) : null;
      const stored = Number(card.counter?.credit ?? 0) + (added ? Number(added[1]) : 0);
      if (all) push(proposal(c, stored >= 3 ? Math.min(74, 44 + stored * 3) : stored * 10, `${card.title}: take ${stored} credits`, "click-economy"));
      else if (take) push(proposal(c, 56, `${card.title}: take ${take[1]} credits`, "click-economy"));
      else if (place && Number(card.counter?.credit ?? 0) < 3) push(proposal(c, 22, `${card.title}: place ${place[1]} credits for later`, "click-economy"));
    }
  }
  for (const card of obs.hand) {
    if (card.type === "Event" || isIcebreaker(card) || obs.credits < playCostOf(card) + 2) continue;
    if (card.type === "Program" && Number(obs.info(card).memoryunits ?? 1) > memoryLeft) continue;
    push(proposal(playOf(obs, card), 30 + (card.type === "Hardware" ? 5 : 0), `install ${card.title}`, "install"));
  }
  for (const card of obs.hand) {
    if (card.type !== "Event" || subtypes(card).includes("Run") || gainOf(obs.info(card).text) || obs.credits < playCostOf(card) + 2) continue;
    push(proposal(playOf(obs, card), 29, `play ${card.title}`, "play"));
  }
  const wantCredits = obs.hand.some((c) => gainOf(obs.info(c).text) > playCostOf(c) && playCostOf(c) > obs.credits);
  if (obs.hand.length <= 2 && (obs.me["deck-count"] ?? 0) > 0) push(proposal(byCommand(obs, "draw")[0], 36, "draw: the hand is nearly empty", "draw"));
  else if (obs.hand.length < 4 && obs.credits >= 4 && (obs.me["deck-count"] ?? 0) > 0) push(proposal(byCommand(obs, "draw")[0], 33, "draw: the hand is thin", "draw"));
  push(proposal(byCommand(obs, "credit")[0], 30 + (wantCredits ? 10 : 0) + (obs.credits < 3 ? 4 : 0), wantCredits ? "take a credit towards an economy card in hand" : "take a credit", "credit"));
  push(proposal(byCommand(obs, "draw")[0], 28, "draw a card", "draw"));
  return out;
}

export function corpFreeProposals(obs: Observation): Proposal[] {
  const out: Proposal[] = [];
  for (const card of obs.servers.flatMap((s) => s.content)) out.push(...[proposal(cardAction(obs, card, "score"), 100, `score ${card.title}`, "score")].filter((p): p is Proposal => !!p));
  for (const server of obs.servers.filter((s) => s.remote)) {
    for (const card of server.content) {
      if (card.rezzed || card.type !== "Asset") continue;
      const text = obs.info(card).text;
      if (isTrap(text) || !isEconomy(text) || rezCostOf(card) > obs.credits) continue;
      const c = cardAction(obs, card, "rez");
      if (c) out.push(fromCandidate(c, 58, `rez ${card.title} before ending the turn`, "rez-economy"));
    }
  }
  return out;
}

