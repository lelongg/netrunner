# Netrunner relay

A Cloudflare Worker and Durable Object that relay online games between the two phones, so
neither player has to keep the app open. It fits in the Workers free plan.

The game is deterministic: both phones run the Jinteki engine and rebuild the game by
replaying the same ordered list of actions. The relay only orders, stores and forwards those
actions; it never runs game logic.

## API

- `POST /games` creates a game and returns `{ code, seat: 0, token }`.
- `POST /games/:code/join` takes the second seat and returns `{ code, seat: 1, token }`
  (404 for an unknown code, 409 when both seats are taken).
- `GET /games/:code/ws?token=…&since=N` upgrades to a WebSocket for that seat.

One `GameRoom` Durable Object per game (`idFromName(code)`), on the SQLite backend:

- WebSockets are accepted with the Hibernation API (`ctx.acceptWebSocket`), so an idle game
  costs no duration. A `"ping"` text frame is answered `"pong"` by an auto-response without
  waking the object.
- On connect the room sends `welcome`, every entry after `since` (in chunks), then `synced`,
  and broadcasts seat presence.
- `{ "t": "append", "p": … }` stores the payload with the next sequence number and the
  sender's seat, then broadcasts `{ "t": "entry", "e": { seq, seat, p } }` to both seats
  (the sender uses it as its acknowledgement). `{ "t": "sync", "since": N }` replays again.
- Messages over 4 KB are rejected, rooms hold at most two seats and 20 000 entries, and a
  newer connection for a seat replaces the older one.
- Every write pushes an alarm `EXPIRY_DAYS` (14 by default) ahead; when it fires the game is
  deleted.

`ALLOWED_ORIGINS` (comma separated) restricts which sites may call the relay.

## Deploy

```sh
cd relay
npm ci
npx wrangler login     # once, with a free Cloudflare account
npx wrangler deploy    # prints https://netrunner-relay.<your-subdomain>.workers.dev
```

Then point the app at that URL in `mobile/.env.production` (`VITE_RELAY_URL=…`); the
deployed app uses https://netrunner-relay.lelong-gerald.workers.dev. Without it the app falls
back to peer-to-peer links, where the host's app must stay open. To deploy the relay from CI instead, add the `CLOUDFLARE_API_TOKEN` (and
`CLOUDFLARE_ACCOUNT_ID`) secrets; `.github/workflows/relay.yml` deploys on pushes to
`master` that touch `relay/`.

## Tests

```sh
npm run dev                # local relay on http://127.0.0.1:8787
npm test                   # protocol: seats, ordering, 4 KB limit, presence, resync
EXPIRY_TEST=9000 RELAY=http://127.0.0.1:8788 npm test   # with a relay started using --var EXPIRY_DAYS:0.00005
npm run test:e2e           # two browsers: a player leaves mid-game and comes back
```

The end-to-end test expects the app on `http://localhost:4178` built with
`VITE_RELAY_URL=http://127.0.0.1:8787` (`npm run build && npx vite preview --port 4178` in
`mobile/`) and Chromium at `/opt/pw-browsers/chromium` (or `CHROMIUM=…`). With `P2P=1` it
checks the peer-to-peer fallback instead and skips the step where the host is away.
