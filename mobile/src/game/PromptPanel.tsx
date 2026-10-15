import { useEffect, useState } from "preact/hooks";
import type { Side } from "../engine";
import { findCard } from "./actions";
import { ZoomableCardImage } from "./CardImage";
import { Icon } from "../icons";
import { RichText } from "./RichText";
import { iconize } from "./text";
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
}

function NumberPicker({ min, max, initial, onSubmit, disabled, extra }: { min: number; max: number; initial: number; onSubmit: (n: number) => void; disabled: boolean; extra?: preact.ComponentChildren }) {
  const [n, setN] = useState(initial);
  useEffect(() => setN(initial), [initial, min, max]);
  return (
    <div class="number-picker">
      <button aria-label="Decrease" onClick={() => setN(Math.max(min, n - 1))} disabled={disabled || n <= min}><Icon name="minus" /></button>
      <output>{n}</output>
      <button aria-label="Increase" onClick={() => setN(Math.min(max, n + 1))} disabled={disabled || n >= max}><Icon name="plus" /></button>
      {extra}
      <button class="primary submit" onClick={() => onSubmit(n)} disabled={disabled}>Confirm</button>
    </div>
  );
}

function choiceLabel(value: any, render: (m: unknown) => string) {
  if (value && typeof value === "object") return value.title ?? value["printed-title"] ?? render(value);
  return render(value);
}

export function PromptPanel({ view, side, prompt, render, send, closePrompt, disabled, db }: Props) {
  const ptype = prompt["prompt-type"];
  const choices = prompt.choices;
  const eid = prompt.eid;
  const msg = iconize(render(prompt.msg));
  const answer = (choice: unknown) => send("choice", { eid, choice });
  const [title, setTitle] = useState("");
  let body: preact.ComponentChildren = null;

  if (ptype === "waiting") {
    body = <span class="status">Waiting…</span>;
  } else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.number != null) {
    const max = Number(choices.number);
    const min = Number(choices.minimum ?? 0);
    body = <NumberPicker min={min} max={max} initial={Number(choices.default ?? min)} onSubmit={answer} disabled={disabled} />;
  } else if (ptype === "trace") {
    const max = Number(choices ?? 0);
    const info =
      prompt.strength != null
        ? `Strength to beat: ${prompt.strength}`
        : prompt.player === "corp"
          ? `Trace ${prompt.base}${prompt.bonus ? `+${prompt.bonus}` : ""} · Runner link ${prompt.link}`
          : `Trace ${prompt.base}${prompt.bonus ? `+${prompt.bonus}` : ""} + Corp credits · your link ${prompt.link}`;
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
        <button class="primary" disabled={disabled || !title} onClick={() => answer(title)}>Confirm</button>
      </div>
    );
  } else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.counter) {
    const card = findCard(view, prompt.card?.cid);
    const max = Number(card?.counter?.[choices.counter] ?? 0);
    body = <NumberPicker min={0} max={max} initial={0} onSubmit={answer} disabled={disabled} />;
  } else if (Array.isArray(choices)) {
    body = (
      <div class="choices">
        {ptype === "select" && <p class="hint">Tap the highlighted cards to select them.</p>}
        {choices
          .filter((c: any) => c.value !== "Hide")
          .map((c: any) => (
            <button class={ptype === "select" ? "primary" : ""} disabled={disabled} onClick={() => answer({ uuid: c.uuid })}>
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
    );
  }

  const source = prompt.card?.title && prompt.card.type !== "Basic Action" ? prompt.card : null;
  const code: string | undefined = source?.code;
  const accessed = !!code && /^You accessed /.test(msg);

  const full = accessed ? db.byTitle.get(source.title) : undefined;

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
            {full?.text ? <RichText class="card-text" text={full.text} /> : <p class="prompt-msg">{glyphs(msg)}</p>}
          </div>
        </div>
      ) : (
        <>
          {source && <span class="prompt-card">{source.title}</span>}
          <p class="prompt-msg">{glyphs(msg)}</p>
        </>
      )}
      {full?.text && <p class="prompt-msg">{glyphs(msg)}</p>}
      {body}
    </section>
  );
}
