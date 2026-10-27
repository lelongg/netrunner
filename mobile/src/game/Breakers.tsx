import { useState } from "preact/hooks";
import { type Command, cardCommands, findCard } from "./actions";
import { type Prober, useChecked, useProbe } from "./legal";
import { Icon } from "../icons";
import { CardImage } from "./CardImage";
import { glyphs } from "./Glyphs";
import { iconize } from "./text";
import { t } from "../i18n";
import { labelText, shown, typeLine } from "./labels";
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

function CostView({ cost }: { cost: string }) {
  const virus = cost.match(/^(\d+ )?hosted virus counters?$/i);
  if (virus)
    return (
      <span aria-label={cost}>
        {virus[1]?.trim() ?? 1}
        <Icon name="virus" class="glyph" />
      </span>
    );
  return <>{glyphs(iconize(cost.replace(/^lose /i, "−")))}</>;
}

function grouped<T extends { card: any; cmd: Command }>(items: T[]): { item: T; count: number; virus: number | null }[] {
  const out: { key: string; items: T[] }[] = [];
  for (const it of items) {
    const key = `${it.card.title}\n${it.cmd.label}`;
    const g = out.find((x) => x.key === key);
    if (g) g.items.push(it);
    else out.push({ key, items: [it] });
  }
  return out.map(({ items: list }) => {
    const counts = list.map((x) => x.card.counter?.virus).filter((n): n is number => n != null);
    return { item: list.find((x) => x.cmd.enabled !== false) ?? list[0], count: list.length, virus: counts.length ? counts.reduce((a, b) => a + b, 0) : null };
  });
}

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
  const autoBreakers = hostedOn(view, ice).filter((c) => (c.abilities ?? []).some((a: any) => a.dynamic === "auto-pump-and-break"));
  const breakerCards = [...autoBreakers, ...cards.filter((c) => (c.subtypes ?? []).includes("Icebreaker"))];
  const plans = useProbe(partial && wanted ? breakerCards.map((c) => ({ k: "break", ice: ice.cid, breaker: c.cid, want: wantedLabels })) : [], probe, stamp ?? view);
  const planOf = (card: any) => plans?.[breakerCards.indexOf(card)];
  const fundsOf = useProbe(breakerCards.map((c) => ({ k: "funds", card: c.cid })), probe, stamp ?? view)?.map((r) => r.funds?.total);
  const known = (fundsOf ?? []).filter((n): n is number => n != null);
  const funds = known.length ? Math.min(...known) : null;
  const extraOf = (card: any) => (funds == null ? 0 : (fundsOf?.[breakerCards.indexOf(card)] ?? funds) - funds);
  const unbrokenLabels: string[] = (ice.subroutines ?? []).filter((s: any) => !s.broken && !s.fired && s.resolve !== false).map((s: any) => s.label);
  const reach = useProbe(unbrokenLabels.length ? breakerCards.map((c) => ({ k: "break", ice: ice.cid, breaker: c.cid, want: unbrokenLabels, boost: 99 })) : [], probe, ice.cid);
  const cannotBreak = (card: any) => reach?.[breakerCards.indexOf(card)]?.ok === false;
  const onIce = hostedOn(view, ice).filter((card) => !autoBreakers.includes(card)).flatMap((card) => {
    const usable = cardCommandsOf(card).filter((cmd) => cmd.enabled !== false && (cmd.command === "ability" || cmd.command === "dynamic-ability"));
    const single = unbroken.length === 1 && usable.some((cmd) => /break 1 subroutine/i.test(cmd.label));
    return usable.filter((cmd) => !(single && /fully break/i.test(cmd.label))).map((cmd) => ({ card, cmd }));
  });
  const breakers = breakerCards;
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
  const rows = all.filter((r) => r.full || (partial && wanted && planOf(r.card)?.ok)).sort((a, b) => price(a) - price(b));
  const usable = all.flatMap((r) => r.manual.map((cmd) => ({ card: r.card, cmd, off: cannotBreak(r.card) })));
  const aimed = others.filter(({ cmd }) => /piece of ice|subroutine/i.test(cmd.label));
  const featured = [...onIce, ...aimed];
  const manual: { card: any; cmd: Command; off?: boolean }[] = [...usable.filter((m) => !m.off), ...others.filter((o) => !aimed.includes(o)), ...usable.filter((m) => m.off)];
  const fromIce = cardCommandsOf(ice).filter((c) => c.command === "runner-ability");
  if (!rows.length && !manual.length && !fromIce.length && !featured.length) return null;
  const badPub = view.runner?.["bad-pub-credit"] ?? 0;
  return (
    <div class="breakers">
      {funds != null ? (
        <div class="brk-funds">
          {funds}
          {glyphs(iconize("[credit]"))}
        </div>
      ) : (
        badPub > 0 && (
          <div class="brk-head">
            <span>
              +<b>{badPub}</b>
              {glyphs(iconize("[credit]"))} {t("bad publicity for this run")}
            </span>
          </div>
        )
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
              <span class="brk-desc">{glyphs(iconize(shown(effect)))}</span>
            </div>
            <button class="brk-go" disabled={disabled || cmd.enabled === false} onClick={() => send(cmd.command, cmd.args)}>
              <span class="brk-cost">
                <CostView cost={cost} />
              </span>
              <span class="brk-verb">{t("Use")}</span>
            </button>
          </div>
        );
      })}
      {grouped(featured).map(({ item: { card, cmd }, count, virus }) => {
        const [cost, effect] = splitCost(cmd.label);
        return (
          <div class="brk best">
            <button class="brk-card" onClick={() => onTap(card)} aria-label={card.title}>
              {card.code && <CardImage code={card.code} alt={card.title} size="small" width="30px" />}
            </button>
            <div class="brk-text">
              <span class="brk-head-line">
                <span class="brk-name">
                  {card.title}
                  {count > 1 ? ` ×${count}` : ""}
                </span>
                <span class="brk-meta">
                  {typeLine(card.subtypes ?? [])}
                  {virus != null && (
                    <>
                      {" · "}
                      <span class="stat" aria-label={t("{n} virus counters", { n: virus })}>
                        <Icon name="virus" />
                        {virus}
                      </span>
                    </>
                  )}
                </span>
              </span>
              <span class="brk-desc">{glyphs(iconize(shown(effect)))}</span>
            </div>
            <button class="brk-go" disabled={disabled || (/^break/i.test(effect) && !wanted)} onClick={() => (/^break/i.test(effect) && onPartial ? onPartial(card, wantedLabels) : send(cmd.command, cmd.args))}>
              <span class="brk-cost">
                <CostView cost={cost} />
              </span>
              <span class="brk-verb">{/^break/i.test(effect) ? t("Break") : t("Use")}</span>
            </button>
          </div>
        );
      })}
      {rows.map(({ card, full, ab }) => {
        const label: string = ab?.label ?? (Number(card["current-strength"] ?? card.strength ?? 0) < Number(ice["current-strength"] ?? ice.strength ?? 0) ? "Match" : "");
        return (
          <div class="brk best">
            <button class="brk-card" onClick={() => onTap(card)} aria-label={card.title}>
              {card.code && <CardImage code={card.code} alt={card.title} size="small" width="30px" />}
            </button>
            <div class="brk-text">
              <span class="brk-head-line">
                <span class="brk-name">{card.title}</span>
                <span class="brk-meta">
                  {typeLine((card.subtypes ?? []).filter((t: string) => t !== "Icebreaker"))}
                  {extraOf(card) > 0 && (
                    <>
                      {" · "}
                      <span class="brk-extra" aria-label={t("{n} more credits for this breaker", { n: extraOf(card) })}>
                        +{extraOf(card)}
                        {glyphs(iconize("[credit]"))}
                      </span>
                    </>
                  )}
                  {(() => {
                    const str = card["current-strength"] ?? card.strength;
                    if (str == null) return null;
                    const fits = Number(str) >= Number(ice["current-strength"] ?? ice.strength ?? 0);
                    return (
                      <>
                        {" · "}
                        <span class={`stat brk-str ${fits ? "ok" : "low"}`} data-tip="strength" aria-label={t("strength {n}", { n: str })}>
                          <Icon name="strength" />
                          {str}
                        </span>
                      </>
                    );
                  })()}
                </span>
              </span>
              <span class="brk-desc">{partial ? (wanted ? t(label.startsWith("Match") ? "Match strength, break {n} of {total}" : "Break {n} of {total}", { n: wanted, total: unbroken.length }) : t("Nothing selected")) : label.startsWith("Match") ? t("Match strength, break all") : t("Break all")}</span>
            </div>
            {(partial ? !!wanted : !!full) && (
              <button class="brk-go" disabled={disabled || (partial ? !planOf(card)?.ok : full!.enabled === false)} onClick={() => (partial ? onPartial?.(card, wantedLabels) : send(full!.command, full!.args))}>
                <span class="brk-cost">
                  {partial
                    ? (() => {
                        const plan = planOf(card);
                        if (!plan?.ok) return "";
                        const virus = plan.virus ?? 0;
                        if (virus > 0 && !plan.credits) return <CostView cost={`${virus} hosted virus counters`} />;
                        return plan.credits != null ? glyphs(iconize(`${plan.credits} [Credits]`)) : "";
                      })()
                    : <CostView cost={String(ab?.["cost-label"] ?? "")} />}
                </span>
                <span class="brk-verb">{t("Break")}</span>
              </button>
            )}
          </div>
        );
      })}
      {manual.length > 0 && (
        <div class={`brk-manual ${open ? "open" : ""}`}>
          <button class="brk-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "▾" : "▸"} {t("Other abilities")} · {manual.length}
          </button>
          {open &&
            grouped(manual).map(({ item: { card, cmd, off }, count }) => (
              <button class={`brk-ab ${off ? "off" : ""}`} disabled={disabled || cmd.enabled === false} onClick={() => send(cmd.command, cmd.args)}>
                <span>
                  {card.title}
                  {count > 1 ? ` ×${count}` : ""} · {glyphs(iconize(labelText(cmd.label, cmd.command)))}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
