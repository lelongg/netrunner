import { useState } from "preact/hooks";
import { type Command, cardCommands } from "./actions";
import { Icon } from "../icons";
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

function splitCost(label: string): [string, string] {
  const i = label.indexOf(":");
  return i > 0 && i < 40 ? [label.slice(0, i).trim(), label.slice(i + 1).trim()] : ["", label];
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
  const fromIce = cardCommands(ice, view, side).filter((c) => c.command === "runner-ability");
  if (!rows.length && !manual.length && !fromIce.length) return null;
  const badPub = view.runner?.["bad-pub-credit"] ?? 0;
  return (
    <div class="breakers">
      {badPub > 0 && (
        <div class="brk-head">
          <span>
            +<b>{badPub}</b>
            {glyphs(iconize("[credit]"))} bad publicity for this run
          </span>
        </div>
      )}
      {fromIce.map((cmd) => {
        const [cost, effect] = splitCost(cmd.label);
        return (
          <div class="brk best">
            <button class="brk-card" onClick={() => onTap(ice)} aria-label={ice.title}>
              {ice.code && <CardImage code={ice.code} alt={ice.title} size="small" width="30px" />}
            </button>
            <div class="brk-text">
              <span class="brk-name">{ice.title}</span>
              <span class="brk-desc">{glyphs(iconize(effect))}</span>
            </div>
            <button class="brk-go" disabled={disabled || cmd.enabled === false} onClick={() => send(cmd.command, cmd.args)}>
              <span class="brk-cost">{glyphs(iconize(cost))}</span>
              <span class="brk-verb">Use</span>
            </button>
          </div>
        );
      })}
      {rows.map(({ card, full, ab }) => {
        const label: string = ab?.label ?? "";
        return (
          <div class="brk best">
            <button class="brk-card" onClick={() => onTap(card)} aria-label={card.title}>
              {card.code && <CardImage code={card.code} alt={card.title} size="small" width="30px" />}
            </button>
            <div class="brk-text">
              <span class="brk-head-line">
                <span class="brk-name">{card.title}</span>
                <span class="brk-meta">
                  {(card.subtypes ?? []).filter((t: string) => t !== "Icebreaker").join(" · ")}
                  {(() => {
                    const str = card["current-strength"] ?? card.strength;
                    if (str == null) return null;
                    const fits = Number(str) >= Number(ice["current-strength"] ?? ice.strength ?? 0);
                    return (
                      <>
                        {" · "}
                        <span class={`brk-str ${fits ? "ok" : "low"}`} data-tip="strength" aria-label={`strength ${str}`}>
                          <Icon name="strength" />
                          {str}
                        </span>
                      </>
                    );
                  })()}
                </span>
              </span>
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
