import { useEffect, useMemo, useState } from "preact/hooks";
import type { CardDb, Side } from "../engine";
import { Picker, Ticker } from "../ui";
import { Icon } from "../icons";
import { useBackClose } from "../back";
import { type StoredDeck, type WireDeck, defaultDeckId, fromWire, savedDecks, setDefaultDeckId, toWire } from "../decks";
import { FORMAT_DESC, GAME_FORMATS, type GameFormat } from "../deckrules";
import { onSettings, setSetting, settings } from "../settings";
import { listHistory } from "../history";
import { DeckRow, DeckView } from "./Decks";
import { EditField } from "./SettingsMenu";
import { type Head, headOf } from "./History";
import { t } from "../i18n";

const SIDE_NAME: Record<Side, string> = { corp: "Corp", runner: "Runner" };

function storedName() {
  try {
    return localStorage.getItem("nsg.name") ?? t("Player");
  } catch {
    return t("Player");
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
  const decks = new Map<string, { wire: WireDeck; games: number; won: number }>();
  for (const h of decided) {
    const d = h.script?.setup?.[h.mySide]?.deck;
    if (!d?.identity) continue;
    const name = h.script?.deckNames?.[h.mySide] ?? d.identity.title;
    const key = `${d.identity.code}:${name}`;
    const e = decks.get(key) ?? { wire: toWire({ name, identity: d.identity, cards: d.cards ?? [] }), games: 0, won: 0 };
    e.games++;
    if (h.outcome === "won") e.won++;
    decks.set(key, e);
  }
  const ranked = [...decks.values()].sort((a, b) => b.games - a.games || b.won - a.won);
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
    decks: ranked.slice(0, 3),
  };
}

function DefaultDeck({ side, db }: { side: Side; db: CardDb }) {
  const [id, setId] = useState(() => defaultDeckId(side));
  const [choosing, setChoosing] = useState(false);
  const [viewing, setViewing] = useState(false);
  useBackClose(choosing, () => setChoosing(false));
  useBackClose(viewing, () => setViewing(false));
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
        <span class={`label who-${side}`}>{t(SIDE_NAME[side])}</span>
      </div>
      {current ? (
        <ul class="deck-library">
          <DeckRow db={db} stored={current} onOpen={() => setChoosing(true)} issuesOnly extra={<Icon name="chevron-right" class="deck-row-go" />} />
        </ul>
      ) : (
        <button class="match-deck-empty" onClick={() => setChoosing(true)} disabled={!mine.length}>
          {mine.length ? (side === "corp" ? t("Choose a default Corp deck") : t("Choose a default Runner deck")) : side === "corp" ? t("No Corp deck yet") : t("No Runner deck yet")}
        </button>
      )}
      {choosing && (
        <div class="sheet-backdrop" onClick={() => setChoosing(false)}>
          <div class="sheet panel deck-choose" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={side === "corp" ? t("Default Corp deck") : t("Default Runner deck")}>
            <div class="row">
              <span class={`label who-${side}`}>{side === "corp" ? t("Default Corp deck") : t("Default Runner deck")}</span>
              {current && (
                <button class="ghost sheet-view-list" onClick={() => setViewing(true)}>
                  {t("View list")}
                </button>
              )}
              <button class="ghost" onClick={() => setChoosing(false)} aria-label={t("Close")}>
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
                {t("No default")}
              </button>
            )}
          </div>
        </div>
      )}
      {viewing && current && <DeckView deck={fromWire(current, db)} onClose={() => setViewing(false)} />}
    </div>
  );
}

export function Profile({ db, onClose, onOpenDeck }: { db: CardDb; onClose: () => void; onOpenDeck: (id: string, side: Side) => void }) {
  useBackClose(true, onClose);
  const [, setTick] = useState(0);
  useEffect(() => onSettings(() => setTick((n) => n + 1)), []);
  const [name, setName] = useState(storedName);
  const [heads, setHeads] = useState<Head[] | null>(null);
  useEffect(() => {
    listHistory()
      .then((games) => setHeads(games.map((g) => headOf(g, db))))
      .catch(() => setHeads([]));
  }, []);
  const s = useMemo(() => (heads ? stats(heads) : null), [heads]);
  const [viewing, setViewing] = useState<WireDeck | null>(null);
  return (
    <>
      <Ticker>
        {t("Profile")} <span class="cyan">{name}</span>
      </Ticker>
      <div class="screen profile">
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label={t("Back")}>
            <Icon name="arrow-left" />
          </button>
          <h1>{t("PROFILE")}</h1>
        </header>

        <section class="panel section profile-id">
          <EditField
            title={t("Handle")}
            label={t("handle")}
            saved={name}
            fallback={t("Player")}
            maxLength={24}
            onSave={(v) => {
              try {
                localStorage.setItem("nsg.name", v);
              } catch {}
              setName(v);
            }}
          />
          <div class="field-box">
            <span class="label">{t("Default format")}</span>
            <Picker title={t("Default format")} value={settings.format} onChange={(f: GameFormat) => setSetting("format", f)} options={GAME_FORMATS.map((f) => ({ key: f.key as GameFormat, label: t(f.label), hint: FORMAT_DESC[f.key as GameFormat] }))} />
          </div>
        </section>

        <section class="panel section">
          <span class="label">{t("Default decks")}</span>
          <DefaultDeck side="corp" db={db} />
          <DefaultDeck side="runner" db={db} />
        </section>

        <section class="panel cyan section profile-stats">
          <span class="label cyan">{t("Stats")}</span>
          {!s ? (
            <p class="hint">{t("Loading…")}</p>
          ) : !s.played ? (
            <p class="hint">{t("Finish a game and your record shows up here.")}</p>
          ) : (
            <>
              <div class="profile-hero">
                <div class="profile-rate">
                  <strong>{pct(s.won, s.decided)}</strong>
                  <span class="label">{t("Win rate")}</span>
                </div>
                <div class="profile-record">
                  <span>
                    <b class="cyan">{s.won}</b> {t("won")}
                  </span>
                  <span>
                    <b class="red">{s.lost}</b> {t("lost")}
                  </span>
                  <span>
                    <b>{s.played}</b> {t("played")}
                  </span>
                </div>
              </div>
              <div class="profile-tiles">
                <div class="profile-tile who-corp">
                  <strong>{pct(s.corp.won, s.corp.games)}</strong>
                  <span>
                    {t("As Corp")} · {s.corp.won}/{s.corp.games}
                  </span>
                </div>
                <div class="profile-tile who-runner">
                  <strong>{pct(s.runner.won, s.runner.games)}</strong>
                  <span>
                    {t("As Runner")} · {s.runner.won}/{s.runner.games}
                  </span>
                </div>
                <div class="profile-tile">
                  <strong>{s.streak}</strong>
                  <span>{t("Win streak · best {n}", { n: s.best })}</span>
                </div>
                <div class="profile-tile">
                  <strong>{s.avgTurns || "—"}</strong>
                  <span>{t("Turns per game")}</span>
                </div>
              </div>
              {s.decks.length > 0 && (
                <>
                  <span class="label">{t("Most played decks")}</span>
                  <ul class="deck-library">
                    {s.decks.map(({ wire, games, won }) => (
                      <DeckRow
                        db={db}
                        stored={wire}
                        onOpen={() => {
                          const saved = savedDecks().find((d) => d.name === wire.name && d.identity === wire.identity);
                          if (saved) onOpenDeck(saved.id, saved.side);
                          else setViewing(wire);
                        }}
                        extra={
                          <span class="deck-rate">
                            <b>{pct(won, games)}</b>
                            <small>
                              {won}/{games}
                            </small>
                          </span>
                        }
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      </div>
      {viewing && <DeckView deck={fromWire(viewing, db)} onClose={() => setViewing(null)} />}
    </>
  );
}
