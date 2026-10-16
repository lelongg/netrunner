# Pocket Rig agent (MCP)

An [MCP](https://modelcontextprotocol.io) server that lets a language model play Pocket Rig
against a human: give the model a game code, it joins from its own seat and plays every move
itself.

It runs the same rules engine and the same session code as the app, downloaded from the
deployed site on each start, so it always matches what the phones run. It talks to the game
through the Cloudflare relay like a phone does, and it only ever reads the view of its own
seat.

## Use it

### From this repository (Claude Code, including cloud sessions from your phone)

The repository's [`.mcp.json`](../.mcp.json) declares the server, so any Claude Code session
opened on this repository starts it. Then just say:

> Join Pocket Rig game K7QPA and play it.

### Anywhere else

Any MCP client that runs local (stdio) servers works. Node 20+ is the only requirement:

```sh
curl -o pocket-rig.mjs https://lelongg.github.io/netrunner/agent/launch.mjs
```

```json
{ "mcpServers": { "pocket-rig": { "command": "node", "args": ["/path/to/pocket-rig.mjs"] } } }
```

Environment variables: `POCKET_RIG_NAME` (player name, default `Claude`), `POCKET_RIG_HOME`
(seat tickets and saves, default `~/.pocket-rig`), `POCKET_RIG_URL` (site to load the engine
from, default `https://lelongg.github.io/netrunner/`).

## Tools

| Tool | What it does |
|---|---|
| `list_decks(side?)` | The preconstructed decks of a side (NetrunnerDB deck URLs work too) |
| `host_game(side, deck)` | Create a game with your side and deck and get the code to give to the human; it starts by itself once they are ready |
| `join_game(code, deck?)` | Join a game with its code (with a deck you are ready at once), or come back to one this server already played |
| `choose_deck(deck)` | Change your deck before the game starts (marks a guest ready) |
| `set_side`, `start_game` | Host only |
| `get_state` | The lobby, or the whole board from your seat with a numbered list of legal actions |
| `act(action, amount?, text?)` | Perform one listed action |
| `wait_for_turn(seconds?)` | Return as soon as there is a decision to make or the game ends |
| `card_info(name)` | Full text of a card |
| `say(message)`, `concede` | Chat and concede |

To keep the model's context small, `act` and `wait_for_turn` only return what changed since
its last look: the new log lines, the lines of the board that changed, the current run and
prompt, and the fresh action list (installs and runs grouped on one line). `get_state` always
returns the whole board.

The legal actions come from the same code as the app's buttons, so the model cannot invent
commands. As the Corp, the server passes priority by itself during the Runner's runs whenever
there is nothing to decide, like the app does in hot-seat games.

## Develop

```sh
npm ci && npm run build      # needs the release engine (npx shadow-cljs release engine) and the built app
POCKET_RIG_URL=http://localhost:4178/ node launch.mjs   # against `npm run preview` in mobile/
```

`npm run build` bundles `src/server.ts` with the app's session code into
`mobile/dist/agent/server.mjs` and copies the engine next to it; the deploy workflow publishes
both with the app.
