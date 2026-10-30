import { it } from "vitest";
import { Replayed } from "./replayed.ts";

const file = process.env.REPLAY;
const from = Number(process.env.FROM ?? 0);
const to = Number(process.env.TO ?? 999);

const titleOf = (view: any, cid: string | undefined) => {
  if (!cid) return "";
  let found = "";
  const walk = (x: any) => {
    if (found || !x || typeof x !== "object") return;
    if (x.cid === cid && x.title) found = x.title;
    for (const v of Object.values(x)) walk(v);
  };
  walk(view);
  return found || "?";
};

it.skipIf(!file)("replays a shared game and shows what the current bot would do", () => {
  const r = new Replayed(file!);
  const side = r.botSide;
  let lastTurn = -1;
  while (!r.done) {
    const entry = r.entries[r.next];
    const view = r.view();
    const turn = r.turn;
    if (entry.side === side && entry.kind === "act") {
      if (turn !== lastTurn && turn >= from && turn <= to) {
        lastTurn = turn;
        const me = view[side];
        console.log(`\n=== turn ${turn} ${side} credits ${me.credit} clicks ${me.click} hand: ${(me.hand ?? []).map((c: any) => c.title).join(", ")}`);
      }
      const { move, record } = r.decide();
      if (turn >= from && turn <= to && record && record.stage !== "toast" && entry.command !== "toast") {
        const actual = `${entry.command} ${titleOf(view, entry.args?.card?.cid)}${entry.args?.server ? ` ${entry.args.server}` : ""}`;
        console.log(`  [${record.stage}] actual: ${actual.trim()} | now: ${record.chosen?.why ?? (move ? move.command : "-")}`);
        if (process.env.ALL) for (const p of record.considered.slice(0, 8)) console.log(`      ${p.score.toFixed(1)} ${p.why}`);
      }
    }
    r.step();
  }
  const end = r.view("corp");
  console.log("\nFINAL", JSON.stringify({ corp: end.corp["agenda-point"], runner: end.runner["agenda-point"], turn: end.turn }));
}, 600000);
