import type { Side } from "../../engine.ts";
import type { Candidate } from "../../game/candidates.ts";
import type { CardInfo, Lookup } from "../heuristic.ts";

export type { CardInfo, Lookup };

export interface Move {
  command: string;
  args?: unknown;
  say?: string;
}

export interface Proposal {
  move: Move;
  score: number;
  why: string;
  kind: string;
  exact?: boolean;
}

export interface Plan {
  kind: string;
  goal: string;
  since: number;
  detail?: Record<string, unknown>;
}

export interface DeckList {
  identity: string;
  cards: { title: string; qty: number }[];
}

export interface Estimate {
  value: number;
  exact: boolean;
}

export interface SeenCard {
  cid: string;
  title?: string;
  type?: string;
  zone: string;
  turn: number;
}

export interface RunRecord {
  turn: number;
  server: string;
  successful: boolean;
  stole: boolean;
  accessed: string[];
}

export interface Memory {
  seen: Map<string, SeenCard>;
  firstSeen: Map<string, number>;
  installedAt: Map<string, number>;
  opponentTitles: Set<string>;
  duds: Set<string>;
  runs: RunRecord[];
  runsThisTurn: number;
  turnKey: string;
  notes: Record<string, unknown>;
}

export interface ServerInfo {
  key: string;
  label: string;
  ices: any[];
  content: any[];
  remote: boolean;
}

export interface Observation {
  view: any;
  side: Side;
  me: any;
  opp: any;
  turn: number;
  active: Side;
  myTurn: boolean;
  clicks: number;
  credits: number;
  hand: any[];
  prompt: any | null;
  promptType: string | null;
  promptText: string;
  run: any | null;
  encounter: any | null;
  currentIce: any | null;
  servers: ServerInfo[];
  rig: any[];
  candidates: Candidate[];
  memory: Memory;
  info: (card: any) => CardInfo;
  render: (msg: unknown) => string;
  random: () => number;
}

export interface MulliganAdvice {
  keep: boolean;
  why: string;
}

export interface DeckPolicy {
  id: string;
  version: string;
  side: Side;
  decks: DeckList[];
  mulligan?(obs: Observation): MulliganAdvice | null;
  plan(obs: Observation, current: Plan | null): Plan;
  proposals?(obs: Observation, plan: Plan, base: Proposal[]): Proposal[];
  prompt?(obs: Observation, plan: Plan): Proposal | null;
  run?(obs: Observation, plan: Plan): Proposal | null;
}

export interface DecisionRecord {
  n: number;
  turn: number;
  side: Side;
  active: Side;
  stage: "toast" | "turn" | "prompt" | "run" | "click" | "free" | "end" | "idle";
  plan: Plan | null;
  chosen: Proposal | null;
  considered: Proposal[];
  refused?: boolean;
  unhandled?: string;
  ms: number;
  signature: string;
}
