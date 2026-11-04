import type { Observation, Plan, Proposal } from "../types.ts";
import { glacier } from "./gateway-corp.ts";
import { centralPressure } from "./gateway-runner.ts";

type Push = (p: Proposal | null) => void;
export type Extra = (obs: Observation, plan: Plan, out: Proposal[], push: Push) => void;
export type PromptExtra = (obs: Observation, plan: Plan) => Proposal | null;

const CORP: Extra[] = [];
const CORP_PROMPTS: PromptExtra[] = [];
const RUNNER: Extra[] = [];
const RUNNER_PROMPTS: PromptExtra[] = [];

export function corpExtra(proposals: Extra, prompt?: PromptExtra) {
  if (!CORP.includes(proposals)) CORP.push(proposals);
  if (prompt && !CORP_PROMPTS.includes(prompt)) CORP_PROMPTS.push(prompt);
}

export function runnerExtra(proposals: Extra, prompt?: PromptExtra) {
  if (!RUNNER.includes(proposals)) RUNNER.push(proposals);
  if (prompt && !RUNNER_PROMPTS.includes(prompt)) RUNNER_PROMPTS.push(prompt);
}

export function corpProposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  return glacier.proposals(obs, plan, base, (out, push) => {
    for (const f of CORP) f(obs, plan, out, push);
  });
}

export function corpPrompt(obs: Observation, plan: Plan): Proposal | null {
  const deck = glacier.prompt(obs, plan);
  if (deck) return deck;
  for (const f of CORP_PROMPTS) {
    const p = f(obs, plan);
    if (p) return p;
  }
  return null;
}

export function runnerProposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  const out = centralPressure.proposals(obs, plan, base);
  const push: Push = (p) => {
    if (p) out.push(p);
  };
  for (const f of RUNNER) f(obs, plan, out, push);
  return out;
}

export function runnerPrompt(obs: Observation, plan: Plan): Proposal | null {
  const deck = centralPressure.prompt(obs, plan);
  if (deck) return deck;
  for (const f of RUNNER_PROMPTS) {
    const p = f(obs, plan);
    if (p) return p;
  }
  return null;
}
