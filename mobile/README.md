# Netrunner mobile

A phone-first way to play Netrunner online, built on the [Jinteki.net](https://github.com/mtgred/netrunner)
rules engine and running entirely in the browser. There is no game server: one player hosts
the game on their phone and the other connects to it peer-to-peer.

**Play: <https://lelongg.github.io/netrunner/>** (installable as an app, works offline for
solo and local games)

![Home, board, access and card screens](docs/banner.jpg)

Unofficial fan project, not affiliated with or endorsed by Null Signal Games or the
Jinteki.net team.

## Features

- **Online play without a server.** Host a game, share the code, the invite link or the QR
  code, and your opponent joins from their own phone (WebRTC through PeerJS).
- **Solo against a bot.** A heuristic bot plays either side from its own view of the game,
  without peeking at hidden cards.
- **Local hot-seat.** Two players on one device, with a privacy screen whenever the device
  changes hands (mulligans, end of turn, opponent decisions during a run).
- **Decks.** System Gateway starters, the Classique and Worlds decks shipped with Jinteki,
  the latest published decklists from NetrunnerDB (filter by faction, Standard only), or
  import any NetrunnerDB link or text decklist. Deck viewer with list and card views.
- **The full Jinteki engine.** Every card Jinteki implements, with the same rules,
  prompts, runs and priority windows.
- **Built for phones.** Your view is laid out from your seat (the opponent's outermost ice
  is closest to you), tap a card for its text and actions, swipe through a server, hand or
  pile, tap the image for a full-screen high-resolution scan, Android back closes overlays.
- **Survives real life.** Reloading resumes the game, switching apps reconnects the guest
  automatically, and the host can pick up a saved game later.
- **Undo a click** that revealed nothing: no draws, accesses or runs, no opponent action in
  between, one click at a time.

| | | |
|---|---|---|
| ![Run](docs/run.jpg) | ![Access](docs/access.jpg) | ![Invite](docs/lobby.jpg) |
| A run in progress | Accessing a card | Hosting with a QR code |
| ![NetrunnerDB decklists](docs/decks.jpg) | ![Card](docs/card.jpg) | ![Board](docs/board.jpg) |
| NetrunnerDB decklists | Card sheet | Board from the Runner's seat |

## How it works

```
┌──────────── host phone ─────────────────┐         ┌──── guest phone ─────────┐
│ Preact UI ── Session (host)             │ WebRTC  │ Preact UI ── Session     │
│                 │                       │◄───────►│   (guest)                │
│      Jinteki engine compiled to JS      │ actions │                          │
│      (engine/engine.js, ClojureScript)  │  views  │                          │
└─────────────────────────────────────────┘         └──────────────────────────┘
                 ▲  matchmaking only (PeerJS public server)
```

- **Engine.** Jinteki's `src/clj/game/**` sources were converted to `.cljc` with reader
  conditionals and compile to an ES module with shadow-cljs (`:engine` build, entry point
  `src/cljs/engine/api.cljs`). The JS API: `loadCards`, `createGame`,
  `act(game, side, command, args)`, `view(game, side)`, `say`, `concede`, `renderMessage`,
  `loadDictionary`, `precons`. The JVM test suite still runs against the same sources.
- **Host.** Runs the engine, applies its own and the guest's commands, and sends the guest
  only its privatised view, computed by the engine exactly as jinteki.net does. The guest
  never receives the opponent's hand or R&D.
- **Commands.** The same as Jinteki's web client (`play`, `ability`, `choice`, `select`,
  `run`, `continue`…). Per-card actions, prompts and run buttons follow
  `src/cljs/nr/gameboard/board.cljs`.
- **Cards.** `scripts/build-cards.mjs` downloads `raw_data.edn` from
  [NoahTheDuke/netrunner-data](https://github.com/NoahTheDuke/netrunner-data) and writes
  `public/data/cards.json`. Card images and decklists come from
  [NetrunnerDB](https://netrunnerdb.com).

### Saving and resuming

The engine state holds functions and cannot be serialised, so the host stores the game as
a log: the setup, a random seed and every action (`localStorage`, key `nsg.save`). During
each engine call `Math.random` is swapped for an `sfc32` generator seeded from the log, so
replaying it reproduces the same game: shuffles, choice ids and all. The smoke test checks
that a replay yields identical views.

### The bot

`src/bot/heuristic.ts` plays from **its own view** only and picks among the legal moves
computed by `src/game/actions.ts`. As Corp it scores and advances agendas behind ice, keeps
its economy going and rezzes ice on approach. As Runner it builds economy, installs missing
breakers and runs the most valuable server it expects to get into, keeping enough cards to
survive damage. It is a fair Corp and a weak Runner.

```sh
node --experimental-strip-types scripts/bot-eval.mjs 20 bot-vs-random 0   # 20 games, beginner decks
node --experimental-strip-types scripts/bot-eval.mjs 20 bot-vs-bot 1      # intermediate decks
```

`scripts/fuzz.mjs` plays random legal moves to hunt for engine errors and dead-end prompts.

## Development

Requirements: Java 17+, [Leiningen](https://leiningen.org), Node 20+.

```sh
npm ci                 # at the repository root (shadow-cljs)
cd mobile && npm ci
npm run engine         # compile the engine (dev) → mobile/engine/
npm run cards          # cards and translations → mobile/public/
npm run smoke          # scripted game under Node
npm run dev            # http://localhost:5173
```

`npm run engine:release` builds the optimised engine (about 3 MB, 690 KB gzipped).

To test with two phones on your network, run `npm run dev -- --host` and open the printed
address on both. WebRTC needs HTTPS outside `localhost`, so use the deployed version or an
HTTPS tunnel.

## Deployment

`.github/workflows/mobile.yml` builds the engine and the app, runs the smoke test and
publishes `mobile/dist` to GitHub Pages on every push to `master` (set *Settings → Pages →
Source* to *GitHub Actions*). Any static host works: there is no backend.

Matchmaking uses the free public PeerJS server. To depend on nobody, run your own
`peerjs-server` (a few MB of RAM) and pass `host`/`port` to the `Peer` constructor in
`src/session.ts`.

Phones on some mobile networks cannot reach each other directly and need a TURN relay.
PeerJS's default one is often unavailable, so you can provide your own at build time with
`VITE_ICE_SERVERS`, a JSON array of
[ICE servers](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer) (free tiers
exist at Cloudflare Calls and Metered, for example). The deploy workflow reads it from an
optional `ICE_SERVERS` repository secret. These credentials end up in the public bundle,
so use ones meant for browsers.

## Known limitations

- No cheating protection on the host side: the host holds the full game state. Play with
  people you trust.
- One saved game per device: starting a new game replaces the previous one.
- English only.
- Card support is whatever the Jinteki engine implements; the newest cards may be missing.
- The public PeerJS server can be slow or busy, and without a TURN relay some mobile
  networks cannot connect at all (the join screen says so).

## Credits

- Rules engine, card implementations, game symbol font and precon decks:
  [Jinteki.net](https://github.com/mtgred/netrunner) contributors (MIT).
- Card data: [netrunner-data](https://github.com/NoahTheDuke/netrunner-data).
- Card images and decklists: [NetrunnerDB](https://netrunnerdb.com).
- Netrunner is published by [Null Signal Games](https://nullsignal.games). Card names, text
  and art belong to their respective owners.
- Fonts: Big Shoulders Display and Space Mono (SIL Open Font License).
- Peer-to-peer: [PeerJS](https://peerjs.com).
