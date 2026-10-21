import type { ComponentChildren } from "preact";
import { Ticker } from "../ui";
import { Icon, type IconName } from "../icons";
import { saveId } from "../session";
import CursorGrid from "../game/CursorGrid";
import { motionOff } from "../settings";
import { GameList, JoinCode, type Props, ago, describe, startGame } from "./Home";

function EngineTicker({ ready, error }: Pick<Props, "ready" | "error">) {
  return (
    <Ticker>
      Engine <span class={ready ? "cyan" : "yellow"}>{ready ? "ready" : error ? "offline" : "loading"}</span>
    </Ticker>
  );
}

export function HomeTerminal(props: Props) {
  const { ready, error, initialJoin, saves, onResume, onHistory, onFind, seeking, onGuide, onCredits, onDecks } = props;
  const go = startGame(props.onStart);
  const items: [string, string, () => void][] = [
    ["jack-in", "play online", onFind],
    ["solo", "versus the bot", () => go("local", undefined, true)],
    ["hotseat", "two players, one device", () => go("local")],
    ["decks", "build and import", onDecks],
    ["history", "replays and stats", () => onHistory()],
    ["manual", "how to play", onGuide],
  ];
  return (
    <>
      <EngineTicker ready={ready} error={error} />
      <div class="screen home-term">
        <pre class="term-boot" aria-hidden="true">
          <span>POCKET RIG // NETRUNNER CLIENT</span>
          <span>{"> engine ......... "}<b class={ready ? "ok" : "warn"}>{ready ? "READY" : error ? "OFFLINE" : "LOADING"}</b></span>
          <span>{"> rig ............ "}<b class="ok">ONLINE</b></span>
        </pre>
        <h1 class="term-logo">
          pocket_rig<span class="term-cursor">█</span>
        </h1>
        {error && <p class="error">{error}</p>}
        {saves.length > 0 && (
          <section class="term-block">
            <span class="term-head">// open sessions</span>
            {saves.map((save) => {
              const { title, detail, status } = describe(save);
              return (
                <button class="term-line" disabled={!ready} onClick={() => (save.summary?.winner ? onHistory(saveId(save)) : onResume(save))}>
                  <span class="term-prompt">&gt;</span>
                  <span class="term-cmd">resume</span>
                  <span class="term-arg">{title.toLowerCase()}</span>
                  <span class="term-dim">{detail}</span>
                  {status && <b class={status === "Your move" ? "warn" : "ok"}>{status.toUpperCase()}</b>}
                </button>
              );
            })}
          </section>
        )}
        {seeking && (
          <button class="term-line term-seek" onClick={onFind}>
            <span class="term-prompt">&gt;</span>
            <span class="term-cmd">searching for an opponent</span>
            <span class="term-dots" aria-hidden="true" />
          </button>
        )}
        <section class="term-block">
          <span class="term-head">// commands</span>
          {items.map(([cmd, hint, run], i) => (
            <button class={`term-line ${i === 0 ? "term-main" : ""}`} disabled={!ready} onClick={run}>
              <span class="term-key">[{i + 1}]</span>
              <span class="term-cmd">{cmd}</span>
              <span class="term-dim">{hint}</span>
            </button>
          ))}
        </section>
        <section class="term-block">
          <span class="term-head">// connect &lt;code&gt;</span>
          <JoinCode ready={ready} initial={initialJoin} onJoin={(c) => go("guest", c)} />
        </section>
        <button class="term-credits" onClick={onCredits}>
          credits
        </button>
      </div>
    </>
  );
}

function Server({ name, label, ice, icon, onClick, disabled, hot }: { name: string; label: string; ice: number; icon: IconName; onClick: () => void; disabled?: boolean; hot?: boolean }) {
  return (
    <button class={`srv ${hot ? "hot" : ""}`} disabled={disabled} onClick={onClick}>
      <span class="srv-ice" aria-hidden="true">
        {Array.from({ length: ice }, (_, i) => (
          <i style={{ animationDelay: `${i * 0.35}s` }} />
        ))}
      </span>
      <span class="srv-root">
        <Icon name={icon} />
      </span>
      <span class="srv-name">{name}</span>
      <span class="srv-label">{label}</span>
    </button>
  );
}

export function HomeServers(props: Props) {
  const { ready, error, initialJoin, saves, onResume, onDiscard, onHistory, onFind, seeking, onGuide, onCredits, onDecks } = props;
  const go = startGame(props.onStart);
  return (
    <>
      <EngineTicker ready={ready} error={error} />
      <div class="screen home-servers">
        <header class="srv-hero">
          <span class="label">Choose a server to run</span>
          <h1 class="home-title">
            <span class="big">POCKET</span>
            <span class="big outline">RIG</span>
          </h1>
        </header>
        {error && <p class="error">{error}</p>}
        {saves.length > 0 && (
          <section class="srv-runs">
            <span class="label cyan">Runs in progress</span>
            <GameList saves={saves} ready={ready} onResume={onResume} onDiscard={onDiscard} onHistory={onHistory} />
          </section>
        )}
        <div class="srv-grid">
          <Server name="HQ" label={seeking ? "Searching…" : "Play online"} ice={3} icon="eye" onClick={onFind} disabled={!ready} hot />
          <Server name="R&D" label="Solo vs bot" ice={2} icon="dice" onClick={() => go("local", undefined, true)} disabled={!ready} />
          <Server name="Remote" label="Local game" ice={1} icon="swap" onClick={() => go("local")} disabled={!ready} />
          <Server name="Archives" label="History" ice={1} icon="history" onClick={() => onHistory()} disabled={!ready} />
        </div>
        <div class="srv-run-code">
          <span class="label">Run on a game code</span>
          <JoinCode ready={ready} initial={initialJoin} onJoin={(c) => go("guest", c)} />
        </div>
        <nav class="srv-foot">
          <button onClick={onDecks} disabled={!ready}>
            <Icon name="deck" /> Grip · Decks
          </button>
          <button onClick={onGuide} disabled={!ready}>
            <Icon name="book" /> Manual
          </button>
          <button onClick={onCredits}>Credits</button>
        </nav>
      </div>
    </>
  );
}

export function HomeJack(props: Props) {
  const { ready, error, initialJoin, saves, onResume, onHistory, onFind, seeking, onGuide, onCredits, onDecks } = props;
  const go = startGame(props.onStart);
  const still = motionOff();
  return (
    <>
      <EngineTicker ready={ready} error={error} />
      <div class="screen home-jack">
        <div class="jack-bg" aria-hidden="true">
          <CursorGrid className="jack-grid" cellSize={30} color="#3aa3b5" gridColor="#2b8a9a" radius={120} holdTime={200} fadeDuration={1400} maxOpacity={0.7} fillOpacity={0} gridOpacity={0.08} spotlight={0.35} ambient={still ? 0 : 0.8} fps={30} tempo={seeking ? 2 : 1} clickPulse={!still} intro={!still} edgeFade={0.1} />
        </div>
        <h1 class="jack-title">
          <span class="big">POCKET</span>
          <span class="big outline">RIG</span>
        </h1>
        {error && <p class="error">{error}</p>}
        <button class={`jack-core ${seeking ? "seeking" : ""}`} disabled={!ready} onClick={onFind} aria-label={seeking ? "Searching for an opponent" : "Play online"}>
          <i class="jack-ring r1" />
          <i class="jack-ring r2" />
          <i class="jack-ring r3" />
          <span class="jack-label">
            <b>{seeking ? "Searching" : "Jack in"}</b>
            <small>{seeking ? "for an opponent…" : "Play online"}</small>
          </span>
        </button>
        <div class="jack-chips">
          <button disabled={!ready} onClick={() => go("local", undefined, true)}>
            <Icon name="dice" /> Solo
          </button>
          <button disabled={!ready} onClick={() => go("local")}>
            <Icon name="swap" /> Local
          </button>
        </div>
        <JoinCode ready={ready} initial={initialJoin} onJoin={(c) => go("guest", c)} />
        {saves.length > 0 && (
          <div class="jack-games">
            {saves.map((save) => {
              const { title, detail, status } = describe(save);
              return (
                <button class="jack-game" disabled={!ready} onClick={() => (save.summary?.winner ? onHistory(saveId(save)) : onResume(save))}>
                  {status && <span class={`jack-status ${status === "Your move" ? "yellow" : "cyan"}`}>{status}</span>}
                  <strong>{title}</strong>
                  <span>{detail}</span>
                  <small>{save.v === 2 ? save.code : ago(save.savedAt)}</small>
                </button>
              );
            })}
          </div>
        )}
        <nav class="jack-dock">
          <button onClick={onDecks} disabled={!ready} aria-label="Decks">
            <Icon name="deck" />
            <span>Decks</span>
          </button>
          <button onClick={() => onHistory()} disabled={!ready} aria-label="History">
            <Icon name="history" />
            <span>History</span>
          </button>
          <button onClick={onGuide} disabled={!ready} aria-label="How to play">
            <Icon name="book" />
            <span>Guide</span>
          </button>
          <button onClick={onCredits} aria-label="Credits">
            <Icon name="sound" />
            <span>Credits</span>
          </button>
        </nav>
      </div>
    </>
  );
}

function HandCard({ cost, title, type, text, icon, tone, onClick, disabled, style }: { cost: string; title: string; type: string; text: ComponentChildren; icon: IconName; tone: string; onClick: () => void; disabled?: boolean; style?: Record<string, string> }) {
  return (
    <button class={`hcard tone-${tone}`} disabled={disabled} onClick={onClick} style={style}>
      <span class="hcard-cost">{cost}</span>
      <span class="hcard-title">{title}</span>
      <span class="hcard-art">
        <Icon name={icon} />
      </span>
      <span class="hcard-type">{type}</span>
      <span class="hcard-text">{text}</span>
    </button>
  );
}

export function HomeHand(props: Props) {
  const { ready, error, initialJoin, saves, onResume, onHistory, onFind, seeking, onGuide, onCredits, onDecks } = props;
  const go = startGame(props.onStart);
  const cards = [
    { cost: "1", title: "Solo vs Bot", type: "Event · Training", text: "A game against the rig's AI.", icon: "dice" as IconName, tone: "cyan", onClick: () => go("local", undefined, true) },
    { cost: "1", title: "Local Game", type: "Event · Hot seat", text: "Two players, one device.", icon: "swap" as IconName, tone: "red", onClick: () => go("local") },
    { cost: "0", title: seeking ? "Searching…" : "Play Online", type: "Event · Run", text: "Find an opponent or invite a friend.", icon: "eye" as IconName, tone: "yellow", onClick: onFind },
    { cost: "2", title: "Decks", type: "Resource · Workshop", text: "Build, import, tune.", icon: "deck" as IconName, tone: "green", onClick: onDecks },
    { cost: "1", title: "History", type: "Resource · Archive", text: "Replays and stats.", icon: "history" as IconName, tone: "purple", onClick: () => onHistory() },  ];
  const mid = (cards.length - 1) / 2;
  return (
    <>
      <EngineTicker ready={ready} error={error} />
      <div class="screen home-hand">
        <header class="hand-id">
          <span class="hand-id-faction">Identity</span>
          <h1 class="home-title">
            <span class="big">POCKET</span>
            <span class="big outline">RIG</span>
          </h1>
          <span class="hand-id-sub">Netrunner in your pocket · 45 cards · 15 influence</span>
        </header>
        {error && <p class="error">{error}</p>}
        {saves.length > 0 && (
          <section class="hand-installed">
            <span class="label">Installed</span>
            <div class="hand-installed-row">
              {saves.map((save) => {
                const { title, detail, status } = describe(save);
                return (
                  <button class="hand-inst" disabled={!ready} onClick={() => (save.summary?.winner ? onHistory(saveId(save)) : onResume(save))}>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                    {status && <b class={status === "Your move" ? "yellow" : "cyan"}>{status}</b>}
                  </button>
                );
              })}
            </div>
          </section>
        )}
        <div class="hand-join">
          <span class="label">Join with a code</span>
          <JoinCode ready={ready} initial={initialJoin} onJoin={(c) => go("guest", c)} />
        </div>
        <div class="hand-fan">
          {cards.map((c, i) => (
            <HandCard {...c} disabled={!ready} style={{ "--r": `${(i - mid) * 4}deg`, "--y": `${Math.abs(i - mid) * 8}px`, "--i": String(i), zIndex: String(10 - Math.abs(i - mid) * 2) }} />
          ))}
        </div>
        <nav class="hand-foot">
          <button onClick={onGuide}>How to play</button>
          <button onClick={onCredits}>Credits</button>
        </nav>
      </div>
    </>
  );
}
