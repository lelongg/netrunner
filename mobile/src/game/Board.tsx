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

type ZoneKey = "discard" | "play-area" | "rfg" | "set-aside";
interface ZoneRef {
  owner: Side;
  key: ZoneKey;
}

const ZONE_LABELS: Record<Side, Record<ZoneKey, string>> = {
  corp: { discard: "Archives", "play-area": "Play area", rfg: "Removed", "set-aside": "Set aside" },
  runner: { discard: "Heap", "play-area": "Play area", rfg: "Removed", "set-aside": "Set aside" },
};

function Pile({ label, count, cards, owner, side, selectable, onOpen }: { label: string; count: number; cards?: any[]; owner: boolean; side: Side; selectable: Set<unknown>; onOpen?: () => void }) {
  const top = cards?.[cards.length - 1];
  const target = (cards ?? []).some((c) => selectable.has(c.cid));
  const back = `back ${side === "corp" ? "corp" : "runner"}`;
  const face = top ? (
    <CardTile card={top} owner={owner} size="sm" onTap={onOpen} selectable={target} />
  ) : (
    <div class={`tile tile-sm ${count ? back : "empty"}`} />
  );
  return (
    <div class="pile">
      {face}
      <span class={target ? "yellow" : ""}>
        {label} {count}
      </span>
    </div>
  );
}

function Piles({ view, zoneOwner, viewer, onTap, onZone, selectable }: { view: any; zoneOwner: Side; viewer: Side; onTap: (c: any) => void; onZone: (z: ZoneRef) => void; selectable: Set<unknown> }) {
  const p = view[zoneOwner] ?? {};
  const owner = viewer === zoneOwner;
  const labels = ZONE_LABELS[zoneOwner];
  const zone = (key: ZoneKey) => {
    const cards: any[] = p[key] ?? [];
    if (key !== "discard" && !cards.length) return null;
    return <Pile label={labels[key]} count={cards.length} cards={cards} owner={owner} side={zoneOwner} selectable={selectable} onOpen={cards.length ? () => onZone({ owner: zoneOwner, key }) : undefined} />;
  };
  return (
    <div class="piles">
      {p.identity && <CardTile card={p.identity} owner={owner} onTap={onTap} size="sm" selectable={selectable.has(p.identity.cid)} />}
      <Pile label={zoneOwner === "corp" ? "R&D" : "Stack"} count={p["deck-count"] ?? 0} owner={owner} side={zoneOwner} selectable={selectable} />
      {zone("discard")}
      {zone("play-area")}
      {zone("rfg")}
      {zone("set-aside")}
      {(p.scored ?? []).length > 0 && (
        <div class="scored">
          {p.scored.map((c: any) => (
            <CardTile card={c} owner={owner} onTap={onTap} size="sm" selectable={selectable.has(c.cid)} />
          ))}
        </div>
      )}
      {(p.current ?? []).map((c: any) => (
        <CardTile card={c} owner={owner} onTap={onTap} size="sm" selectable={selectable.has(c.cid)} />
      ))}
    </div>
  );
}

function ZoneSheet({ zone, view, viewer, selectable, onTap, onClose }: { zone: ZoneRef; view: any; viewer: Side; selectable: Set<unknown>; onTap: (c: any) => void; onClose: () => void }) {
  const cards: any[] = view[zone.owner]?.[zone.key] ?? [];
  const mine = viewer === zone.owner;
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel zone-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={ZONE_LABELS[zone.owner][zone.key]}>
        <div class="row">
          <span class="label">
            {mine ? "Your" : "Their"} {ZONE_LABELS[zone.owner][zone.key]} · {cards.length}
          </span>
          <button class="ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {cards.length === 0 && <span class="status">Empty</span>}
        <div class="zone-grid">
          {[...cards].reverse().map((c) => (
            <CardTile card={c} owner={mine} onTap={onTap} selectable={selectable.has(c.cid)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CorpArea({ view, side, mine, onTap, onZone, selectable, runServer }: { view: any; side: Side; mine: boolean; onTap: (c: any) => void; onZone: (z: ZoneRef) => void; selectable: Set<unknown>; runServer?: string }) {
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
      <Piles view={view} zoneOwner="corp" viewer={side} onTap={onTap} onZone={onZone} selectable={selectable} />
    </div>
  );
}

function RunnerArea({ view, side, onTap, onZone, selectable }: { view: any; side: Side; onTap: (c: any) => void; onZone: (z: ZoneRef) => void; selectable: Set<unknown> }) {
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
      <Piles view={view} zoneOwner="runner" viewer={side} onTap={onTap} onZone={onZone} selectable={selectable} />
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

const TOAST_MS = 4000;
const ACTION_ERROR = "action-error";
const TOAST_MAX = 3;

function Toasts({ toasts, render, dismiss }: { toasts: any[]; render: (m: unknown) => string; dismiss: (id: string) => void }) {
  const timers = useRef(new Map<string, number>());
  useEffect(() => {
    const live = new Set(toasts.map((t) => t.id));
    for (const t of toasts) {
      if (!timers.current.has(t.id)) timers.current.set(t.id, window.setTimeout(() => dismiss(t.id), TOAST_MS));
    }
    for (const [id, handle] of timers.current) {
      if (!live.has(id)) {
        clearTimeout(handle);
        timers.current.delete(id);
      }
    }
  });
  useEffect(() => () => timers.current.forEach((handle) => clearTimeout(handle)), []);
  if (!toasts.length) return null;
  const groups = new Map<string, { text: string; type: string; ids: string[] }>();
  for (const t of toasts) {
    const text = iconize(render(t.msg));
    const group = groups.get(text) ?? { text, type: String(t.type), ids: [] as string[] };
    group.ids.push(t.id);
    groups.set(text, group);
  }
  const all = [...groups.values()];
  const hidden = all.length - TOAST_MAX;
  return (
    <div class="toasts" aria-live="polite">
      {all.slice(-TOAST_MAX).map((g) => (
        <button class={`toast ${g.type}`} onClick={() => g.ids.forEach(dismiss)}>
          {g.text}
          {g.ids.length > 1 && <span class="toast-count"> ×{g.ids.length}</span>}
        </button>
      ))}
      {hidden > 0 && <span class="label">+{hidden} more</span>}
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
  const [zone, setZone] = useState<ZoneRef | null>(null);
  const autoZone = useRef(false);
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
  const current = selected ? findCard(view, selected.cid) : null;
  const promptId = prompt?.eid?.eid;
  const closePrompt = () => session.say("/close-prompt", side);

  useEffect(() => setPicking(false), [!!view.run, promptId, view["active-player"], side]);

  useEffect(() => {
    const wanted: Side | null = prompt?.["show-discard"] ? side : prompt?.["show-opponent-discard"] ? opp : null;
    if (wanted) {
      setZone({ owner: wanted, key: "discard" });
      autoZone.current = true;
    } else if (autoZone.current) {
      setZone(null);
      autoZone.current = false;
    }
  }, [promptId, side]);
  const names = {
    [side]: me.user?.username ?? "You",
    [opp]: view[opp]?.user?.username ?? "Opponent",
  } as Record<Side, string>;

  const toasts: any[] = me.toast ?? [];

  const log: any[] = view.log ?? [];
  const lastLog = [...log].reverse().find((e) => !/^\s*\[hr\]\s*$/i.test(String(e.text?.["raw-text"] ?? e.text ?? "")));
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
    panel = <PromptPanel key={promptId} view={view} side={side} prompt={prompt} render={render} send={send} closePrompt={closePrompt} disabled={disabled} />;
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
      <CorpArea view={view} side={side} mine={false} onTap={tap} onZone={setZone} selectable={selectable} runServer={runServer} />
    ) : (
      <RunnerArea view={view} side={side} onTap={tap} onZone={setZone} selectable={selectable} />
    );
  const myArea =
    side === "corp" ? (
      <CorpArea view={view} side={side} mine onTap={tap} onZone={setZone} selectable={selectable} runServer={runServer} />
    ) : (
      <RunnerArea view={view} side={side} onTap={tap} onZone={setZone} selectable={selectable} />
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
          {prompt && ptype !== "run" && (
            <button
              onClick={() => {
                if (confirm("Close the current prompt? Use this only if the game is stuck.")) closePrompt();
                setMenu(false);
              }}
            >
              Close stuck prompt
            </button>
          )}
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
      <Toasts
        toasts={session.actionError ? [...toasts, { id: ACTION_ERROR, type: "error", msg: session.actionError }] : toasts}
        render={render}
        dismiss={(id) => (id === ACTION_ERROR ? session.clearActionError() : send("toast", { id }))}
      />
      <main class="playfield">
        <Opponent view={view} side={opp} name={names[opp]} />
        {theirArea}
        <div class="divider" />
        {myArea}
      </main>
      <footer class="dock">
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
      {zone && (
        <ZoneSheet
          zone={zone}
          view={view}
          viewer={side}
          selectable={selectable}
          onTap={tap}
          onClose={() => {
            setZone(null);
            autoZone.current = false;
          }}
        />
      )}
      {current && <CardSheet card={current} view={view} side={side} db={db} send={send} disabled={disabled} onClose={() => setSelected(null)} />}
      {showLog && <Log view={view} render={render} onSay={(t) => session.say(t, side)} onClose={() => setShowLog(false)} />}
    </div>
  );
}
