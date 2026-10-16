import { useState } from "preact/hooks";
import { type Command, cardCommands } from "./actions";
import { CardImage } from "./CardImage";
import { glyphs } from "./Glyphs";
import { iconize } from "./text";
import type { Side } from "../engine";

function installed(view: any): any[] {
  const out: any[] = [];
  const walk = (cards: any[]) =>
    cards?.forEach((c) => {
      out.push(c);
      walk(c.hosted ?? []);
    });
  const rig = view.runner?.rig ?? {};
  for (const k of ["program", "hardware", "resource"]) walk(rig[k] ?? []);
  return out;
}

export function Breakers({ view, side, ice, send, onTap, disabled }: { view: any; side: Side; ice: any; send: (command: string, args?: unknown) => void; onTap: (card: any) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const unbroken = (ice.subroutines ?? []).filter((s: any) => !s.broken && !s.fired && s.resolve !== false);
  const cards = installed(view);
  const breakers = cards.filter((c) => (c.subtypes ?? []).includes("Icebreaker"));
  const others = cards
    .filter((c) => !breakers.includes(c))
    .flatMap((card) =>
      cardCommands(card, view, side)
        .filter((cmd) => cmd.enabled !== false && (cmd.command === "ability" || cmd.command === "dynamic-ability"))
        .map((cmd) => ({ card, cmd })),
    );
  if (!unbroken.length) return null;
  const all = breakers.map((card) => {
    const cmds = cardCommands(card, view, side);
    const full = cmds.find((c) => c.command === "dynamic-ability" && (c.args as any).dynamic === "auto-pump-and-break");
    const ab = full && (card.abilities ?? []).find((a: any) => a.dynamic === "auto-pump-and-break");
    const manual = cmds.filter((c) => c !== full && c.enabled !== false && (c.command === "ability" || c.command === "dynamic-ability"));
    return { card, full, ab, manual };
  });
  const price = (r: (typeof all)[number]) => Number(String(r.ab?.["cost-label"] ?? "").match(/\d+/)?.[0] ?? 0);
  const rows = all.filter((r) => r.full).sort((a, b) => price(a) - price(b));
  const manual: { card: any; cmd: Command }[] = [...all.flatMap((r) => r.manual.map((cmd) => ({ card: r.card, cmd }))), ...others];
  if (!rows.length && !manual.length) return null;
  const runner = view.runner ?? {};
  const credits = runner.credit ?? 0;
  const badPub = runner["bad-pub-credit"] ?? 0;
  return (
    <div class="breakers">
      <div class="brk-head">
        <span>Break it</span>
        <span>
          you have <b>{credits}</b>
          {glyphs(iconize("[credit]"))}
          {badPub > 0 && <span class="brk-extra"> +{badPub} bad pub</span>}
        </span>
      </div>
      {rows.map(({ card, full, ab }) => {
        const label: string = ab?.label ?? "";
        return (
          <div class="brk best">
            <button class="brk-card" onClick={() => onTap(card)} aria-label={card.title}>
              {card.code && <CardImage code={card.code} alt={card.title} size="small" width="34px" />}
            </button>
            <div class="brk-text">
              <span class="brk-name">{card.title}</span>
              <span class="brk-desc">{label.startsWith("Match") ? "Match strength, break all" : "Break all"}</span>
            </div>
            {full && (
              <button class="brk-go" disabled={disabled || full.enabled === false} onClick={() => send(full.command, full.args)}>
                <span class="brk-cost">{glyphs(iconize(ab?.["cost-label"] ?? ""))}</span>
                <span class="brk-verb">Break</span>
              </button>
            )}
          </div>
        );
      })}
      {manual.length > 0 && (
        <div class={`brk-manual ${open ? "open" : ""}`}>
          <button class="brk-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "▾" : "▸"} Other abilities · {manual.length}
          </button>
          {open &&
            manual.map(({ card, cmd }) => (
              <button class="brk-ab" disabled={disabled || cmd.enabled === false} onClick={() => send(cmd.command, cmd.args)}>
                <span>
                  {card.title} · {glyphs(iconize(cmd.label))}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
