import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { CardDb, EngineApi, Side } from "../engine";
import type { Session } from "../session";
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

function Stats({ view, side, name, me }: { view: any; side: Side; name: string; me: boolean }) {
  const p = view[side] ?? {};
  const items: [string, unknown][] = [
    ["¢", p.credit],
    ["◷", p.click],
    ["✋", p["hand-count"] ?? p.hand?.length],
    ["★", `${p["agenda-point"] ?? 0}/${p["agenda-point-req"] ?? 7}`],
  ];
  if (side === "runner") {
    if (p.tag?.total) items.push(["🏷", p.tag.total]);
    if (p.memory) items.push(["MU", `${p.memory.available}/${(p.memory.available ?? 0) + (p.memory.used ?? 0)}`]);
    if (p.link) items.push(["⛓", p.link]);
    if (p["brain-damage"]) items.push(["🧠", p["brain-damage"]]);
  } else {
    const bp = (p["bad-publicity"]?.base ?? 0) + (p["bad-publicity"]?.additional ?? 0);
    if (bp) items.push(["☠", bp]);
  }
  const active = view["active-player"] === side;
  return (
    <div class={`stats ${me ? "me" : "them"} ${active ? "active" : ""}`}>
      <span class="who">
        {active ? "▶ " : ""}
        {name}
      </span>
      {items.map(([k, v]) => (
        <span class="stat">
          <b>{k}</b>
          {String(v ?? 0)}
        </span>
      ))}
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
      <span class="pile-label">
        {label} · {count}
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
    <div class={`area corp-area ${mine ? "mine" : "theirs"}`}>
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
        <Pile label="Archives" count={(corp.discard ?? []).length} cards={corp.discard} onTap={onTap} owner={owner} side="Corp" />
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

function RunnerArea({ view, side, mine, onTap, selectable }: { view: any; side: Side; mine: boolean; onTap: (c: any) => void; selectable: Set<unknown> }) {
  const runner = view.runner ?? {};
  const rig = runner.rig ?? {};
  const owner = side === "runner";
  const row = (label: string, cards: any[]) =>
    cards?.length ? (
      <div class="rig-row">
        <span class="rig-label">{label}</span>
        <div class="rig-cards">
          {cards.map((c) => (
            <CardTile card={c} owner={owner} onTap={onTap} selectable={selectable.has(c.cid)} />
          ))}
        </div>
      </div>
    ) : null;
  return (
    <div class={`area runner-area ${mine ? "mine" : "theirs"}`}>
      {row("Programmes", rig.program)}
      {row("Matériel", rig.hardware)}
      {row("Ressources", rig.resource)}
      {row("Face cachée", rig.facedown)}
      <div class="piles">
        {runner.identity && <CardTile card={runner.identity} owner={owner} onTap={onTap} size="sm" />}
        <Pile label="Pile" count={runner["deck-count"] ?? 0} onTap={onTap} owner={owner} side="Runner" />
        <Pile label="Tas" count={(runner.discard ?? []).length} cards={runner.discard} onTap={onTap} owner={owner} side="Runner" />
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
      <div class="sheet log-sheet" onClick={(e) => e.stopPropagation()}>
        <div class="log">
          {log.map((e) => {
            const system = e.user === "__system__";
            const msg = iconize(render(e.text));
            return msg === "———" ? <hr /> : <p class={system ? "sys" : "chat"}>{system ? msg : `${e.user?.username ?? "?"} : ${msg}`}</p>;
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
          <input value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} placeholder="Message ou /commande" />
          <button class="primary">Envoyer</button>
        </form>
      </div>
    </div>
  );
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
    [side]: me.user?.username ?? "Moi",
    [opp]: view[opp]?.user?.username ?? "Adversaire",
  } as Record<Side, string>;

  const toasts: any[] = me.toast ?? [];
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => toasts.forEach((x) => send("toast", { id: x.id })), 3500);
    return () => clearTimeout(t);
  }, [toasts.map((t) => t.id).join()]);

  const lastLog = (view.log ?? []).slice(-1)[0];
  const runServer = view.run?.server?.[0];
  const ice = currentIce(view);

  let panel: preact.ComponentChildren;
  if (view.winner) {
    panel = (
      <section class="prompt">
        <p class="prompt-msg">
          {view.winner === side ? "🏆 Victoire !" : "Défaite."} {view.reason ? `(${view.reason})` : ""}
        </p>
        <button class="primary" onClick={onLeave}>Retour à l'accueil</button>
      </section>
    );
  } else if (prompt && ptype !== "run") {
    panel = <PromptPanel view={view} side={side} prompt={prompt} render={render} send={send} disabled={disabled} />;
  } else if (picking && side === "runner") {
    const list: string[] = me["runnable-list"] ?? [];
    panel = (
      <section class="prompt">
        <p class="prompt-msg">Lancer un run sur…</p>
        <div class="choices">
          {list.map((s) => (
            <button class="primary" disabled={disabled} onClick={() => { send("run", { server: s }); setPicking(false); }}>
              {serverLabel(s)}
            </button>
          ))}
          <button class="ghost" onClick={() => setPicking(false)}>Annuler</button>
        </div>
      </section>
    );
  } else {
    const commands: Command[] = view.run || view.encounters ? runCommands(view, side) : basicCommands(view, side);
    panel = (
      <section class="actions">
        {(view.run || view.encounters) && (
          <p class="run-status">
            Run sur {serverName(runServer ?? "")} — {PHASE_LABELS[view.run?.phase] ?? view.run?.phase}
            {ice ? ` — ${ice.title ?? "glace inconnue"}` : ""}
          </p>
        )}
        <div class="buttons">
          {commands.map((c) => (
            <button
              class={c.kind ?? ""}
              disabled={disabled || c.enabled === false}
              onClick={() => {
                send(c.command, c.args);
                if (c.then === "install-list") setPicking(true);
              }}
            >
              {iconize(c.label)}
            </button>
          ))}
          {commands.length === 0 && <span class="hint">En attente de l'adversaire…</span>}
        </div>
      </section>
    );
  }

  const theirArea =
    opp === "corp" ? (
      <CorpArea view={view} side={side} mine={false} onTap={tap} selectable={selectable} runServer={runServer} />
    ) : (
      <RunnerArea view={view} side={side} mine={false} onTap={tap} selectable={selectable} />
    );
  const myArea =
    side === "corp" ? (
      <CorpArea view={view} side={side} mine onTap={tap} selectable={selectable} runServer={runServer} />
    ) : (
      <RunnerArea view={view} side={side} mine onTap={tap} selectable={selectable} />
    );
  const hand: any[] = [...(me.hand ?? []), ...(me.discard ?? []).filter((c: any) => c["flashback-playable"])];

  return (
    <div class={`board side-${side} ${ptype === "select" ? "selecting" : ""}`}>
      <header class="topbar">
        <button class="icon" onClick={() => setMenu(!menu)} aria-label="Menu">☰</button>
        <Stats view={view} side={opp} name={names[opp]} me={false} />
        {onSwitchSide && (
          <button class="icon" onClick={onSwitchSide} aria-label="Changer de camp">
            ⇄
          </button>
        )}
      </header>
      {menu && (
        <nav class="menu">
          {onSwitchSide && <button onClick={() => { onSwitchSide(); setMenu(false); }}>Passer à {opp === "corp" ? "la Corp" : "le Runner"}</button>}
          <button onClick={() => { send("indicate-action"); setMenu(false); }}>Signaler une action</button>
          <button class="danger" onClick={() => { if (confirm("Abandonner la partie ?")) session.concede(side); setMenu(false); }}>Abandonner</button>
          <button onClick={onLeave}>Quitter</button>
        </nav>
      )}
      <main class="playfield">
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
          📜 {lastLog ? iconize(render(lastLog.text)).slice(0, 120) : "Journal"}
        </button>
        {panel}
        <Stats view={view} side={side} name={names[side]} me />
        <div class="hand">
          {hand.map((c) => (
            <CardTile card={c} owner onTap={tap} selectable={selectable.has(c.cid)} />
          ))}
          {hand.length === 0 && <span class="hint">Main vide</span>}
        </div>
      </footer>
      {current && (
        <CardSheet
          card={current}
          view={view}
          side={side}
          db={db}
          send={send}
          disabled={disabled}
          onClose={() => setSelected(null)}
        />
      )}
      {showLog && <Log view={view} render={render} onSay={(t) => session.say(t, side)} onClose={() => setShowLog(false)} />}
    </div>
  );
}
