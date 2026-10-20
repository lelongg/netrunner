import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Card, CardDb, Deck, Matchup, Side } from "../engine";
import { type StoredDeck, type WireDeck, fromPrecon, fromWire, importNrdb, parseDecklist, putDeck, removeDeck, savedDecks, toWire } from "../decks";
import { type FormatKey, FORMAT_DESC, FORMATS, deckFormat, TYPE_ORDER, analyze, costCurve, deckLimit, groupByType, influenceByFaction, influenceOf, isNeutral, legality, subtypeSpread, toText } from "../deckrules";
import { CardImage, ZoomableCardImage } from "../game/CardImage";
import { RichText } from "../game/RichText";
import { Pager } from "../game/Pager";
import { useSheetPager } from "../game/swipe";
import { useBackClose } from "../back";
import { Icon } from "../icons";
import { Cta, Picker, Ticker, ask, tell } from "../ui";
import { motionOff, settings } from "../settings";
import { DeckBrowser } from "./DeckBrowser";
import { uiSound } from "../uisound";

const SIDE_NAME: Record<Side, "Corp" | "Runner"> = { corp: "Corp", runner: "Runner" };

const FACTION_SHORT: Record<string, string> = {
  "Haas-Bioroid": "HB",
  Jinteki: "Jinteki",
  NBN: "NBN",
  "Weyland Consortium": "Weyland",
  Anarch: "Anarch",
  Criminal: "Criminal",
  Shaper: "Shaper",
  Apex: "Apex",
  Adam: "Adam",
  "Sunny Lebeau": "Sunny",
  Neutral: "Neutral",
};

const factionKey = (f?: string) => (f ?? "neutral").toLowerCase().replace(/[^a-z]+/g, "-");

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const defaultDeckFormat = (): FormatKey => deckFormat(settings.format) ?? "standard";
const formatOf = (d: { format?: string }): FormatKey => (FORMATS.some((f) => f.key === d.format) ? (d.format as FormatKey) : "standard");

function Pips({ n, max = 5 }: { n: number; max?: number }) {
  if (!n) return null;
  return (
    <span class="pips" aria-label={`${n} influence`}>
      {"●".repeat(Math.min(n, max))}
      {n > max ? `+${n - max}` : ""}
    </span>
  );
}

export function Decks({ db, matchups, onClose, initialSide }: { db: CardDb; matchups: Matchup[]; onClose: () => void; initialSide?: Side }) {
  const [side, setSide] = useState<Side>(() => {
    if (initialSide) return initialSide;
    try {
      return (localStorage.getItem("nsg.decks.side") as Side) || "corp";
    } catch {
      return "corp";
    }
  });
  const [decks, setDecks] = useState(savedDecks);
  const [editing, setEditing] = useState<StoredDeck | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  useBackClose(browsing, () => setBrowsing(false));
  useBackClose(true, onClose);
  useBackClose(!!editing, () => {
    setEditing(null);
    setDecks(savedDecks());
  });
  useBackClose(creating, () => setCreating(false));
  useBackClose(importing, () => setImporting(false));
  useEffect(() => {
    try {
      localStorage.setItem("nsg.decks.side", side);
    } catch {}
  }, [side]);
  const refresh = () => setDecks(savedDecks());
  const mine = decks.filter((d) => d.side === side);

  if (editing)
    return (
      <DeckEditor
        key={editing.id}
        db={db}
        initial={editing}
        onClose={() => {
          setEditing(null);
          refresh();
        }}
        onOpen={(d) => setEditing(d)}
      />
    );
  if (creating)
    return (
      <IdentityPicker
        db={db}
        side={side}
        format="standard"
        matchups={matchups}
        onClose={() => setCreating(false)}
        onPick={(identity, from) => {
          const base: Deck = from ?? { name: `New ${identity.title.split(":")[0]} deck`, identity, cards: [] };
          const stored = putDeck({ ...toWire({ ...base, identity }), side, format: from ? "casual" : defaultDeckFormat() });
          setCreating(false);
          refresh();
          setEditing(stored);
        }}
      />
    );

  return (
    <>
      <Ticker>
        Decks <span class="cyan">{decks.length}</span>
      </Ticker>
      <div class="screen decks">
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>DECKS</h1>
        </header>
        <div class="side-switch" role="tablist">
          {(["corp", "runner"] as Side[]).map((s) => (
            <button role="tab" aria-selected={side === s} class={`${s} ${side === s ? "on" : ""}`} onClick={() => setSide(s)}>
              {SIDE_NAME[s]}
              <span class="side-count">{decks.filter((d) => d.side === s).length}</span>
            </button>
          ))}
        </div>
        <div class="deck-actions">
          <Cta onClick={() => setCreating(true)}>New deck</Cta>
          <button class="deck-import-btn" onClick={() => setBrowsing(true)}>
            <Icon name="search" />
            <span>NRDB</span>
          </button>
          <button class="deck-import-btn" onClick={() => setImporting(true)}>
            <Icon name="plus" />
            <span>Import</span>
          </button>
        </div>
        {mine.length === 0 && <p class="hint decks-empty">No {SIDE_NAME[side]} deck yet. Start from an identity, a precon or a NetrunnerDB list.</p>}
        <ul class="deck-library">
          {mine.map((w) => (
            <DeckRow key={w.id} db={db} stored={w} onOpen={() => setEditing(w)} />
          ))}
        </ul>
      </div>
      {browsing && (
        <BrowseSheet
          db={db}
          side={side}
          onClose={() => setBrowsing(false)}
          onDone={(deck, format) => {
            const stored = putDeck({ ...toWire(deck), side, format });
            setBrowsing(false);
            refresh();
            setEditing(stored);
          }}
        />
      )}
      {importing && (
        <ImportSheet
          db={db}
          side={side}
          onClose={() => setImporting(false)}
          onDone={(deck) => {
            const deckSide: Side = deck.identity.side === "Corp" ? "corp" : "runner";
            setSide(deckSide);
            const stored = putDeck({ ...toWire(deck), side: deckSide, format: defaultDeckFormat() });
            setImporting(false);
            refresh();
            setEditing(stored);
          }}
        />
      )}
    </>
  );
}

function FitText({ text, class: className }: { text: string; class: string }) {
  const el = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const fit = () => {
      node.style.fontSize = "";
      let size = parseFloat(getComputedStyle(node).fontSize);
      while (node.scrollWidth > node.clientWidth && size > 13) node.style.fontSize = `${--size}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node.parentElement ?? node);
    return () => observer.disconnect();
  }, [text]);
  return (
    <span ref={el} class={className} title={text}>
      {text}
    </span>
  );
}

export function DeckRow({ db, stored, onOpen, format, selected, disabled, issuesOnly }: { db: CardDb; stored: WireDeck & { format?: string }; onOpen: () => void; format?: FormatKey; selected?: boolean; disabled?: boolean; issuesOnly?: boolean }) {
  const deck = useMemo(() => {
    try {
      return fromWire(stored, db);
    } catch {
      return null;
    }
  }, [stored]);
  if (!deck) return null;
  const fmt = format ?? formatOf(stored);
  const a = analyze(deck, fmt);
  return (
    <li>
      <button class={`deck-row faction-${factionKey(deck.identity.faction)} ${selected ? "on" : ""}`} disabled={disabled} onClick={onOpen}>
        <CardImage class="deck-row-id" code={deck.identity.code} alt={deck.identity.title} size="small" width="40px" />
        <span class="deck-row-main">
          <FitText class="deck-row-name" text={deck.name} />
          <span class="deck-row-id-name">
            <b>{FACTION_SHORT[deck.identity.faction ?? "Neutral"] ?? deck.identity.faction}</b> · {deck.identity.title}
          </span>
          <span class="deck-row-meta">
            <span class={a.size < a.minimum ? "red" : ""} aria-label={`${a.size} cards, minimum ${a.minimum}`}>
              <Icon name="deck" />
              {a.size}/{a.minimum}
            </span>
            {a.influenceLimit != null && (
              <span class={a.influence > a.influenceLimit ? "red" : ""} aria-label={`${a.influence} of ${a.influenceLimit} influence`}>
                <i class="inf-pip" />
                {a.influence}/{a.influenceLimit}
              </span>
            )}
            {a.pointsRange && (
              <span aria-label={`${a.points} agenda points`}>
                <Icon name="agenda" />
                {a.points}
              </span>
            )}
          </span>
        </span>
        {!(issuesOnly && a.legal) && <span class={`deck-badge ${a.legal ? "ok" : "bad"}`}>
          <Icon name={a.legal ? "check" : "warning"} />
          {a.legal ? FORMATS.find((f) => f.key === fmt)!.label : `${a.problems.length} issue${a.problems.length > 1 ? "s" : ""}`}
        </span>}
      </button>
    </li>
  );
}

function BrowseSheet({ db, side, onClose, onDone }: { db: CardDb; side: Side; onClose: () => void; onDone: (deck: Deck, format: FormatKey) => void }) {
  const [format, setFormat] = useState<FormatKey>(defaultDeckFormat);
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel deck-choose" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Browse NetrunnerDB decklists">
        <div class="row">
          <span class="label">NetrunnerDB · {SIDE_NAME[side]}</span>
          <button class="ghost" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <section class="format-pick">
          <span class="label">Format</span>
          <Picker title="Format" value={format} onChange={setFormat} options={FORMATS.map((f) => ({ key: f.key, label: f.label, hint: FORMAT_DESC[f.key] }))} />
        </section>
        <DeckBrowser side={side} db={db} format={format} onPick={(l) => l.deck && onDone(l.deck, format)} />
      </div>
    </div>
  );
}

function ImportSheet({ db, side, onClose, onDone }: { db: CardDb; side: Side; onClose: () => void; onDone: (deck: Deck) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const go = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const t = text.trim();
      onDone(/^\S+$/.test(t) && /netrunnerdb\.com|^[0-9a-f-]{36}$/i.test(t) ? await importNrdb(t, side, db) : parseDecklist(t, side, db));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Import a deck">
        <div class="row">
          <span class="label">Import a deck</span>
          <button class="ghost" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <textarea rows={8} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} placeholder={"NetrunnerDB link\nor a text decklist:\nHaas-Bioroid: Precision Design\n3x Hedge Fund\n…"} />
        {error && <p class="error">{error}</p>}
        <button class="primary" disabled={busy || !text.trim()} onClick={go}>
          {busy ? "Importing…" : "Import"}
        </button>
      </div>
    </div>
  );
}

function IdentityPicker({ db, side, format, matchups, onPick, onClose }: { db: CardDb; side: Side; format: FormatKey; matchups?: Matchup[]; onPick: (identity: Card, from?: Deck) => void; onClose: () => void }) {
  const [fmt, setFmt] = useState<FormatKey>(format);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<Card | null>(null);
  useBackClose(!!preview, () => setPreview(null));
  const ids = useMemo(() => {
    const q = normalize(query.trim());
    return db.all
      .filter((c) => c.type === "Identity" && c.side === SIDE_NAME[side] && !c.title.includes("Draft") && c.set_code !== "draft")
      .filter((c) => fmt === "casual" || legality(c, fmt) === "legal")
      .filter((c) => !q || normalize(c.title).includes(q) || normalize(c.faction ?? "").includes(q))
      .sort((a, b) => (a.faction ?? "").localeCompare(b.faction ?? "") || a.title.localeCompare(b.title));
  }, [fmt, query]);
  const byFaction = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const c of ids) m.set(c.faction ?? "Neutral", [...(m.get(c.faction ?? "Neutral") ?? []), c]);
    return [...m.entries()];
  }, [ids]);
  const precons = matchups?.map((m) => m[side]).filter((p, i, all) => all.findIndex((o) => o.name === p.name) === i) ?? [];
  return (
    <>
      <Ticker>
        New deck <span class="cyan">{SIDE_NAME[side]}</span>
      </Ticker>
      <div class="screen identity-picker">
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back">
            <Icon name="arrow-left" />
          </button>
          <h1>IDENTITY</h1>
        </header>
        {precons.length > 0 && (
          <section class="panel section">
            <span class="label">Start from a precon</span>
            <div class="precon-strip">
              {precons.map((p) => {
                const deck = fromPrecon(p, db);
                return (
                  <button class="precon-card" onClick={() => onPick(deck.identity, { ...deck, name: `${p.name} (copy)` })}>
                    <CardImage code={deck.identity.code} alt={deck.identity.title} size="small" width="80px" />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        <div class="search-row">
          <label class="search">
            <Icon name="search" />
            <input value={query} placeholder="Search identities" onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
          </label>
          <FormatSelect value={fmt} onChange={setFmt} />
        </div>
        {byFaction.map(([faction, cards]) => (
          <section class="id-group">
            <span class={`label faction-label faction-${factionKey(faction)}`}>
              {faction} <span class="hint">{cards.length}</span>
            </span>
            <div class="id-grid">
              {cards.map((c) => (
                <button class="id-card" onClick={() => setPreview(c)} aria-label={c.title}>
                  <CardImage code={c.code} alt={c.title} size="small" width="34vw" lazy />
                  <span class="id-meta">
                    {String(c.minimumdecksize ?? "")}/{String(c.influencelimit ?? "∞")}
                    {c.baselink != null && ` · ${c.baselink}`}
                    {c.baselink != null && <Icon name="link" />}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {ids.length === 0 && <p class="hint">No identity matches.</p>}
      </div>
      {preview && (
        <IdentitySheet
          card={preview}
          list={byFaction.flatMap(([, cards]) => cards)}
          onGo={setPreview}
          onPick={() => onPick(preview)}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}

function IdentityInfo({ card }: { card: Card }) {
  return (
    <div class="sheet-info">
      <span class="label">
        Identity{Array.isArray(card.subtypes) && card.subtypes.length ? ` · ${(card.subtypes as string[]).join(" · ")}` : ""}
      </span>
      <h2>{card.title}</h2>
      <span class={`label faction-label faction-${factionKey(card.faction)}`}>{card.faction}</span>
      <div class="id-facts">
        <span>
          <b>{String(card.minimumdecksize ?? "–")}</b> min cards
        </span>
        <span>
          <b>{card.influencelimit == null ? "∞" : String(card.influencelimit)}</b> influence
        </span>
        {card.baselink != null && (
          <span>
            <b>{String(card.baselink)}</b> <Icon name="link" /> link
          </span>
        )}
      </div>
      {card.text && <RichText class="card-text" text={card.text} />}
    </div>
  );
}

function IdentitySheet({ card, list, onGo, onPick, onClose }: { card: Card; list: Card[]; onGo: (c: Card) => void; onPick: () => void; onClose: () => void }) {
  const index = Math.max(0, list.indexOf(card));
  const step = (dir: -1 | 1) => {
    const next = list[index + dir];
    if (next) onGo(next);
  };
  const sheet = useRef<HTMLDivElement>(null);
  const swipe = useSheetPager(sheet, card.code, (dir) => !!list[index + dir], step);
  const neighbors = { prev: list[index - 1], next: list[index + 1] };
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div ref={sheet} class={`sheet panel swipeable faction-${factionKey(card.faction)}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={card.title} {...swipe}>
        {list.length > 1 && <Pager index={index} count={list.length} onStep={step} />}
        {(["prev", "next"] as const).map((k) => {
          const n = neighbors[k];
          return (
            n && (
              <div key={`${k}:${n.code}`} class={`sheet-peek ${k}`} aria-hidden="true">
                <CardImage class="sheet-img" code={n.code} alt="" size="large" />
                <IdentityInfo card={n} />
              </div>
            )
          );
        })}
        <div key={card.code} class="sheet-head">
          <ZoomableCardImage class="sheet-img" code={card.code} alt={card.title} size="large" gallery={list.map((c) => ({ code: c.code, alt: c.title }))} galleryStart={index} onGallery={(i) => onGo(list[i])} />
          <IdentityInfo card={card} />
        </div>
        <Cta onClick={onPick}>Build with this identity</Cta>
        <button class="ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function FormatSelect({ value, onChange }: { value: FormatKey; onChange: (f: FormatKey) => void }) {
  return (
    <div class="format-select">
      <span class="label">Format</span>
      <Picker title="Format" value={value} onChange={onChange} options={FORMATS.map((f) => ({ key: f.key, label: f.label, hint: FORMAT_DESC[f.key] }))} />
    </div>
  );
}

type Tab = "deck" | "cards" | "stats";

export function DeckView({ deck, format = "casual", onClose }: { deck: Deck; format?: FormatKey; onClose: () => void }) {
  const side: Side = deck.identity.side === "Corp" ? "corp" : "runner";
  useBackClose(true, onClose);
  return (
    <div class="deck-view-overlay">
      <DeckEditor initial={{ ...toWire(deck), side, id: "", format }} deck0={deck} onClose={onClose} readOnly />
    </div>
  );
}

function DeckEditor({ db, initial, deck0, onClose, onOpen, readOnly }: { db?: CardDb; initial: StoredDeck; deck0?: Deck; onClose: () => void; onOpen?: (d: StoredDeck) => void; readOnly?: boolean }) {
  const [deck, setDeck] = useState<Deck>(() => deck0 ?? fromWire(initial, db!));
  const [format, setFormat] = useState<FormatKey>(formatOf(initial));
  const [tab, setTab] = useState<Tab>(() => (initial.cards.length || readOnly ? "deck" : "cards"));
  const [detail, setDetail] = useState<{ card: Card; list: Card[] } | null>(null);
  const open = (card: Card, list: Card[] = [card]) => setDetail({ card, list });
  const [menu, setMenu] = useState(false);
  const [issues, setIssues] = useState(false);
  const [changingId, setChangingId] = useState(false);
  const side: Side = deck.identity.side === "Corp" ? "corp" : "runner";
  useBackClose(!!detail, () => setDetail(null));
  useBackClose(menu, () => setMenu(false));
  useBackClose(changingId, () => setChangingId(false));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (readOnly) return;
    putDeck({ ...toWire(deck), side, id: initial.id, format });
  }, [deck, format]);
  const a = useMemo(() => analyze(deck, format), [deck, format]);
  const qtyOf = useMemo(() => new Map(deck.cards.map((e) => [e.card.title, e.qty])), [deck]);
  const setQty = (card: Card, qty: number) => {
    const n = Math.max(0, Math.min(deckLimit(card), qty));
    setDeck((d) => {
      const rest = d.cards.filter((e) => e.card.title !== card.title);
      return { ...d, cards: n ? [...rest, { card, qty: n }] : rest };
    });
  };
  const share = async () => {
    setMenu(false);
    const text = `${deck.name}\n\n${toText(deck)}`;
    try {
      if (navigator.share) return await navigator.share({ title: deck.name, text });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    await navigator.clipboard?.writeText(text).catch(() => {});
    uiSound("ui_copy");
    tell("Decklist copied", "Paste it anywhere, or import it on NetrunnerDB.");
  };

  if (changingId && db)
    return (
      <IdentityPicker
        db={db}
        side={side}
        format={format}
        onClose={() => setChangingId(false)}
        onPick={(identity) => {
          setDeck((d) => ({ ...d, identity }));
          setChangingId(false);
        }}
      />
    );

  return (
    <>
      <Ticker>
        {readOnly ? "Deck list" : "Deck editor"} <span class={a.legal ? "cyan" : "yellow"}>{a.legal ? "legal" : `${a.problems.length} to fix`}</span>
      </Ticker>
      <div class={`screen deck-editor side-${side} faction-${factionKey(deck.identity.faction)}`}>
        <header class="editor-head">
          <button class="ghost" onClick={onClose} aria-label="Back to decks">
            <Icon name="arrow-left" />
          </button>
          {readOnly ? (
            <h1 class={`deck-name ${deck.name.length > 22 ? "long" : ""}`}>{deck.name}</h1>
          ) : (
            <input class="deck-name" value={deck.name} aria-label="Deck name" maxLength={60} onInput={(e) => setDeck((d) => ({ ...d, name: (e.target as HTMLInputElement).value }))} onBlur={() => !deck.name.trim() && setDeck((d) => ({ ...d, name: "Untitled deck" }))} />
          )}
          {readOnly ? (
            <button class="ghost" onClick={share} aria-label="Share decklist">
              <Icon name="share" />
            </button>
          ) : (
            <button class="ghost" onClick={() => setMenu(!menu)} aria-label="Deck menu" aria-expanded={menu}>
              <Icon name={menu ? "close" : "menu"} />
            </button>
          )}
        </header>
        {menu && (
          <>
            <div class="menu-backdrop" onClick={() => setMenu(false)} />
            <nav class="menu panel editor-menu">
              <button onClick={share}>
                <Icon name="share" /> Share decklist
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  onOpen?.(putDeck({ ...toWire({ ...deck, name: `${deck.name} (copy)` }), side, format }));
                }}
              >
                <Icon name="copy" /> Duplicate
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  setChangingId(true);
                }}
              >
                <Icon name="swap" /> Change identity
              </button>
              <button
                class="danger"
                onClick={async () => {
                  setMenu(false);
                  if (!(await ask({ title: "Delete this deck?", body: `"${deck.name}" is removed from this device.`, ok: "Delete", danger: true }))) return;
                  removeDeck(initial.id);
                  onClose();
                }}
              >
                <Icon name="close" /> Delete deck
              </button>
            </nav>
          </>
        )}

        <section class={`panel deck-summary faction-${factionKey(deck.identity.faction)}`}>
          <span class="summary-mark" aria-hidden="true">
            {(FACTION_SHORT[deck.identity.faction ?? "Neutral"] ?? deck.identity.faction ?? "").toUpperCase()}
          </span>
          <div class="summary-who">
            <span class="summary-faction">{deck.identity.faction}</span>
            <span class="summary-id-name">{deck.identity.title}</span>
          </div>
          <button class="summary-id" onClick={() => open(deck.identity)} aria-label={deck.identity.title}>
            <CardImage code={deck.identity.code} alt={deck.identity.title} size="small" width="64px" />
          </button>
          <div class="summary-meters">
            <Meter label="Cards" value={a.size} goal={a.minimum} over={false} under={a.size < a.minimum} />
            {a.influenceLimit != null && <Meter label="Influence" value={a.influence} goal={a.influenceLimit} over={a.influence > a.influenceLimit} pips />}
            {a.pointsRange && <Meter label="Agenda pts" value={a.points} goal={a.pointsRange[0]} range={a.pointsRange} over={a.points > a.pointsRange[1]} under={a.points < a.pointsRange[0]} />}
          </div>
          <div class="summary-side">
            {readOnly ? (
              <span class="format-static">{FORMATS.find((f) => f.key === format)?.label}</span>
            ) : (
              <FormatSelect value={format} onChange={setFormat} />
            )}
            <button class={`legal-chip ${a.legal ? "ok" : "bad"}`} onClick={() => setIssues(!issues)} aria-expanded={issues}>
              <Icon name={a.legal ? "check" : "warning"} />
              {a.legal ? "Legal" : `${a.problems.length} issue${a.problems.length > 1 ? "s" : ""}`}
            </button>
          </div>
          {issues && a.problems.length > 0 && (
            <ul class="issues">
              {a.problems.map((p) => (
                <li class={p.level}>{p.text}</li>
              ))}
            </ul>
          )}
        </section>

        <div class="tabs editor-tabs" role="tablist">
          {((readOnly ? ["deck", "stats"] : ["deck", "cards", "stats"]) as Tab[]).map((t) => (
            <button role="tab" aria-selected={tab === t} class={tab === t ? "on" : ""} onClick={() => setTab(t)}>
              {t === "deck" ? `Deck · ${a.size}` : t === "cards" ? "Add cards" : "Stats"}
            </button>
          ))}
        </div>

        {tab === "deck" && <DeckList deck={deck} format={format} onQty={readOnly ? undefined : setQty} onOpen={open} onBrowse={() => setTab("cards")} />}
        {tab === "cards" && db && <CardBrowser db={db} deck={deck} format={format} qtyOf={qtyOf} onQty={setQty} onOpen={open} />}
        {tab === "stats" && <DeckStats deck={deck} onOpen={open} />}
      </div>
      {detail && (
        <CardSheet
          card={detail.card}
          list={detail.list}
          identity={deck.identity}
          format={format}
          qty={qtyOf.get(detail.card.title) ?? 0}
          onQty={readOnly ? undefined : (n) => setQty(detail.card, n)}
          onGo={(card) => setDetail({ ...detail, card })}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

function Meter({ label, value, goal, range, over, under, pips }: { label: string; value: number; goal: number; range?: [number, number]; over: boolean; under?: boolean; pips?: boolean }) {
  const pct = Math.min(100, (value / Math.max(1, range ? range[1] : goal)) * 100);
  return (
    <div class={`meter-row ${over ? "over" : under ? "under" : "ok"}`}>
      <span class="meter-label">{label}</span>
      <span class="meter-value">
        <b>{value}</b>/{range ? `${range[0]}–${range[1]}` : goal}
      </span>
      {pips && goal <= 20 ? (
        <span class="meter-pips">
          {Array.from({ length: Math.max(goal, value) }, (_, i) => (
            <i class={i < value ? (i >= goal ? "x" : "on") : ""} />
          ))}
        </span>
      ) : (
        <span class="meter-bar">
          <i style={{ width: `${pct}%` }} />
        </span>
      )}
    </div>
  );
}

function Stepper({ qty, max, onQty, title }: { qty: number; max: number; onQty: (n: number) => void; title: string }) {
  return (
    <span class="stepper">
      <button aria-label={`Remove one ${title}`} disabled={qty === 0} onClick={(e) => (e.stopPropagation(), onQty(qty - 1))}>
        <Icon name="minus" />
      </button>
      <b>{qty}</b>
      <button aria-label={`Add one ${title}`} disabled={qty >= max} onClick={(e) => (e.stopPropagation(), onQty(qty + 1))}>
        <Icon name="plus" />
      </button>
    </span>
  );
}

function CardCost({ card }: { card: Card }) {
  if (card.type === "Agenda")
    return (
      <span class="row-cost" aria-label={`advance ${card.advancementcost}, ${card.agendapoints} points`}>
        {String(card.advancementcost)}
        <Icon name="advance" class="glyph" />
        <span class="row-cost-sep">/</span>
        {String(card.agendapoints)}
        <Icon name="agenda" class="glyph" />
      </span>
    );
  if (card.cost == null) return null;
  return (
    <span class="row-cost">
      {card.cost}
      <Icon name="credit" class="glyph" />
    </span>
  );
}

function DeckList({ deck, format, onQty, onOpen, onBrowse }: { deck: Deck; format: FormatKey; onQty?: (c: Card, n: number) => void; onOpen: (c: Card, list: Card[]) => void; onBrowse: () => void }) {
  const sections = groupByType(deck);
  const ordered = sections.flatMap((g) => g.entries.map((e) => e.card));
  if (!sections.length)
    return (
      <div class="deck-empty">
        <p class="hint">This deck is empty.</p>
        <button class="primary" onClick={onBrowse}>
          Add cards
        </button>
      </div>
    );
  return (
    <div class="deck-sections">
      {sections.map((s) => (
        <section class="deck-section">
          <div class="deck-section-head">
            <span class="label">{s.type}</span>
            <span class="label">{s.count}</span>
          </div>
          <ul class="edit-rows">
            {s.entries.map((e) => {
              const l = legality(e.card, format);
              return (
                <li class={`edit-row faction-${factionKey(e.card.faction)} ${l !== "legal" && l !== "restricted" ? "illegal" : ""}`}>
                  <button class="edit-row-main" onClick={() => onOpen(e.card, ordered)}>
                    <CardImage class="edit-row-thumb" code={e.card.code} alt="" size="small" width="30px" lazy />
                    <span class="edit-row-text">
                      <span class="edit-row-title">
                        {e.card.uniqueness ? "◆ " : ""}
                        {e.card.title}
                      </span>
                      <span class="edit-row-sub">
                        {Array.isArray(e.card.subtypes) && e.card.subtypes.length > 0 && <span class="edit-row-types">{e.card.subtypes.join(" · ")}</span>}
                        <Pips n={influenceOf(deck.identity, e.card) * e.qty} />
                        {l === "banned" && <span class="red">banned</span>}
                        {l === "rotated" && <span class="red">not in format</span>}
                        {l === "restricted" && <span class="yellow">restricted</span>}
                      </span>
                    </span>
                  </button>
                  <CardCost card={e.card} />
                  {onQty ? <Stepper qty={e.qty} max={deckLimit(e.card)} title={e.card.title} onQty={(n) => onQty(e.card, n)} /> : <span class="edit-row-qty">{e.qty}×</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

const PAGE = 36;

function CardBrowser({ db, deck, format, qtyOf, onQty, onOpen }: { db: CardDb; deck: Deck; format: FormatKey; qtyOf: Map<string, number>; onQty: (c: Card, n: number) => void; onOpen: (c: Card, list: Card[]) => void }) {
  const sideName = deck.identity.side;
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [factions, setFactions] = useState<string[]>([]);
  const [inFormat, setInFormat] = useState(true);
  const [onlyInDeck, setOnlyInDeck] = useState(false);
  const [sort, setSort] = useState<"type" | "name" | "cost" | "influence">("type");
  const [shown, setShown] = useState(PAGE);
  const more = useRef<HTMLDivElement>(null);
  const pool = useMemo(() => {
    const seen = new Map<string, Card>();
    for (const c of db.all) {
      if (c.side !== sideName || c.type === "Identity") continue;
      const prev = seen.get(c.title);
      if (!prev || (legality(c, format) === "legal" && legality(prev, format) !== "legal") || (Number(c.code) > Number(prev.code) && legality(c, format) === legality(prev, format))) seen.set(c.title, c);
    }
    return [...seen.values()];
  }, [sideName, format]);
  const factionList = useMemo(() => {
    const own = deck.identity.faction ?? "Neutral";
    const all = [...new Set(pool.map((c) => c.faction ?? "Neutral"))];
    return [own, ...all.filter((f) => f !== own && !f.startsWith("Neutral")), ...all.filter((f) => f.startsWith("Neutral") && f !== own)];
  }, [pool]);
  const results = useMemo(() => {
    const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
    const order = TYPE_ORDER[sideName];
    const list = pool.filter((c) => {
      if (onlyInDeck && !qtyOf.get(c.title)) return false;
      if (c.type === "Agenda" && !isNeutral(c) && c.faction !== deck.identity.faction && !qtyOf.get(c.title)) return false;
      if (inFormat && format !== "casual" && !["legal", "restricted"].includes(legality(c, format))) return false;
      if (types.length && !types.includes(c.type)) return false;
      if (factions.length && !factions.includes(c.faction ?? "Neutral")) return false;
      if (terms.length) {
        const hay = normalize(`${c.title} ${(c.subtypes as string[] | undefined)?.join(" ") ?? ""} ${c.text ?? ""}`);
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const inf = (c: Card) => influenceOf(deck.identity, c);
    return list.sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : sort === "cost"
          ? Number(a.cost ?? a.advancementcost ?? 0) - Number(b.cost ?? b.advancementcost ?? 0) || a.title.localeCompare(b.title)
          : sort === "influence"
            ? inf(a) - inf(b) || a.title.localeCompare(b.title)
            : order.indexOf(a.type) - order.indexOf(b.type) || a.title.localeCompare(b.title),
    );
  }, [pool, query, types, factions, inFormat, onlyInDeck, sort, format, onlyInDeck && qtyOf]);
  useEffect(() => setShown(PAGE), [query, types, factions, inFormat, onlyInDeck, sort]);
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setShown((n) => n + PAGE), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [results.length > shown]);
  const toggle = (list: string[], set: (l: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div class="card-browser">
      <div class="browser-controls">
        <label class="search">
          <Icon name="search" />
          <input type="search" value={query} placeholder="Title, subtype or text" onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        </label>
        <div class="chips scroll-chips">
          {TYPE_ORDER[sideName].map((t) => (
            <button class={types.includes(t) ? "on" : ""} onClick={() => toggle(types, setTypes, t)}>
              {t}
            </button>
          ))}
        </div>
        <div class="chips scroll-chips">
          {factionList.map((f) => (
            <button class={`faction-chip faction-${factionKey(f)} ${factions.includes(f) ? "on" : ""}`} onClick={() => toggle(factions, setFactions, f)}>
              {FACTION_SHORT[f] ?? f}
            </button>
          ))}
        </div>
        <div class="browser-row">
          {format !== "casual" && (
            <button class={`toggle ${inFormat ? "on" : ""}`} aria-pressed={inFormat} onClick={() => setInFormat(!inFormat)}>
              In format
            </button>
          )}
          <button class={`toggle ${onlyInDeck ? "on" : ""}`} aria-pressed={onlyInDeck} onClick={() => setOnlyInDeck(!onlyInDeck)}>
            In deck
          </button>
          <div class="sort-select">
            <span class="label">Sort</span>
            <Picker
              title="Sort cards by"
              value={sort}
              onChange={setSort}
              options={[
                { key: "type", label: "Type" },
                { key: "name", label: "Name" },
                { key: "cost", label: "Cost" },
                { key: "influence", label: "Influence" },
              ]}
            />
          </div>
        </div>
        <span class="hint browser-count">{results.length} cards</span>
      </div>
      <div class="browse-grid">
        {results.slice(0, shown).map((c) => {
          const qty = qtyOf.get(c.title) ?? 0;
          const inf = influenceOf(deck.identity, c);
          const blocked = c.type === "Agenda" && !isNeutral(c) && c.faction !== deck.identity.faction;
          return (
            <div class={`browse-card ${qty ? "in" : ""} ${blocked ? "blocked" : ""}`}>
              <button class="browse-img" onClick={() => onOpen(c, results)} aria-label={c.title}>
                <CardImage code={c.code} alt={c.title} size="small" width="31vw" lazy />
                {inf > 0 && <span class="browse-inf">{"●".repeat(Math.min(inf, 5))}</span>}
              </button>
              {!blocked && <Stepper qty={qty} max={deckLimit(c)} title={c.title} onQty={(n) => onQty(c, n)} />}
            </div>
          );
        })}
      </div>
      {results.length > shown && <div ref={more} class="browse-more" />}
      {results.length === 0 && <p class="hint">No card matches these filters.</p>}
    </div>
  );
}

function shuffle<T>(list: T[]) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function DeckStats({ deck, onOpen }: { deck: Deck; onOpen: (c: Card, list: Card[]) => void }) {
  const corp = deck.identity.side === "Corp";
  const curve = costCurve(deck);
  const peak = Math.max(1, ...curve.map((b) => b.count));
  const groups = groupByType(deck);
  const size = groups.reduce((n, g) => n + g.count, 0);
  const spread = corp ? subtypeSpread(deck, "ICE", ["Barrier", "Code Gate", "Sentry"]) : subtypeSpread(deck, "Program", ["Fracter", "Decoder", "Killer", "AI"]);
  const influence = influenceByFaction(deck);
  const library = useMemo(() => deck.cards.flatMap((e) => Array.from({ length: e.qty }, () => e.card)), [deck]);
  const [hand, setHand] = useState<Card[]>([]);
  const [rest, setRest] = useState<Card[]>([]);
  const [deal, setDeal] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const draw = (fresh: boolean) => {
    const pile = fresh ? shuffle(library) : rest;
    const n = fresh ? 5 : 1;
    const apply = () => {
      setHand((h) => (fresh ? pile.slice(0, n) : [...h, ...pile.slice(0, n)]));
      setRest(pile.slice(n));
      if (fresh) setDeal((d) => d + 1);
      setLeaving(false);
    };
    if (fresh && hand.length && !motionOff()) {
      setLeaving(true);
      setTimeout(apply, 390);
    } else apply();
  };
  useEffect(() => {
    if (library.length) draw(true);
  }, []);
  const agendas = deck.cards.filter((e) => e.card.type === "Agenda").reduce((n, e) => n + e.qty, 0);
  return (
    <div class="deck-stats-tab">
      <section class="panel section">
        <span class="label">Cost curve</span>
        <div class="curve">
          {curve.map((b) => (
            <div class="curve-col">
              <span class="curve-n">{b.count || ""}</span>
              <i style={{ height: `${(b.count / peak) * 100}%` }} />
              <span class="curve-cost">
                {b.cost === 6 ? "6+" : b.cost}
                <Icon name="credit" class="glyph" />
              </span>
            </div>
          ))}
        </div>
      </section>
      <section class="panel section">
        <span class="label">Composition</span>
        <div class="type-bar">
          {groups.map((g, i) => (
            <i class={`t${i}`} style={{ flexGrow: g.count }} title={`${g.type} ${g.count}`} />
          ))}
        </div>
        <ul class="type-legend">
          {groups.map((g, i) => (
            <li>
              <i class={`t${i}`} />
              {g.type}
              <b>{g.count}</b>
              <span class="hint">{size ? Math.round((g.count / size) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
        {corp && size > 0 && (
          <p class="hint">
            {agendas} agenda{agendas === 1 ? "" : "s"}, one every {Math.round((size / Math.max(1, agendas)) * 10) / 10} cards · {Math.round((1 - hyperNone(size, agendas, 5)) * 100)}% chance to open with one
          </p>
        )}
      </section>
      <section class="panel section">
        <span class="label">{corp ? "Ice" : "Icebreakers"}</span>
        <div class="spread">
          {spread.map((s) => (
            <div class={`spread-cell ${s.count ? "" : "zero"}`}>
              <b>{s.count}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>
      {influence.length > 0 && (
        <section class="panel section">
          <span class="label">Influence spent</span>
          <ul class="inf-list">
            {influence.map(([f, n]) => (
              <li class={`faction-${factionKey(f)}`}>
                <span>{f}</span>
                <span class="pips">{"●".repeat(n)}</span>
                <b>{n}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section class="panel section sample">
        <div class="row">
          <span class="label">Sample hand</span>
          <span class="hint">{rest.length ? `${rest.length} left in deck` : ""}</span>
        </div>
        <div class={`sample-hand ${leaving ? "leaving" : ""}`}>
          {hand.map((c, i) => (
            <button key={`${deal}:${i}`} class="sample-card" style={{ "--i": i } as any} onClick={() => onOpen(c, hand)} aria-label={c.title}>
              <CardImage code={c.code} alt={c.title} size="small" width="20vw" />
            </button>
          ))}
          {hand.length === 0 && <span class="hint">Add cards to draw a sample hand.</span>}
        </div>
        <div class="sample-buttons">
          <button class="primary" disabled={!library.length || leaving} onClick={() => draw(true)}>
            <Icon name="dice" /> {hand.length ? "Redraw" : "Draw 5"}
          </button>
          <button disabled={!hand.length || !rest.length} onClick={() => draw(false)}>
            Draw 1 more
          </button>
        </div>
      </section>
    </div>
  );
}

function hyperNone(size: number, hits: number, draws: number) {
  let p = 1;
  for (let i = 0; i < draws; i++) p *= Math.max(0, size - hits - i) / Math.max(1, size - i);
  return p;
}

function CardInfo({ card, identity, format }: { card: Card; identity: Card; format: FormatKey }) {
  const inf = influenceOf(identity, card);
  const l = legality(card, format);
  return (
    <div class="sheet-info">
      <span class="label">
        {card.type}
        {Array.isArray(card.subtypes) && card.subtypes.length ? ` · ${(card.subtypes as string[]).join(" · ")}` : ""}
      </span>
      <h2>{card.title}</h2>
      <span class="label">
        {card.faction}
        {inf ? ` · ${inf} inf` : ""} · {card.setname as string}
      </span>
      <span class={`legal-line ${l}`}>{l === "legal" ? `Legal in ${FORMATS.find((f) => f.key === format)!.label}` : l === "restricted" ? "Restricted" : l === "banned" ? "Banned" : "Not in this format"}</span>
      {card.text && <RichText class="card-text" text={card.text} />}
    </div>
  );
}

function CardSheet({ card, list, identity, format, qty, onQty, onGo, onClose }: { card: Card; list: Card[]; identity: Card; format: FormatKey; qty: number; onQty?: (n: number) => void; onGo: (c: Card) => void; onClose: () => void }) {
  const index = Math.max(0, list.indexOf(card));
  const step = (dir: -1 | 1) => {
    const next = list[index + dir];
    if (next) onGo(next);
  };
  const sheet = useRef<HTMLDivElement>(null);
  const swipe = useSheetPager(sheet, `${card.title}:${index}`, (dir) => !!list[index + dir], step);
  const isId = card.type === "Identity";
  const blocked = card.type === "Agenda" && !isNeutral(card) && card.faction !== identity.faction;
  const neighbors = { prev: list[index - 1], next: list[index + 1] };
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div ref={sheet} class="sheet panel swipeable" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={card.title} {...swipe}>
        {list.length > 1 && <Pager index={index} count={list.length} onStep={step} />}
        {(["prev", "next"] as const).map((k) => {
          const n = neighbors[k];
          return (
            n && (
              <div key={`${k}:${n.title}`} class={`sheet-peek ${k}`} aria-hidden="true">
                <CardImage class="sheet-img" code={n.code} alt="" size="large" />
                <CardInfo card={n} identity={identity} format={format} />
              </div>
            )
          );
        })}
        <div key={`${card.code}:${index}`} class="sheet-head">
          <ZoomableCardImage class="sheet-img" code={card.code} alt={card.title} size="large" gallery={list.map((c) => ({ code: c.code, alt: c.title }))} galleryStart={index} onGallery={(i) => onGo(list[i])} />
          <CardInfo card={card} identity={identity} format={format} />
        </div>
        {blocked && <p class="error">Agendas must be neutral or from your identity's faction.</p>}
        {!isId && (!blocked || qty > 0) && (
          <div class="sheet-stepper">
            <span class="label">In deck</span>
            {onQty ? <Stepper qty={qty} max={deckLimit(card)} title={card.title} onQty={onQty} /> : <b class="edit-row-qty">{qty}×</b>}
          </div>
        )}
        <button class="ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
