import { useEffect, useMemo, useState } from "preact/hooks";
import type { CardDb, Side } from "../engine";
import { Picker, Ticker } from "../ui";
import { Icon } from "../icons";
import { useBackClose } from "../back";
import { type StoredDeck, defaultDeckId, savedDecks, setDefaultDeckId } from "../decks";
import { FORMAT_DESC, GAME_FORMATS, type GameFormat } from "../deckrules";
import { onSettings, setSetting, settings } from "../settings";
import { listHistory } from "../history";
import { CardImage, CardZoom } from "../game/CardImage";
import { DeckRow } from "./Decks";
import { EditField } from "./SettingsMenu";
import { type Head, headOf } from "./History";

const SIDE_NAME: Record<Side, string> = { corp: "Corp", runner: "Runner" };

function storedName() {
  try {
    return localStorage.getItem("nsg.name") ?? "Player";
  } catch {
    return "Player";
  }
}

const pct = (won: number, total: number) => (total ? `${Math.round((won / total) * 100)}%` : "—");

function stats(heads: Head[]) {
  const decided = heads.filter((h) => h.outcome !== "over").sort((a, b) => a.endedAt - b.endedAt);
  const won = decided.filter((h) => h.outcome === "won").length;
  const bySide = (side: Side) => {
    const g = decided.filter((h) => h.mySide === side);
    return { games: g.length, won: g.filter((h) => h.outcome === "won").length };
  };
  let streak = 0;
  let best = 0;
  let run = 0;
  for (const h of decided) {
    run = h.outcome === "won" ? run + 1 : 0;
    best = Math.max(best, run);
  }
  for (let i = decided.length - 1; i >= 0 && decided[i].outcome === "won"; i--) streak++;
  const ids = new Map<string, { code: string; title: string; games: number; won: number }>();
  for (const h of decided) {
    const id = h.identities[h.mySide];
    if (!id) continue;
    const e = ids.get(id.code) ?? { ...id, games: 0, won: 0 };
    e.games++;
    if (h.outcome === "won") e.won++;
    ids.set(id.code, e);
  }
  const ranked = [...ids.values()].sort((a, b) => b.games - a.games || b.won - a.won);
  const turns = heads.filter((h) => h.turn > 0);
  return {
    played: heads.length,
    decided: decided.length,
    won,
    lost: decided.length - won,
    corp: bySide("corp"),
    runner: bySide("runner"),
    streak,
    best,
    avgTurns: turns.length ? Math.round(turns.reduce((n, h) => n + h.turn, 0) / turns.length) : 0,
    identities: ranked.slice(0, 3),
  };
}

function DefaultDeck({ side, db, onOpen }: { side: Side; db: CardDb; onOpen: (id: string, side: Side) => void }) {
  const [id, setId] = useState(() => defaultDeckId(side));
  const [choosing, setChoosing] = useState(false);
  useBackClose(choosing, () => setChoosing(false));
  const mine = useMemo(() => savedDecks().filter((d) => d.side === side), [choosing]);
  const current = mine.find((d) => d.id === id);
  const pick = (d?: StoredDeck) => {
    setDefaultDeckId(side, d?.id);
    setId(d?.id);
    setChoosing(false);
  };
  return (
    <div class="profile-deck">
      <div class="profile-deck-head">
        <span class={`label who-${side}`}>{SIDE_NAME[side]}</span>
        {mine.length > 0 && (
          <button class="ghost profile-change" onClick={() => setChoosing(true)}>
            <Icon name="swap" /> Change
          </button>
        )}
      </div>
      {current ? (
        <ul class="deck-library">
          <DeckRow db={db} stored={current} onOpen={() => onOpen(current.id, side)} issuesOnly />
        </ul>
      ) : (
        <button class="match-deck-empty" onClick={() => setChoosing(true)} disabled={!mine.length}>
          {mine.length ? `Choose a default ${SIDE_NAME[side]} deck` : `No ${SIDE_NAME[side]} deck yet`}
        </button>
      )}
      {choosing && (
        <div class="sheet-backdrop" onClick={() => setChoosing(false)}>
          <div class="sheet panel deck-choose" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Default ${SIDE_NAME[side]} deck`}>
            <div class="row">
              <span class={`label who-${side}`}>Default {SIDE_NAME[side]} deck</span>
              <button class="ghost" onClick={() => setChoosing(false)} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            <ul class="deck-library">
              {mine.map((d) => (
                <DeckRow key={d.id} db={db} stored={d} selected={d.id === id} onOpen={() => pick(d)} issuesOnly />
              ))}
            </ul>
            {id && (
              <button class="ghost" onClick={() => pick(undefined)}>
                No default
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Profile({ db, onClose, onOpenDeck }: { db: CardDb; onClose: () => void; onOpenDeck: (id: string, side: Side) => void }) {
  useBackClose(true, onClose);
  const [, setTick] = useState(0);
  useEffect(() => onSettings(() => setTick((t) => t + 1)), []);
  const [name, setName] = useState(storedName);
  const [heads, setHeads] = useState<Head[] | null>(null);
  useEffect(() => {
    listHistory()
      .then((games) => setHeads(games.map((g) => headOf(g, db))))
      .catch(() => setHeads([]));
  }, []);
  const s = useMemo(() => (heads ? stats(heads) : null), [heads]);
  const [zoom, setZoom] = useState<{ code: string; title: string } | null>(null);
  useBackClose(!!zoom, () => setZoom(null));
  return (
    <>
      <Ticker>
        Profile <span class="cyan">{name}</span>
      </Ticker>
      <div class="screen profile">
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back">
            <Icon name="arrow-left" />
          </button>
          <h1>PROFILE</h1>
        </header>

        <section class="panel section profile-id">
          <EditField
            title="Handle"
            label="handle"
            saved={name}
            fallback="Player"
            maxLength={24}
            onSave={(v) => {
              try {
                localStorage.setItem("nsg.name", v);
              } catch {}
              setName(v);
            }}
          />
          <div class="field-box">
            <span class="label">Default format</span>
            <Picker title="Default format" value={settings.format} onChange={(f: GameFormat) => setSetting("format", f)} options={GAME_FORMATS.map((f) => ({ key: f.key as GameFormat, label: f.label, hint: FORMAT_DESC[f.key as GameFormat] }))} />
          </div>
        </section>

        <section class="panel section">
          <span class="label">Default decks</span>
          <DefaultDeck side="corp" db={db} onOpen={onOpenDeck} />
          <DefaultDeck side="runner" db={db} onOpen={onOpenDeck} />
        </section>

        <section class="panel cyan section profile-stats">
          <span class="label cyan">Stats</span>
          {!s ? (
            <p class="hint">Loading…</p>
          ) : !s.played ? (
            <p class="hint">Finish a game and your record shows up here.</p>
          ) : (
            <>
              <div class="profile-hero">
                <div class="profile-rate">
                  <strong>{pct(s.won, s.decided)}</strong>
                  <span class="label">Win rate</span>
                </div>
                <div class="profile-record">
                  <span>
                    <b class="cyan">{s.won}</b> won
                  </span>
                  <span>
                    <b class="red">{s.lost}</b> lost
                  </span>
                  <span>
                    <b>{s.played}</b> played
                  </span>
                </div>
              </div>
              <div class="profile-tiles">
                <div class="profile-tile who-corp">
                  <strong>{pct(s.corp.won, s.corp.games)}</strong>
                  <span>
                    As Corp · {s.corp.won}/{s.corp.games}
                  </span>
                </div>
                <div class="profile-tile who-runner">
                  <strong>{pct(s.runner.won, s.runner.games)}</strong>
                  <span>
                    As Runner · {s.runner.won}/{s.runner.games}
                  </span>
                </div>
                <div class="profile-tile">
                  <strong>{s.streak}</strong>
                  <span>Win streak · best {s.best}</span>
                </div>
                <div class="profile-tile">
                  <strong>{s.avgTurns || "—"}</strong>
                  <span>Turns per game</span>
                </div>
              </div>
              {s.identities.length > 0 && (
                <>
                  <span class="label">Most played</span>
                  <ul class="profile-ids">
                    {s.identities.map((id) => (
                      <li
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const deck = savedDecks()
                            .filter((d) => db.byTitle.get(d.identity)?.code === id.code)
                            .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
                          if (deck) onOpenDeck(deck.id, deck.side);
                          else setZoom(id);
                        }}
                      >
                        <CardImage code={id.code} alt={id.title} size="small" width="44px" />
                        <span class="profile-id-name">{id.title}</span>
                        <span class="profile-id-rate">
                          {pct(id.won, id.games)}
                          <small>
                            {id.won}/{id.games}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      </div>
      {zoom && <CardZoom items={[{ code: zoom.code, alt: zoom.title }]} start={0} onClose={() => setZoom(null)} />}
    </>
  );
}
