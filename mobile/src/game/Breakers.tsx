import { useState } from "preact/hooks";
import { type Command, cardCommands, findCard } from "./actions";
import { type Prober, useChecked, useProbe } from "./legal";
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

const hostedOn = (view: any, ice: any): any[] => ((findCard(view, ice.cid) ?? ice).hosted ?? []).filter((c: any) => c.side === "Runner");

function splitCost(label: string): [string, string] {
  const i = label.indexOf(":");
  return i > 0 && i < 40 ? [label.slice(0, i).trim(), label.slice(i + 1).trim()] : ["", label];
}

export function Breakers({ view, stamp, probe, side, ice, send, onTap, disabled, skip, onPartial }: { view: any; stamp?: unknown; probe?: Prober; side: Side; ice: any; send: (command: string, args?: unknown) => void; onTap: (card: any) => void; disabled: boolean; skip?: Set<number>; onPartial?: (breaker: any, subs: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const unbroken = (ice.subroutines ?? []).filter((s: any) => !s.broken && !s.fired && s.resolve !== false);
  const wanted = (ice.subroutines ?? []).filter((s: any, i: number) => !s.broken && !s.fired && s.resolve !== false && !skip?.has(i)).length;
  const partial = wanted < unbroken.length;
  const wantedLabels: string[] = (ice.subroutines ?? []).filter((s: any, i: number) => !s.broken && !s.fired && s.resolve !== false && !skip?.has(i)).map((s: any) => s.label);
  const cards = installed(view);
  const involved = [ice, ...hostedOn(view, ice), ...cards];
  const raw = involved.map((card) => cardCommands(card, view, side));
  const flat = useChecked(raw.flat(), probe, stamp ?? view);
  const byCard = new Map<unknown, Command[]>();
  let at = 0;
  involved.forEach((card, i) => {
    byCard.set(card.cid, flat.slice(at, at + raw[i].length));
    at += raw[i].length;
  });
  const cardCommandsOf = (card: any) => byCard.get(card.cid) ?? [];
  const breakerCards = cards.filter((c) => (c.subtypes ?? []).includes("Icebreaker"));
  const plans = useProbe(partial && wanted ? breakerCards.map((c) => ({ k: "break", ice: ice.cid, breaker: c.cid, want: wantedLabels })) : [], probe, stamp ?? view);
  const planOf = (card: any) => plans?.[breakerCards.indexOf(card)];
  const unbrokenLabels: string[] = (ice.subroutines ?? []).filter((s: any) => !s.broken && !s.fired && s.resolve !== false).map((s: any) => s.label);
  const reach = useProbe(unbrokenLabels.length ? breakerCards.map((c) => ({ k: "break", ice: ice.cid, breaker: c.cid, want: unbrokenLabels, boost: 99 })) : [], probe, ice.cid);
  const cannotBreak = (card: any) => reach?.[breakerCards.indexOf(card)]?.ok === false;
  const onIce = hostedOn(view, ice).flatMap((card) => {
    const usable = cardCommandsOf(card).filter((cmd) => cmd.enabled !== false && (cmd.command === "ability" || cmd.command === "dynamic-ability"));
    const single = unbroken.length === 1 && usable.some((cmd) => /break 1 subroutine/i.test(cmd.label));
    return usable.filter((cmd) => !(single && /fully break/i.test(cmd.label))).map((cmd) => ({ card, cmd }));
  });
  const breakers = cards.filter((c) => (c.subtypes ?? []).includes("Icebreaker"));
  const others = cards
    .filter((c) => !breakers.includes(c))
    .flatMap((card) =>
      cardCommandsOf(card)
        .filter((cmd) => cmd.enabled !== false && (cmd.command === "ability" || cmd.command === "dynamic-ability"))
        .map((cmd) => ({ card, cmd })),
    );
  if (!unbroken.length) return null;
  const all = breakers.map((card) => {
    const cmds = cardCommandsOf(card);
    const full = cmds.find((c) => c.command === "dynamic-ability" && (c.args as any).dynamic === "auto-pump-and-break");
    const ab = full && (card.abilities ?? []).find((a: any) => a.dynamic === "auto-pump-and-break");
    const manual = cmds.filter((c) => c !== full && c.enabled !== false && (c.command === "ability" || c.command === "dynamic-ability"));
    return { card, full, ab, manual };
  });
  const price = (r: (typeof all)[number]) => Number(String(r.ab?.["cost-label"] ?? "").match(/\d+/)?.[0] ?? 0);
  const rows = all.filter((r) => r.full).sort((a, b) => price(a) - price(b));
  const usable = all.flatMap((r) => r.manual.map((cmd) => ({ card: r.card, cmd, off: cannotBreak(r.card) })));
  const manual: { card: any; cmd: Command; off?: boolean }[] = [...usable.filter((m) => !m.off), ...others, ...usable.filter((m) => m.off)];
  const fromIce = cardCommandsOf(ice).filter((c) => c.command === "runner-ability");
  if (!rows.length && !manual.length && !fromIce.length && !onIce.length) return null;
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
      {onIce.map(({ card, cmd }) => {
        const [cost, effect] = splitCost(cmd.label);
        return (
          <div class="brk best">
            <button class="brk-card" onClick={() => onTap(card)} aria-label={card.title}>
              {card.code && <CardImage code={card.code} alt={card.title} size="small" width="30px" />}
            </button>
            <div class="brk-text">
              <span class="brk-head-line">
                <span class="brk-name">{card.title}</span>
                <span class="brk-meta">
                  {(card.subtypes ?? []).join(" · ")}
                  {card.counter?.virus != null && (
                    <>
                      {" · "}
                      <span class="stat" aria-label={`${card.counter.virus} virus counters`}>
                        <Icon name="virus" />
                        {card.counter.virus}
                      </span>
                    </>
                  )}
                </span>
              </span>
              <span class="brk-desc">{glyphs(iconize(effect))}</span>
            </div>
            <button class="brk-go" disabled={disabled} onClick={() => send(cmd.command, cmd.args)}>
              <span class="brk-cost">
                {/^(\d+ )?hosted virus counters?$/i.test(cost) ? (
                  <span aria-label={cost}>
                    {cost.match(/\d+/)?.[0] ?? 1}
                    <Icon name="virus" class="glyph" />
                  </span>
                ) : (
                  glyphs(iconize(cost))
                )}
              </span>
              <span class="brk-verb">{/^break/i.test(effect) ? "Break" : "Use"}</span>
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
                        <span class={`stat brk-str ${fits ? "ok" : "low"}`} data-tip="strength" aria-label={`strength ${str}`}>
                          <Icon name="strength" />
                          {str}
                        </span>
                      </>
                    );
                  })()}
                </span>
              </span>
              <span class="brk-desc">{partial ? (wanted ? `${label.startsWith("Match") ? "Match strength, break" : "Break"} ${wanted} of ${unbroken.length}` : "Nothing selected") : label.startsWith("Match") ? "Match strength, break all" : "Break all"}</span>
            </div>
            {full && !(partial && !wanted) && (
              <button class="brk-go" disabled={disabled || (partial ? !planOf(card)?.ok : full.enabled === false)} onClick={() => (partial ? onPartial?.(card, wantedLabels) : send(full.command, full.args))}>
                <span class="brk-cost">
                  {partial
                    ? (() => {
                        const plan = planOf(card);
                        return plan?.ok && plan.credits != null ? glyphs(iconize(`${plan.credits} [Credits]`)) : "";
                      })()
                    : glyphs(iconize(ab?.["cost-label"] ?? ""))}
                </span>
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
            manual.map(({ card, cmd, off }) => (
              <button class={`brk-ab ${off ? "off" : ""}`} disabled={disabled || cmd.enabled === false} onClick={() => send(cmd.command, cmd.args)}>
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
