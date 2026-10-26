import { agendaProgress, plain, serverSafety } from "./tactics.ts";
import type { Observation, ServerInfo } from "./types.ts";

export interface ThreatReport {
  loss: number;
  gain: number;
  servers: { label: string; points: number; odds: number }[];
}

const POINT = 12;
const HQ_HORIZON = 2.5;

export function stealOdds(obs: Observation, server: ServerInfo): number {
  if (!server.ices.length) return 0.9;
  const safety = serverSafety(obs, server);
  if (safety.blocked) return 0.05;
  if (safety.safe) return 0.1;
  const odds = 0.55 - safety.margin * 0.06;
  return Math.max(0.08, Math.min(0.92, odds));
}

function runnerAccesses(obs: Observation, server: ServerInfo): number {
  let n = 1;
  const rig = ["program", "hardware", "resource"].flatMap((z) => obs.view.runner?.rig?.[z] ?? []);
  for (const c of rig) {
    const text = plain(obs.info(c).text ?? "");
    const m = text.match(/access (\d+|an?) additional cards?/i);
    if (!m) continue;
    const extra = /^\d+$/.test(m[1]) ? Number(m[1]) : 1;
    if (/hq/i.test(text) && server.key !== "hq") continue;
    if (/r&d/i.test(text) && server.key !== "rd") continue;
    if (/virus counter/i.test(text)) n += Math.min(extra * Number(c.counter?.virus ?? 0), 4);
    else n += extra;
  }
  return n;
}

function deckAgendas(obs: Observation): { left: number; points: number } {
  const cards = obs.deck?.cards ?? [];
  let left = 0;
  let points = 0;
  for (const c of cards) {
    const info = obs.info({ title: c.title }) as any;
    if (info.type !== "Agenda") continue;
    left += c.qty;
    points += c.qty * Number(info.agendapoints ?? 0);
  }
  const gone = [...(obs.me.scored ?? []), ...(obs.opp.scored ?? []), ...(obs.me.discard ?? []), ...obs.hand, ...obs.servers.flatMap((s) => s.content)].filter((c: any) => c.type === "Agenda");
  for (const c of gone) {
    left--;
    points -= Number(c.agendapoints ?? 0);
  }
  return { left: Math.max(0, left), points: Math.max(0, points) };
}

export function threat(obs: Observation): ThreatReport {
  const servers: ThreatReport["servers"] = [];
  let loss = 0;
  let gain = 0;
  const seamless = obs.hand.some((c) => c.title === "Seamless Launch");
  for (const s of obs.servers) {
    if (s.remote) {
      const agendas = s.content.filter((c: any) => c.type === "Agenda");
      if (!agendas.length) continue;
      const points = agendas.reduce((n: number, c: any) => n + Number(c.agendapoints ?? 0), 0);
      const odds = stealOdds(obs, s);
      const safety = serverSafety(obs, s);
      loss += points * POINT * odds;
      gain += odds * Math.min(12, safety.runnerCost) * 0.5;
      for (const a of agendas) {
        const { have, need } = agendaProgress(a);
        const reach = have + 3 + (seamless ? 1 : 0);
        if (reach >= need) gain += Number(a.agendapoints ?? 0) * POINT * (1 - odds) * 0.9;
        else if (reach + 3 >= need) gain += Number(a.agendapoints ?? 0) * POINT * (1 - odds) * 0.6;
        else gain += Number(a.agendapoints ?? 0) * POINT * (1 - odds) * 0.3;
      }
      servers.push({ label: s.label, points, odds });
      continue;
    }
    if (s.key === "hq") {
      const held = obs.hand.filter((c) => c.type === "Agenda");
      if (!held.length) continue;
      const points = held.reduce((n, c) => n + Number(c.agendapoints ?? 0), 0);
      const odds = stealOdds(obs, s) * 0.7;
      const perAccess = points / Math.max(1, obs.hand.length);
      const expected = Math.min(points, perAccess * runnerAccesses(obs, s));
      loss += expected * POINT * odds * HQ_HORIZON;
      servers.push({ label: s.label, points: expected, odds });
      continue;
    }
    if (s.key === "rd") {
      const deck = deckAgendas(obs);
      const count = Math.max(1, Number(obs.me["deck-count"] ?? 0));
      if (!deck.left) continue;
      const odds = stealOdds(obs, s) * 0.7;
      const expected = Math.min(deck.points, (deck.points / count) * runnerAccesses(obs, s));
      loss += expected * POINT * odds;
      servers.push({ label: s.label, points: expected, odds });
    }
  }
  return { loss, gain, servers };
}
