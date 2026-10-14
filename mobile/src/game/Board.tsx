import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { CardDb, EngineApi, Side } from "../engine";
import type { Session } from "../session";
import { Cta, LogoMark, Meter, Ticker } from "../ui";
import { type Command, basicCommands, cardRef, currentIce, findCard, otherSide, promptOf, runCommands } from "./actions";
import { CardSheet } from "./CardSheet";
import { CardTile } from "./CardTile";
import { PromptPanel } from "./PromptPanel";
import { PHASE_LABELS, iconize, serverLabel, serverName } from "./text";

interface Props {
  session: Session;
  engine: EngineApi;
  db: CardDb;
  side: Side;
  view: any;
  onSwitchSide?: () => void;
  onLeave: () => void;
}

function serverOrder(servers: Record<string, any>) {
  const remotes = Object.keys(servers)
    .filter((k) => k.startsWith("remote"))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  return ["hq", "rd", "archives", ...remotes];
}

function extras(p: any, side: Side): string[] {
  const out: string[] = [];
  if (side === "runner") {
    if (p.memory) out.push(`MU ${p.memory.available}/${(p.memory.available ?? 0) + (p.memory.used ?? 0)}`);
    out.push(`${p.tag?.total ?? 0} tag`);
    if (p.link) out.push(`link ${p.link}`);
    if (p["brain-damage"]) out.push(`core dmg ${p["brain-damage"]}`);
  } else {
    const bp = (p["bad-publicity"]?.base ?? 0) + (p["bad-publicity"]?.additional ?? 0);
    if (bp) out.push(`${bp} bad pub`);
  }
  return out;
}

function Opponent({ view, side, name }: { view: any; side: Side; name: string }) {
  const p = view[side] ?? {};
  const active = view["active-player"] === side;
  const points = p["agenda-point"] ?? 0;
  const req = p["agenda-point-req"] ?? 7;
  return (
    <section class="panel opp">
      <div style="display: flex; flex-direction: column; gap: 4px">
        <span class={`label who-${side}`}>
          {side} // {name}
        </span>
        <span class="big">{p.credit ?? 0}¢</span>
      </div>
      <div class="opp-info">
        <div class="row">
          <span class={`label ${active ? "cyan" : ""}`}>{active ? "■ their turn" : "□ waiting"}</span>
        </div>
        <span class="label" style="color: var(--text)">
          Hand {p["hand-count"] ?? 0} · {p.click ?? 0} click
        </span>
        <Meter value={points} max={req} tone="red" />
        <span class="label">
          Points {points}/{req}
          {extras(p, side).map((x) => ` · ${x}`)}
        </span>
      </div>
    </section>
  );
}

function MeBar({ view, side, name }: { view: any; side: Side; name: string }) {
  const p = view[side] ?? {};
  const points = p["agenda-point"] ?? 0;
  const req = p["agenda-point-req"] ?? 7;
  const clicks = p.click ?? 0;
  return (
    <div class="me-bar">
      <span class="big yellow">{p.credit ?? 0}¢</span>
      <div class="me-info">
        <span class={`label who-${side}`}>
          {side} // {name}
        </span>
        <div style="display: flex; gap: 10px; align-items: center">
          <Meter value={clicks} max={Math.max(clicks, side === "runner" ? 4 : 3)} />
          <span class="label">{clicks} click</span>
        </div>
        <span class="label">
          {points}/{req} pts
          {extras(p, side).map((x) => ` · ${x}`)}
        </span>
      </div>
    </div>
  );
}

function Pile({ label, count, cards, onTap, owner, side }: { label: string; count: number; cards?: any[]; onTap: (c: any) => void; owner: boolean; side: "Corp" | "Runner" }) {
  const top = cards?.[cards.length - 1];
  return (
    <div class="pile">
      {top ? (
        <CardTile card={top} owner={owner} onTap={onTap} size="sm" />
      ) : (
        <div class={`tile tile-sm ${count ? `back ${side === "Corp" ? "corp" : "runner"}` : "empty"}`} />
      )}
      <span>
        {label} {count}
      </span>
    </div>
  );
}

function CorpArea({ view, side, mine, onTap, selectable, runServer }: { view: any; side: Side; mine: boolean; onTap: (c: any) => void; selectable: Set<unknown>; runServer?: string }) {
  const corp = view.corp ?? {};
  const servers = corp.servers ?? {};
  const owner = side === "corp";
  const tile = (c: any) => <CardTile card={c} owner={owner} onTap={onTap} selectable={selectable.has(c.cid)} />;
  return (
    <div class="area corp-area">
      <div class="row">
        <span class="label">Servers</span>
        <span class="label">サーバー</span>
      </div>
      <div class="servers">
        {serverOrder(servers).map((key) => {
          const s = servers[key] ?? { content: [], ices: [] };
          const ices = [...(s.ices ?? [])];
          const iceColumn = mine ? [...ices].reverse() : ices;
          return (
            <div class={`server ${runServer === key ? "running" : ""}`}>
              {mine ? (
                <>
                  <div class="ices">{iceColumn.map(tile)}</div>
                  <div class="content">{(s.content ?? []).map(tile)}</div>
                </>
              ) : (
                <>
                  <div class="content">{(s.content ?? []).map(tile)}</div>
                  <div class="ices">{iceColumn.map(tile)}</div>
                </>
              )}
              <span class="server-name">{serverName(key)}</span>
            </div>
          );
        })}
      </div>
      <div class="piles">
        {corp.identity && <CardTile card={corp.identity} owner={owner} onTap={onTap} size="sm" />}
        <Pile label="R&D" count={corp["deck-count"] ?? 0} onTap={onTap} owner={owner} side="Corp" />
        <Pile label="Arch" count={(corp.discard ?? []).length} cards={corp.discard} onTap={onTap} owner={owner} side="Corp" />
        {(corp.scored ?? []).length > 0 && (
          <div class="scored">
            {corp.scored.map((c: any) => (
              <CardTile card={c} owner={owner} onTap={onTap} size="sm" />
            ))}
          </div>
        )}
        {(corp.current ?? []).map((c: any) => (
          <CardTile card={c} owner={owner} onTap={onTap} size="sm" />
        ))}
      </div>
    </div>
  );
}

function RunnerArea({ view, side, onTap, selectable }: { view: any; side: Side; onTap: (c: any) => void; selectable: Set<unknown> }) {
  const runner = view.runner ?? {};
  const rig = runner.rig ?? {};
  const owner = side === "runner";
  const row = (label: string, cards: any[]) =>
    cards?.length ? (
      <div class="rig-row">
        <span class="label">{label}</span>
        <div class="rig-cards">
          {cards.map((c) => (
            <CardTile card={c} owner={owner} onTap={onTap} selectable={selectable.has(c.cid)} />
          ))}
        </div>
      </div>
    ) : null;
  const empty = !["program", "hardware", "resource", "facedown"].some((k) => rig[k]?.length);
  return (
    <div class="area runner-area">
      <div class="row">
        <span class="label">Rig</span>
        <span class="label">リグ</span>
      </div>
      {empty && <span class="hint">Nothing installed</span>}
      {row("Programs", rig.program)}
      {row("Hardware", rig.hardware)}
      {row("Resources", rig.resource)}
      {row("Facedown", rig.facedown)}
      <div class="piles">
        {runner.identity && <CardTile card={runner.identity} owner={owner} onTap={onTap} size="sm" />}
        <Pile label="Stack" count={runner["deck-count"] ?? 0} onTap={onTap} owner={owner} side="Runner" />
        <Pile label="Heap" count={(runner.discard ?? []).length} cards={runner.discard} onTap={onTap} owner={owner} side="Runner" />
        {(runner.scored ?? []).length > 0 && (
          <div class="scored">
            {runner.scored.map((c: any) => (
              <CardTile card={c} owner={owner} onTap={onTap} size="sm" />
            ))}
          </div>
        )}
        {(runner.current ?? []).map((c: any) => (
          <CardTile card={c} owner={owner} onTap={onTap} size="sm" />
        ))}
      </div>
    </div>
  );
}

function Log({ view, render, onSay, onClose }: { view: any; render: (m: unknown) => string; onSay: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const log: any[] = view.log ?? [];
  useEffect(() => end.current?.scrollIntoView(), [log.length]);
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel log-sheet" onClick={(e) => e.stopPropagation()}>
        <div class="row">
          <span class="label">Log</span>
          <button class="ghost" onClick={onClose} aria-label="Close log">
            ✕
          </button>
        </div>
        <div class="log">
          {log.map((e) => {
            const system = e.user === "__system__";
            const msg = iconize(render(e.text));
            return msg === "———" ? <hr /> : <p class={system ? "sys" : "chat"}>{system ? msg : `${e.user?.username ?? "?"}: ${msg}`}</p>;
          })}
          <div ref={end} />
        </div>
        <form
          class="chat"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onSay(text.trim());
            setText("");
          }}
        >
          <input value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} placeholder="message or /command" aria-label="Chat message" />
          <button class="primary">Send</button>
        </form>
      </div>
    </div>
  );
}

function feedText(view: any, side: Side, names: Record<Side, string>) {
  if (view.winner) return `${names[view.winner as Side] ?? view.winner} wins`;
  if (view.run) {
    const ice = currentIce(view);
    return `Run · ${serverName(view.run.server?.[0] ?? "")} · ${PHASE_LABELS[view.run.phase] ?? view.run.phase}${ice ? ` · ${ice.title ?? "unrezzed ice"}` : ""}`;
  }
  const active = view["active-player"] as Side;
  return `Turn ${view.turn ?? 0} · ${active === side ? "your move" : `${names[active] ?? active} to play`}`;
}

export function Board({ session, engine, db, side, view, onSwitchSide, onLeave }: Props) {
  const [selected, setSelected] = useState<any>(null);
  const [showLog, setShowLog] = useState(false);
  const [picking, setPicking] = useState(false);
  const [menu, setMenu] = useState(false);
  const render = (m: unknown) => engine.renderMessage(m);
  const send = (command: string, args?: unknown) => session.send(command, args, side);
  const disabled = session.pending;
  const me = view[side] ?? {};
  const opp = otherSide(side);
  const prompt = promptOf(view, side);
  const ptype = prompt?.["prompt-type"];
  const selectable = useMemo(() => new Set<unknown>(prompt?.selectable ?? []), [prompt]);
  const tap = (card: any) => {
    if (ptype === "select" && (selectable.has(card.cid) || card.selected)) send("select", { card: cardRef(card), eid: prompt.eid });
    else setSelected(card);
  };
  const current = selected ? (findCard(view, selected.cid) ?? selected) : null;
  const names = {
    [side]: me.user?.username ?? "You",
    [opp]: view[opp]?.user?.username ?? "Opponent",
  } as Record<Side, string>;

  const toasts: any[] = me.toast ?? [];
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => toasts.forEach((x) => send("toast", { id: x.id })), 3500);
    return () => clearTimeout(t);
  }, [toasts.map((t) => t.id).join()]);

  const log: any[] = view.log ?? [];
  const lastLog = log[log.length - 1];
  const runServer = view.run?.server?.[0];
  const ice = currentIce(view);
  const link = session.lobby.role === "local" ? null : session.lobby.status;

  let panel: preact.ComponentChildren;
  if (view.winner) {
    panel = (
      <section class="prompt">
        <span class={`big ${view.winner === side ? "yellow" : ""}`} style="font-size: 56px">
          {view.winner === side ? "VICTORY" : "DEFEAT"}
        </span>
        {view.reason && <span class="label">{view.reason}</span>}
        <Cta onClick={onLeave}>Back to home</Cta>
      </section>
    );
  } else if (prompt && ptype !== "run") {
    panel = <PromptPanel view={view} side={side} prompt={prompt} render={render} send={send} disabled={disabled} />;
  } else if (picking && side === "runner") {
    const list: string[] = me["runnable-list"] ?? [];
    panel = (
      <section class="prompt">
        <span class="label">Run on…</span>
        <div class="choices">
          {list.map((s) => (
            <button
              class="primary"
              disabled={disabled}
              onClick={() => {
                send("run", { server: s });
                setPicking(false);
              }}
            >
              {serverLabel(s)}
            </button>
          ))}
          <button class="ghost" onClick={() => setPicking(false)}>
            Cancel
          </button>
        </div>
      </section>
    );
  } else {
    const commands: Command[] = view.run || view.encounters ? runCommands(view, side) : basicCommands(view, side);
    const [first, ...rest] = commands;
    const lead = first?.kind === "primary" ? first : undefined;
    const others = lead ? rest : commands;
    panel = (
      <section class="actions">
        {(view.run || view.encounters) && (
          <p class="run-status">
            Run · {serverName(runServer ?? "")} · {PHASE_LABELS[view.run?.phase] ?? view.run?.phase}
            {ice ? ` · ${ice.title ?? "unrezzed ice"}` : ""}
          </p>
        )}
        <div class="buttons">
          {lead && (
            <Cta
              disabled={disabled || lead.enabled === false}
              onClick={() => {
                send(lead.command, lead.args);
                if (lead.then === "install-list") setPicking(true);
              }}
            >
              {iconize(lead.label)}
            </Cta>
          )}
          {others.map((c) => (
            <button
              class={c.kind === "danger" ? "danger" : c.kind === "primary" ? "primary" : ""}
              disabled={disabled || c.enabled === false}
              onClick={() => {
                send(c.command, c.args);
                if (c.then === "install-list") setPicking(true);
              }}
            >
              {iconize(c.label)}
            </button>
          ))}
          {commands.length === 0 && <span class="status">Waiting for {names[opp]}…</span>}
        </div>
      </section>
    );
  }

  const theirArea =
    opp === "corp" ? (
      <CorpArea view={view} side={side} mine={false} onTap={tap} selectable={selectable} runServer={runServer} />
    ) : (
      <RunnerArea view={view} side={side} onTap={tap} selectable={selectable} />
    );
  const myArea =
    side === "corp" ? (
      <CorpArea view={view} side={side} mine onTap={tap} selectable={selectable} runServer={runServer} />
    ) : (
      <RunnerArea view={view} side={side} onTap={tap} selectable={selectable} />
    );
  const hand: any[] = [...(me.hand ?? []), ...(me.discard ?? []).filter((c: any) => c["flashback-playable"])];

  return (
    <div class={`board side-${side} ${ptype === "select" ? "selecting" : ""}`}>
      <Ticker>
        {feedText(view, side, names)}
        {link && link !== "connected" && <span class="yellow"> · {link === "waiting" ? "opponent offline" : "reconnecting"}</span>}
      </Ticker>
      <header class="topbar">
        <LogoMark />
        <div style="flex: 1" />
        {onSwitchSide && (
          <button onClick={onSwitchSide} aria-label={`Switch to ${opp}`}>
            ⇄ {opp}
          </button>
        )}
        <button class="cyan" onClick={() => setShowLog(true)} aria-label={`Log, ${log.length} entries`}>
          Log {log.length}
        </button>
        <button onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>
          ≡
        </button>
      </header>
      {menu && (
        <nav class="menu panel">
          <button
            onClick={() => {
              send("indicate-action");
              setMenu(false);
            }}
          >
            Indicate action
          </button>
          <button
            class="danger"
            onClick={() => {
              if (confirm("Concede this game?")) session.concede(side);
              setMenu(false);
            }}
          >
            Concede
          </button>
          <button class="ghost" onClick={onLeave}>
            Leave game
          </button>
        </nav>
      )}
      <main class="playfield">
        <Opponent view={view} side={opp} name={names[opp]} />
        {theirArea}
        <div class="divider" />
        {myArea}
      </main>
      <footer class="dock">
        {toasts.map((t) => (
          <div class={`toast ${t.type}`} onClick={() => send("toast", { id: t.id })}>
            {iconize(render(t.msg))}
          </div>
        ))}
        <button class="last-log" onClick={() => setShowLog(true)}>
          {lastLog ? iconize(render(lastLog.text)).slice(0, 140) : "Log"}
        </button>
        {panel}
        <MeBar view={view} side={side} name={names[side]} />
        <div class="hand">
          {hand.map((c) => (
            <CardTile card={c} owner onTap={tap} selectable={selectable.has(c.cid)} />
          ))}
          {hand.length === 0 && <span class="hint">Empty hand</span>}
        </div>
      </footer>
      {current && <CardSheet card={current} view={view} side={side} db={db} send={send} disabled={disabled} onClose={() => setSelected(null)} />}
      {showLog && <Log view={view} render={render} onSay={(t) => session.say(t, side)} onClose={() => setShowLog(false)} />}
    </div>
  );
}
