import { useEffect, useState } from "preact/hooks";
import type { Side } from "../engine";
import { findCard } from "./actions";
import { iconize } from "./text";

interface Props {
  view: any;
  side: Side;
  prompt: any;
  render: (msg: unknown) => string;
  send: (command: string, args?: unknown) => void;
  disabled: boolean;
}

function NumberPicker({ min, max, initial, onSubmit, disabled, extra }: { min: number; max: number; initial: number; onSubmit: (n: number) => void; disabled: boolean; extra?: preact.ComponentChildren }) {
  const [n, setN] = useState(initial);
  useEffect(() => setN(initial), [initial, min, max]);
  return (
    <div class="number-picker">
      <button onClick={() => setN(Math.max(min, n - 1))} disabled={disabled || n <= min}>−</button>
      <output>{n}</output>
      <button onClick={() => setN(Math.min(max, n + 1))} disabled={disabled || n >= max}>+</button>
      {extra}
      <button class="primary" onClick={() => onSubmit(n)} disabled={disabled}>Valider</button>
    </div>
  );
}

function choiceLabel(value: any, render: (m: unknown) => string) {
  if (value && typeof value === "object") return value.title ?? value["printed-title"] ?? render(value);
  return render(value);
}

export function PromptPanel({ view, side, prompt, render, send, disabled }: Props) {
  const ptype = prompt["prompt-type"];
  const choices = prompt.choices;
  const eid = prompt.eid;
  const msg = iconize(render(prompt.msg));
  const answer = (choice: unknown) => send("choice", { eid, choice });
  const [title, setTitle] = useState("");
  let body: preact.ComponentChildren = null;

  if (ptype === "waiting") {
    body = <p class="waiting">⏳</p>;
  } else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.number != null) {
    const max = Number(choices.number);
    const min = Number(choices.minimum ?? 0);
    body = <NumberPicker min={min} max={max} initial={Number(choices.default ?? min)} onSubmit={answer} disabled={disabled} />;
  } else if (ptype === "trace") {
    const max = Number(choices ?? 0);
    const info =
      prompt.strength != null
        ? `Force à battre : ${prompt.strength}`
        : prompt.player === "corp"
          ? `Trace ${prompt.base}${prompt.bonus ? `+${prompt.bonus}` : ""} — lien du Runner : ${prompt.link}`
          : `Trace ${prompt.base}${prompt.bonus ? `+${prompt.bonus}` : ""} + crédits Corp — votre lien : ${prompt.link}`;
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
        <input list="card-titles" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="Nom de carte" />
        <datalist id="card-titles">
          {options.slice(0, 500).map((o) => (
            <option value={o} />
          ))}
        </datalist>
        <button class="primary" disabled={disabled || !title} onClick={() => answer(title)}>Valider</button>
      </div>
    );
  } else if (choices && typeof choices === "object" && !Array.isArray(choices) && choices.counter) {
    const card = findCard(view, prompt.card?.cid);
    const max = Number(card?.counter?.[choices.counter] ?? 0);
    body = <NumberPicker min={0} max={max} initial={0} onSubmit={answer} disabled={disabled} />;
  } else if (Array.isArray(choices)) {
    body = (
      <div class="choices">
        {ptype === "select" && <p class="hint">Touchez les cartes en surbrillance sur le plateau.</p>}
        {choices
          .filter((c: any) => c.value !== "Hide")
          .map((c: any) => (
            <button class={ptype === "select" ? "primary" : ""} disabled={disabled} onClick={() => answer({ uuid: c.uuid })}>
              {iconize(choiceLabel(c.value, render))}
            </button>
          ))}
        {prompt["offer-bad-pub?"] && (
          <button disabled={disabled} onClick={() => send("bad-pub-choice", { eid })}>
            Mauvaise publicité ({view.runner?.["bad-pub-credit"] ?? "?"} dispo.)
          </button>
        )}
      </div>
    );
  }

  return (
    <section class={`prompt prompt-${ptype ?? "other"}`}>
      {prompt.card?.title && prompt.card.type !== "Basic Action" && <div class="prompt-card">{prompt.card.title}</div>}
      <p class="prompt-msg">{msg}</p>
      {body}
    </section>
  );
}
