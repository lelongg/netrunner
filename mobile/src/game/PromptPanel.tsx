import { useEffect, useRef, useState } from "preact/hooks";
import type { Side } from "../engine";
import { cardRef, findCard } from "./actions";
import { createPortal } from "preact/compat";
import { CardImage, ZoomableCardImage } from "./CardImage";
import { Pager } from "./Pager";
import { useSheetPager } from "./swipe";
import { useBackClose } from "../back";
import { returnAccessed } from "../fx/access";
import { Icon } from "../icons";
import { RichText } from "./RichText";
import { byServerOrder, iconize } from "./text";
import { glyphs } from "./Glyphs";

interface Props {
  view: any;
  side: Side;
  prompt: any;
  render: (msg: unknown) => string;
  send: (command: string, args?: unknown) => void;
  closePrompt: () => void;
  disabled: boolean;
  db: { byTitle: Map<string, any> };
  staging?: { count: number; names: string[]; onConfirm: () => void; onClear: () => void };
  onShowZone?: () => void;
  zoneLabel?: string;
}

function NumberPicker({ min, max, initial, onSubmit, disabled, extra }: { min: number; max: number; initial: number; onSubmit: (n: number) => void; disabled: boolean; extra?: preact.ComponentChildren }) {
  const [n, setN] = useState(initial);
  useEffect(() => setN(initial), [initial, min, max]);
  return (
    <div class="number-picker">
      <button aria-label="Decrease" onClick={() => setN(Math.max(min, n - 1))} disabled={disabled || n <= min}>
        <Icon name="minus" />
      </button>
      <output>{n}</output>
      <button aria-label="Increase" onClick={() => setN(Math.min(max, n + 1))} disabled={disabled || n >= max}>
        <Icon name="plus" />
      </button>
      {extra}
      <button class="primary submit" onClick={() => onSubmit(n)} disabled={disabled}>
        Confirm
      </button>
    </div>
  );
}

interface CardChoice {
  choice: any;
  card: any;
}

function ChoiceSheet({ items, index, disabled, onGo, onPick, onClose }: { items: CardChoice[]; index: number; disabled: boolean; onGo: (i: number) => void; onPick: (c: CardChoice) => void; onClose: () => void }) {
  const sheet = useRef<HTMLDivElement>(null);
  const step = (dir: -1 | 1) => items[index + dir] && onGo(index + dir);
  const swipe = useSheetPager(sheet, index, (dir) => !!items[index + dir], step);
  const cc = items[index];
  const info = (card: any) => (
    <div class="sheet-info">
      <span class="label">
        {card.type}
        {Array.isArray(card.subtypes) && card.subtypes.length ? ` · ${card.subtypes.join(" · ")}` : ""}
      </span>
      <h2>{card.title}</h2>
      {card.text && <RichText class="card-text" text={card.text} />}
    </div>
  );
  return createPortal(
    <div class="sheet-backdrop" onClick={onClose}>
      <div ref={sheet} class="sheet panel swipeable" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={cc.card.title} {...swipe}>
        {items.length > 1 && <Pager index={index} count={items.length} onStep={step} />}
        {([["prev", index - 1], ["next", index + 1]] as const).map(([k, i]) => {
          const n = items[i];
          return (
            n && (
              <div key={`${k}:${i}`} class={`sheet-peek ${k}`} aria-hidden="true">
                <CardImage class="sheet-img" code={n.card.code} alt="" size="large" />
                {info(n.card)}
              </div>
            )
          );
        })}
        <div key={index} class="sheet-head">
          <ZoomableCardImage class="sheet-img" code={cc.card.code} alt={cc.card.title} size="large" gallery={items.map((x) => ({ code: x.card.code, alt: x.card.title }))} galleryStart={index} onGallery={onGo} />
          {info(cc.card)}
        </div>
        <div class="sheet-actions">
          <button class="primary" disabled={disabled} onClick={() => onPick(cc)}>
            Choose {cc.card.title}
          </button>
          <button class="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function choiceLabel(value: any, render: (m: unknown) => string) {
  if (value && typeof value === "object") return value.title ?? value["printed-title"] ?? render(value);
  return render(value);
}

export function PromptPanel({ view, side, prompt, render, send, closePrompt, disabled, db, staging, onShowZone, zoneLabel }: Props) {
  const ptype = prompt["prompt-type"];
  const choices = prompt.choices;
  const eid = prompt.eid;
  const msg = iconize(render(prompt.msg));
  const answer = (choice: unknown) => send("choice", { eid, choice });
  const [title, setTitle] = useState("");
  const [peek, setPeek] = useState<number | null>(null);
  useBackClose(peek != null, () => setPeek(null));
  const cardChoices: CardChoice[] = Array.isArray(choices)
    ? choices.flatMap((c: any) => {
        const t = c.value && typeof c.value === "object" ? (c.value.title as string | undefined) : typeof c.value === "string" ? c.value : undefined;
        const card = t ? db.byTitle.get(t) : undefined;
        return card?.code && card.type !== "Identity" ? [{ choice: c, card }] : [];
      })
    : [];
  const pay = ptype === "select" ? render(prompt.msg).match(/^Choose a credit providing card \((\d+)(?: of (\d+))?/) : null;
  const sources: any[] = pay ? (prompt.selectable ?? []).map((cid: unknown) => findCard(view, cid)).filter(Boolean) : [];
  const owed = pay?.[2] != null ? Math.max(0, Number(pay[2]) - Number(pay[1])) : undefined;
  const pool = Number(view[side]?.credit ?? 0);
  const poolOk = owed != null && pool >= owed;
  const useSource = (card: any) => send("select", { card: cardRef(card), eid, "shift-key-held": true });
  const auto = useRef<unknown>(null);
  const only = pay && sources.length === 1 && !poolOk && !prompt["offer-bad-pub?"] ? sources[0] : null;
  useEffect(() => {
    if (!only || disabled || auto.current === eid?.eid) return;
    auto.current = eid?.eid;
    useSource(only);
  }, [eid?.eid, !!only, disabled]);
  let body: preact.ComponentChildren = null;

  if (ptype === "waiting") {
    body = <span class="status">Waiting…</span>;
  } else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.number != null) {
    const max = Number(choices.number);
    const min = Number(choices.minimum ?? 0);
    body = <NumberPicker min={min} max={max} initial={Number(choices.default ?? min)} onSubmit={answer} disabled={disabled} />;
  } else if (ptype === "trace") {
    const max = Number(choices ?? 0);
    const info = prompt.strength != null ? `Strength to beat: ${prompt.strength}` : prompt.player === "corp" ? `Trace ${prompt.base}${prompt.bonus ? `+${prompt.bonus}` : ""} · Runner link ${prompt.link}` : `Trace ${prompt.base}${prompt.bonus ? `+${prompt.bonus}` : ""} + Corp credits · your link ${prompt.link}`;
    body = (
      <>
        <p class="hint">{info}</p>
        <NumberPicker min={0} max={max} initial={0} onSubmit={answer} disabled={disabled} />
      </>
    );
  } else if (choices === "credit") {
    body = <NumberPicker min={0} max={Number(view[side]?.credit ?? 0)} initial={0} onSubmit={answer} disabled={disabled} />;
  } else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices["card-title"] !== undefined) {
    const options: string[] = choices.autocomplete ?? [];
    body = (
      <div class="card-title-input">
        <input list="card-titles" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="card name" aria-label="Card name" />
        <datalist id="card-titles">
          {options.slice(0, 500).map((o) => (
            <option value={o} />
          ))}
        </datalist>
        <button class="primary" disabled={disabled || !title} onClick={() => answer(title)}>
          Confirm
        </button>
      </div>
    );
  } else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.counter) {
    const card = findCard(view, prompt.card?.cid);
    const max = Number(card?.counter?.[choices.counter] ?? 0);
    body = <NumberPicker min={0} max={max} initial={0} onSubmit={answer} disabled={disabled} />;
  } else if (pay && Array.isArray(choices)) {
    const done = choices.find((c: any) => c.value === "Done");
    const bp = Number(prompt["offer-bad-pub?"] || 0);
    body = (
      <>
        {owed != null && (
          <p class="hint">
            {owed ? `${owed} credits left to pay` : "Paid"}
            {only ? ` · using ${only.title}` : ""}
          </p>
        )}
        <div class="choices">
          {sources.map((card) => {
            const left = (card.counter?.credit ?? 0) + (card.counter?.recurring ?? 0) + (card["rec-counter"] ?? 0);
            return (
              <button class="primary wide" disabled={disabled} onClick={() => useSource(card)}>
                {glyphs(iconize(`Use ${card.title}${left ? ` · ${left}[credit]` : ""}`))}
              </button>
            );
          })}
          {bp > 0 && owed != null && owed > 0 && (() => {
            const use = Math.min(bp, owed);
            const rest = owed - use;
            const label = !rest ? `Pay ${owed}[credit] with bad publicity` : sources.length ? `Use ${use}[credit] bad publicity first` : `Pay ${owed}[credit] · ${use} bad publicity + ${rest} pool`;
            return (
              <button class="primary wide" disabled={disabled || (!sources.length && pool < rest)} onClick={() => Array.from({ length: use }, () => send("bad-pub-choice", { eid }))}>
                {glyphs(iconize(label))}
              </button>
            );
          })()}
          {bp > 0 && (
            <button disabled={disabled} onClick={() => send("bad-pub-choice", { eid })}>
              {glyphs(iconize(`Use 1[credit] bad publicity · ${bp} left`))}
            </button>
          )}
          {done && (
            <button class="wide" disabled={disabled || (owed != null && !poolOk)} onClick={() => answer({ uuid: done.uuid })}>
              {glyphs(iconize(owed ? `Pay ${owed}[credit] from your pool` : "Done"))}
            </button>
          )}
        </div>
      </>
    );
  } else if (Array.isArray(choices) && cardChoices.length >= 2) {
    const others = choices.filter((c: any) => c.value !== "Hide" && !cardChoices.some((cc) => cc.choice === c));
    body = (
      <>
        <div class="choice-cards">
          {cardChoices.map((cc, i) => (
            <button class="choice-card" disabled={disabled} onClick={() => setPeek(i)} aria-label={cc.card.title}>
              <CardImage code={cc.card.code} alt={cc.card.title} size="small" width="28vw" lazy />
              <span>{cc.card.title}</span>
            </button>
          ))}
        </div>
        {others.length > 0 && (
          <div class="choices">
            {others.map((c: any) => (
              <button data-choice={c.uuid} disabled={disabled} onClick={() => answer({ uuid: c.uuid })}>
                {glyphs(iconize(choiceLabel(c.value, render)))}
              </button>
            ))}
          </div>
        )}
        {peek != null && cardChoices[peek] && (
          <ChoiceSheet
            items={cardChoices}
            index={peek}
            disabled={disabled}
            onGo={setPeek}
            onPick={(cc) => {
              setPeek(null);
              answer({ uuid: cc.choice.uuid });
            }}
            onClose={() => setPeek(null)}
          />
        )}
      </>
    );
  } else if (staging) {
    const max: number = prompt["select-max"] ?? 1;
    const min: number = prompt["select-all"] ? max : (prompt["select-min"] ?? 0);
    const ready = staging.count >= min && staging.count <= max;
    const verb = /^discard/i.test(msg) ? "Discard" : /^trash/i.test(msg) ? "Trash" : "Confirm";
    const what = staging.count === 0 ? "nothing" : staging.names.length === 1 ? staging.names[0] : `${staging.count} cards`;
    const extra = (Array.isArray(choices) ? choices : []).filter((c: any) => c.value !== "Hide" && c.value !== "Done");
    const canDone = staging.count > 0 || (Array.isArray(choices) && choices.some((c: any) => c.value === "Done"));
    body = (
      <>
        {staging.count === 0 && <p class="hint">Tap a highlighted card to look at it and select it.</p>}
        <div class="choices">
          {onShowZone && (
            <button disabled={disabled} onClick={onShowZone}>
              Show {zoneLabel ?? "cards"}
            </button>
          )}
          {staging.count > 0 && (
            <button disabled={disabled} onClick={staging.onClear}>
              Clear
            </button>
          )}
          {extra.map((c: any) => (
            <button data-choice={c.uuid} disabled={disabled} onClick={() => answer({ uuid: c.uuid })}>
              {glyphs(iconize(choiceLabel(c.value, render)))}
            </button>
          ))}
          {(canDone || !ready) && (
            <button class="primary wide select-go" disabled={disabled || !ready} onClick={staging.onConfirm}>
              {ready ? `${verb} ${what}` : `Pick ${min - staging.count} more`}
            </button>
          )}
        </div>
      </>
    );
  } else if (Array.isArray(choices)) {
    body = (
      <>
        {ptype === "select" && <p class="hint">Tap a highlighted card to look at it and select it.</p>}
        <div class={`choices ${choices.some((c: any) => choiceLabel(c.value, render).length > 22) ? "long" : ""}`}>
          {byServerOrder(choices, (c: any) => c.value)
            .filter((c: any) => c.value !== "Hide")
            .map((c: any) => (
              <button
                data-choice={c.uuid}
                class={ptype === "select" ? "primary wide" : ""}
                disabled={disabled}
                onClick={() => {
                  if (accessed && /^no action$/i.test(String(c.value))) returnAccessed(source, document.querySelector(".prompt.accessed .prompt-img"), view.run?.server?.[0]);
                  answer({ uuid: c.uuid });
                }}
              >
                {glyphs(iconize(choiceLabel(c.value, render)))}
              </button>
            ))}
          {prompt["offer-bad-pub?"] && (
            <button disabled={disabled} onClick={() => send("bad-pub-choice", { eid })}>
              Bad publicity ({view.runner?.["bad-pub-credit"] ?? "?"} available)
            </button>
          )}
          {ptype === "select" && !(prompt.selectable ?? []).length && choices.every((c: any) => c.value === "Hide") && (
            <button class="primary" disabled={disabled} onClick={closePrompt}>
              Skip · no valid target
            </button>
          )}
        </div>
      </>
    );
  }

  const source = prompt.card?.title && prompt.card.type !== "Basic Action" ? prompt.card : null;
  const code: string | undefined = source?.code;
  const accessed = !!code && /^You accessed /.test(msg);

  const full = accessed ? db.byTitle.get(source.title) : undefined;
  const selMax: number = prompt["select-max"] ?? 1;
  const msgLine = staging ? (
    <div class="prompt-msg-row">
      <p class="prompt-msg">{glyphs(msg)}</p>
      <span class="select-count" aria-live="polite">
        {selMax <= 12 && (
          <span class="select-pips">
            {Array.from({ length: selMax }, (_, i) => (
              <i class={i < staging.count ? "on" : ""} />
            ))}
          </span>
        )}
        <span>
          <b>{staging.count}</b>/{selMax}
        </span>
      </span>
    </div>
  ) : (
    <p class="prompt-msg">{glyphs(msg)}</p>
  );

  return (
    <section class={`prompt prompt-${ptype ?? "other"} ${accessed ? "accessed" : ""}`}>
      {code ? (
        <div class="prompt-head">
          <ZoomableCardImage class="prompt-img" code={code} alt={source.title} size={accessed ? "large" : "small"} />
          <div class="prompt-info">
            {full && (
              <span class="label">
                {full.type}
                {Array.isArray(full.subtypes) && full.subtypes.length ? ` · ${full.subtypes.join(" · ")}` : ""}
              </span>
            )}
            <span class="prompt-card">{source.title}</span>
            {full?.text ? <RichText class="card-text" text={full.text} /> : msgLine}
          </div>
        </div>
      ) : (
        <>
          {source && <span class="prompt-card">{source.title}</span>}
          {msgLine}
        </>
      )}
      {full?.text && msgLine}
      {body}
    </section>
  );
}
