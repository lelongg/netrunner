import { useEffect, useMemo, useState } from "preact/hooks";
import type { CardDb, Deck, Side } from "../engine";
import { type DeckResult, type Decklist, FACTIONS, fetchDecklists, fetchSimilar, fetchStats } from "../nrdb";
import { type FormatKey, analyze } from "../deckrules";
import { toWire } from "../decks";
import { botPlay } from "./DeckPicker";
import { Icon } from "../icons";
import { IdentityThumb } from "./IdentityThumb";
import { FactionLogo } from "../FactionLogo";
import { CardImage } from "../game/CardImage";
import { useBackClose } from "../back";

interface Props {
  side: Side;
  db: CardDb;
  selected?: string;
  onPick: (list: Decklist) => void;
  format?: FormatKey;
  similarTo?: Deck;
}

type Tab = "decks" | "identities" | "meta";
type CardFilter = { code: string; title: string; mode: "any" | "x3" | "without" };
type Similar = { label: string; of: { id: string } | Deck };

const plain = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

const shortTitle = (title: string) => title.split(":")[0];

const token = (c: CardFilter) => (c.mode === "without" ? `-${c.code}` : c.mode === "x3" ? `${c.code}x3` : c.code);

const MODE_LABEL: Record<CardFilter["mode"], (t: string) => string> = { any: (t) => t, x3: (t) => `3× ${t}`, without: (t) => `No ${t}` };
const NEXT_MODE: Record<CardFilter["mode"], CardFilter["mode"]> = { any: "x3", x3: "without", without: "any" };

function ResultBadge({ result }: { result: DeckResult }) {
  return (
    <span class={`deck-result ${result.place === 1 ? "win" : result.place <= 8 ? "top" : ""}`} title={`${result.title} · ${result.date}`}>
      {ordinal(result.place)} of {result.players}
    </span>
  );
}

export function DeckBrowser({ side, db, selected, onPick, format, similarTo }: Props) {
  const [tab, setTab] = useState<Tab>("decks");
  const [identity, setIdentity] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [similar, setSimilar] = useState<Similar | null>(similarTo ? { label: similarTo.name, of: similarTo } : null);
  const [sort, setSort] = useState<"new" | "results">("new");
  const statsFormat = format ?? "casual";
  const openDecks = (code: string, bySort: "new" | "results" = "new") => {
    setIdentity(code);
    setSort(bySort);
    setSimilar(null);
    setDetail(null);
    setTab("decks");
  };
  return (
    <div class="deck-browser">
      <div class="tabs browse-tabs" role="tablist">
        {(["decks", "identities", "meta"] as Tab[]).map((t) => (
          <button role="tab" aria-selected={tab === t} class={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "decks" ? "Decks" : t === "identities" ? "Identities" : "Meta"}
          </button>
        ))}
      </div>
      {tab === "decks" && <DecksTab side={side} db={db} selected={selected} onPick={onPick} format={format} identity={identity} onIdentity={setIdentity} similar={similar} onSimilar={setSimilar} sort={sort} onSort={setSort} />}
      {tab === "identities" && <IdentitiesTab side={side} db={db} format={statsFormat} onOpen={setDetail} />}
      {tab === "meta" && <MetaTab side={side} db={db} format={statsFormat} onOpen={setDetail} />}
      {detail && <IdentityDetail code={detail} db={db} format={statsFormat} onDecks={openDecks} onClose={() => setDetail(null)} />}
    </div>
  );
}

function DecksTab({ side, db, selected, onPick, format, identity, onIdentity, similar, onSimilar, sort, onSort }: Omit<Props, "similarTo"> & { identity: string | null; onIdentity: (c: string | null) => void; similar: Similar | null; onSimilar: (s: Similar | null) => void; sort: "new" | "results"; onSort: (s: "new" | "results") => void }) {
  const [faction, setFaction] = useState<string | null>(null);
  const [standard, setStandard] = useState(true);
  const [top, setTop] = useState(false);
  const [botOnly, setBotOnly] = useState(false);
  const [lists, setLists] = useState<Decklist[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<CardFilter[]>([]);
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);
  const sideName = side === "corp" ? "Corp" : "Runner";
  const term = plain(q);
  const identities = useMemo(() => (term.length >= 2 ? db.all.filter((c) => c.side === sideName && c.type === "Identity" && plain(c.title).includes(term)).map((c) => String(c.code)) : []), [term, side]);
  const suggestions = useMemo(() => {
    const t = plain(text.trim());
    if (t.length < 3) return [];
    const seen = new Set(cards.map((c) => c.title));
    return db.all.filter((c) => c.side === sideName && c.type !== "Identity" && !seen.has(c.title) && plain(c.title).includes(t)).slice(0, 4);
  }, [text, side, cards]);
  const addCard = (c: { code: unknown; title: string }) => {
    setCards((prev) => [...prev, { code: String(c.code), title: c.title, mode: "any" as const }].slice(0, 5));
    setText("");
    setQ("");
  };
  const identityCard = identity ? db.byCode.get(identity) : undefined;
  const key = [side, faction, format, q, cards.map(token).join(), identity, sort, top, similar?.label].join("|");

  const load = async (next: number, reset: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      if (similar) {
        const items = await fetchSimilar(db, similar.of, format ?? "casual");
        setLists(items);
        setHasMore(false);
        setPage(1);
        return;
      }
      const res = await fetchDecklists(db, side, faction, next, format, { q, identities, cards: cards.map(token), identity: identity ?? undefined, sort, top: top ? 8 : undefined });
      setLists((prev) => (reset ? res.items : [...prev, ...res.items]));
      setHasMore(res.hasMore);
      setPage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setLists([]);
    setWant(10);
    load(1, true);
  }, [key]);

  const knows = (l: Decklist) => !botOnly || (!!l.deck && botPlay(side, toWire(l.deck)).rank < 2);
  const shown = lists.filter((l) => l.deck && (format ? format === "casual" || analyze(l.deck, format).legal : !standard || l.standard) && knows(l));
  const filtering = (!!format && format !== "casual") || botOnly;
  const [want, setWant] = useState(10);

  useEffect(() => {
    if (filtering && !busy && !error && hasMore && shown.length < want && page < 30) load(page + 1, false);
  }, [busy, page, shown.length, want]);

  const searching = !!(q || cards.length || identity || top || sort === "results" || similar);
  return (
    <>
      {!similar && (
        <label class="search">
          <Icon name="search" />
          <input type="search" value={text} placeholder="Deck, player, identity or card" onInput={(e) => setText((e.target as HTMLInputElement).value)} />
        </label>
      )}
      {(suggestions.length > 0 || cards.length > 0 || identityCard || similar) && (
        <div class="chips scroll-chips deck-search-cards">
          {similar && (
            <button class="on" onClick={() => onSimilar(null)} aria-label="Stop showing similar decks">
              Like {similar.label} ×
            </button>
          )}
          {identityCard && (
            <button class="on" onClick={() => onIdentity(null)} aria-label={`Remove the ${identityCard.title} filter`}>
              {shortTitle(identityCard.title)} ×
            </button>
          )}
          {!similar &&
            cards.map((c) => (
              <span class={`card-filter mode-${c.mode}`}>
                <button class="on" onClick={() => setCards((prev) => prev.map((x) => (x.code === c.code ? { ...x, mode: NEXT_MODE[x.mode] } : x)))} aria-label={`${MODE_LABEL[c.mode](c.title)}, tap to change`}>
                  {MODE_LABEL[c.mode](c.title)}
                </button>
                <button class="on card-filter-x" onClick={() => setCards((prev) => prev.filter((x) => x.code !== c.code))} aria-label={`Remove ${c.title}`}>
                  ×
                </button>
              </span>
            ))}
          {!similar &&
            suggestions.map((c) => (
              <button onClick={() => addCard(c)} aria-label={`Only decks with ${c.title}`}>
                + {c.title}
              </button>
            ))}
        </div>
      )}
      {!similar && (
        <div class="chips scroll-chips">
          <button class={faction === null ? "on" : ""} onClick={() => setFaction(null)}>
            All
          </button>
          {FACTIONS[side].map(([id, label]) => (
            <button class={`faction-chip ${faction === id ? "on" : ""}`} onClick={() => setFaction(id)}>
              <FactionLogo faction={id} />
              {label}
            </button>
          ))}
        </div>
      )}
      <div class="chips scroll-chips browse-options">
        {!similar && (
          <>
            <button class={sort === "new" ? "on" : ""} onClick={() => onSort("new")} aria-pressed={sort === "new"}>
              Newest
            </button>
            <button class={sort === "results" ? "on" : ""} onClick={() => onSort("results")} aria-pressed={sort === "results"}>
              Tournaments
            </button>
            <button class={`toggle ${top ? "on" : ""}`} onClick={() => setTop(!top)} aria-pressed={top}>
              Top 8
            </button>
          </>
        )}
        <button class={`toggle ${botOnly ? "on" : ""}`} onClick={() => setBotOnly(!botOnly)} aria-pressed={botOnly}>
          Bot knows it
        </button>
        {!format && (
          <button class={`toggle ${standard ? "on" : ""}`} onClick={() => setStandard(!standard)} aria-pressed={standard}>
            Standard only
          </button>
        )}
      </div>
      <ul class="deck-list">
        {shown.map((l) => (
          <li class="browse-row">
            <button class={`with-id ${selected === l.name ? "on" : ""}`} onClick={() => onPick(l)}>
              <IdentityThumb title={l.deck!.identity.title} db={db} />
              <strong>{l.name}</strong>
              <span>
                {l.similarity != null && <span class="deck-similar">{l.similarity}% alike · </span>}
                {l.result && (
                  <>
                    <ResultBadge result={l.result} />
                    {" · "}
                  </>
                )}
                {l.deck!.identity.title} · {l.user} · {day(l.created)}
              </span>
            </button>
            {!similar && (
              <button class="ghost browse-like" onClick={() => onSimilar({ label: l.name, of: { id: l.id } })} aria-label={`Decks like ${l.name}`}>
                Alike
              </button>
            )}
          </li>
        ))}
        {!busy && !error && shown.length === 0 && <li class="hint">{searching || botOnly ? "No decklist matches." : format && format !== "casual" ? `No legal decklist in the last ${page * 20} published.` : "No playable decklist on this page."}</li>}
        {hasMore && (
          <li>
            <button class="more" disabled={busy} onClick={() => (filtering ? setWant(shown.length + 10) : load(page + 1, false))}>
              {busy ? "Loading…" : "Load more"}
            </button>
          </li>
        )}
        {busy && !hasMore && <li class="hint">Loading…</li>}
      </ul>
      {error && <p class="error">{error}</p>}
      <p class="hint">{similar ? "Decklists of the same identity, closest first." : "Decklists from NetrunnerDB, tournament results from AlwaysBeRunning."}</p>
    </>
  );
}

type IdentityRow = { identity: string; decks: number; recent: number; results: number; wins: number; best: number | null };

function useStats<T>(k: string) {
  const [data, setData] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    setData(undefined);
    let live = true;
    fetchStats(k).then((d) => live && setData(d as T | null));
    return () => {
      live = false;
    };
  }, [k]);
  return data;
}

function IdentitiesTab({ side, db, format, onOpen }: { side: Side; db: CardDb; format: string; onOpen: (code: string) => void }) {
  const rows = useStats<IdentityRow[]>(`identities:${format}:${side}`);
  if (rows === undefined) return <p class="hint">Loading…</p>;
  if (!rows || !rows.length) return <p class="hint">No identity statistics yet for this format.</p>;
  return (
    <>
      <ul class="identity-grid">
        {rows.slice(0, 60).map((r) => {
          const card = db.byCode.get(r.identity);
          if (!card) return null;
          return (
            <li>
              <button class="identity-tile" onClick={() => onOpen(r.identity)}>
                <CardImage code={card.code} alt={card.title} size="small" lazy />
                <strong>{shortTitle(card.title)}</strong>
                <span>
                  {r.decks} decks{r.results ? ` · ${r.results} results` : ""}
                  {r.wins ? ` · ${r.wins} ${r.wins === 1 ? "win" : "wins"}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p class="hint">Sorted by recent decklists and tournament entries.</p>
    </>
  );
}

function IdentityDetail({ code, db, format, onDecks, onClose }: { code: string; db: CardDb; format: string; onDecks: (code: string, sort?: "new" | "results") => void; onClose: () => void }) {
  const stats = useStats<{ decks: number; cards: [string, number, number][] }>(`identity:${format}:${code}`);
  const card = db.byCode.get(code);
  useBackClose(true, onClose);
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel identity-detail" role="dialog" aria-label={card?.title} onClick={(e) => e.stopPropagation()}>
        <div class="row">
          <span class="label">{card?.title}</span>
          <button class="ghost" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div class="identity-detail-actions">
          <button class="primary" onClick={() => onDecks(code)}>
            Its decks
          </button>
          <button onClick={() => onDecks(code, "results")}>Tournament decks</button>
        </div>
        {stats === undefined ? (
          <p class="hint">Loading…</p>
        ) : !stats?.cards?.length ? (
          <p class="hint">Not enough decklists to show a typical deck.</p>
        ) : (
          <>
            <span class="label">Typical deck · from {stats.decks} decklists</span>
            <ul class="typical-deck">
              {stats.cards.map(([c, share, qty]) => {
                const card = db.byCode.get(c);
                if (!card) return null;
                return (
                  <li>
                    <span class="typical-bar" style={{ width: `${share}%` }} />
                    <span class="typical-name">{card.title}</span>
                    <span class="typical-num">
                      {share}% · {qty}×
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

type Meta = { months: string[]; totals: { decks: number[]; results: number[] }; rows: { identity: string; decks: number[]; results: number[] }[] };

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const monthName = (m: string) => new Date(`${m}-15`).toLocaleDateString(undefined, { month: "short" });

function MetaTab({ side, db, format, onOpen }: { side: Side; db: CardDb; format: string; onOpen: (code: string) => void }) {
  const meta = useStats<Meta>(`meta:${format}:${side}`);
  const [by, setBy] = useState<"results" | "decks">("results");
  if (meta === undefined) return <p class="hint">Loading…</p>;
  if (!meta?.rows?.length) return <p class="hint">No meta statistics yet for this format.</p>;
  const recent = (a: number[]) => sum(a.slice(-3));
  const total = recent(meta.totals[by]);
  const rows = [...meta.rows].sort((a, b) => recent(b[by]) - recent(a[by])).filter((r) => recent(r[by]) > 0);
  return (
    <>
      <div class="chips browse-options">
        <button class={by === "results" ? "on" : ""} onClick={() => setBy("results")} aria-pressed={by === "results"}>
          Tournament entries
        </button>
        <button class={by === "decks" ? "on" : ""} onClick={() => setBy("decks")} aria-pressed={by === "decks"}>
          Published decks
        </button>
      </div>
      {!rows.length || !total ? (
        <p class="hint">Nothing in the last three months.</p>
      ) : (
        <ul class="meta-list">
          {rows.map((r) => {
            const card = db.byCode.get(r.identity);
            if (!card) return null;
            const share = Math.round((100 * recent(r[by])) / total);
            const peak = Math.max(1, ...r[by].map((n, i) => (meta.totals[by][i] ? n / meta.totals[by][i] : 0)));
            return (
              <li>
                <button class="meta-row" onClick={() => onOpen(r.identity)}>
                  <IdentityThumb title={card.title} db={db} />
                  <span class="meta-main">
                    <strong>{shortTitle(card.title)}</strong>
                    <span class="meta-bar">
                      <i style={{ width: `${share}%` }} />
                    </span>
                  </span>
                  <span class="meta-share">{share}%</span>
                  <span class="meta-spark" aria-label={`Monthly share over ${meta.months.length} months`}>
                    {r[by].map((n, i) => (
                      <i title={monthName(meta.months[i])} style={{ height: `${Math.round((100 * (meta.totals[by][i] ? n / meta.totals[by][i] : 0)) / peak)}%` }} />
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p class="hint">
        Share of the last three months ({monthName(meta.months[meta.months.length - 3])}–{monthName(meta.months[meta.months.length - 1])}), {total} {by === "results" ? "tournament entries" : "decklists"}.
      </p>
    </>
  );
}
